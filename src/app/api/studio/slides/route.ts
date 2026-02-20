import { NextResponse, after } from "next/server";
import { createServerSupabaseClient, createServiceRoleClient } from "@/lib/supabase/server";
import { generateSlideImage, type SlideType, type DesignTheme } from "@/lib/ai/nano-banana";
import { generateText } from "@/lib/ai/gemini";

async function runWithConcurrency<T>(
  tasks: (() => Promise<T>)[],
  limit: number
): Promise<PromiseSettledResult<T>[]> {
  const results: PromiseSettledResult<T>[] = new Array(tasks.length);
  let nextIndex = 0;

  async function worker() {
    while (nextIndex < tasks.length) {
      const index = nextIndex++;
      try {
        const value = await tasks[index]();
        results[index] = { status: "fulfilled", value };
      } catch (reason) {
        results[index] = { status: "rejected", reason };
      }
    }
  }

  const workers = Array.from(
    { length: Math.min(limit, tasks.length) },
    () => worker()
  );
  await Promise.all(workers);
  return results;
}

export async function POST(request: Request) {
  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { notebookId, format, language, depth, prompt, slideCount, designThemeId } =
      await request.json();

    if (!notebookId) {
      return NextResponse.json(
        { error: "노트북 ID가 필요합니다." },
        { status: 400 }
      );
    }

    // Get enabled sources
    const { data: sources } = await supabase
      .from("sources")
      .select("id, title, extracted_text")
      .eq("notebook_id", notebookId)
      .eq("is_enabled", true)
      .eq("processing_status", "completed");

    if (!sources || sources.length === 0) {
      return NextResponse.json(
        { error: "활성화된 소스가 없습니다." },
        { status: 400 }
      );
    }

    // Create studio output record
    const { data: output, error: insertError } = await supabase
      .from("studio_outputs")
      .insert({
        notebook_id: notebookId,
        user_id: user.id,
        type: "slide_deck",
        title: `슬라이드 - ${new Date().toLocaleDateString("ko-KR")}`,
        settings: { format, language, depth, prompt, slideCount, designThemeId },
        generation_status: "generating",
        source_ids: sources.map((s) => s.id),
      })
      .select()
      .single();

    if (insertError || !output) {
      return NextResponse.json(
        { error: "출력 레코드 생성 실패" },
        { status: 500 }
      );
    }

    // Generate in background using after() to keep serverless function alive
    const adminClient = await createServiceRoleClient();
    const outputId = output.id;
    const userId = user.id;

    after(async () => {
      try {
        console.log(`[Slides ${outputId}] 생성 시작 - 소스 ${sources.length}개`);

        // Update progress: outline phase
        await adminClient
          .from("studio_outputs")
          .update({
            content: {
              progress: { phase: "아웃라인 생성", completed: 0, total: 0, failed: 0 },
            },
          })
          .eq("id", outputId);

        // Fetch user design theme prompt if specified
        let userThemePrompt: string | undefined;
        if (designThemeId) {
          const { data: themeRow } = await adminClient
            .from("design_themes")
            .select("prompt")
            .eq("id", designThemeId)
            .single();
          if (themeRow) {
            userThemePrompt = themeRow.prompt;
          }
        }

        const sourceTexts = sources
          .map(
            (s) => `[${s.title}]\n${(s.extracted_text || "").slice(0, 5000)}`
          )
          .join("\n\n");

        const slideCountRange = slideCount
          ? `정확히 ${slideCount}`
          : format === "presenter"
            ? depth === "short"
              ? "4-5"
              : "5-8"
            : depth === "short"
            ? "5-7"
            : "8-12";

        // Generate slide outline with Gemini
        console.log(`[Slides ${outputId}] Gemini 아웃라인 생성 중...`);

        const formatDescription = format === "presenter"
          ? "발표자용 (시각 중심, 텍스트 최소화, 키워드와 이미지 위주)"
          : "상세형 (텍스트 풍부, 자세한 설명 포함)";

        const outlinePrompt = `다음 소스 내용을 기반으로 전문적인 프레젠테이션 슬라이드 아웃라인을 JSON으로 생성해주세요.

소스 내용:
${sourceTexts.slice(0, 15000)}

슬라이드 수: ${slideCountRange}장
형식: ${formatDescription}
${prompt ? `추가 지시사항: ${prompt}` : ""}

## 프레젠테이션 구조 규칙

반드시 다음 흐름을 따르세요:
1. 첫 번째 슬라이드는 type "cover" (표지)
2. 두 번째 슬라이드는 반드시 type "toc" (목차)를 포함 — 절대 생략하지 마세요
3. 중간 슬라이드들은 type "content" (본문) — 필요시 type "section" (섹션 구분) 사용
4. 마지막에서 두 번째는 type "key_takeaway" (핵심 정리)
5. 마지막 슬라이드는 type "closing" (마무리)

## 디자인 테마

${userThemePrompt
  ? `다음 사용자 지정 디자인 지시사항을 반드시 따르세요:\n${userThemePrompt}`
  : "소스 내용의 주제와 분위기에 맞는 디자인 테마를 하나 선정하세요."}

## JSON 형식 (코드블록 없이 순수 JSON만 응답)

{
  "designTheme": {
    "primaryColor": "#hex색상코드",
    "mood": "분위기 설명 (예: professional and modern)",
    "style": "스타일 설명 (예: minimal with bold typography)"
  },
  "slides": [
    {"type": "cover", "title": "프레젠테이션 제목", "subtitle": "부제목", "content": ""},
    {"type": "toc", "title": "목차", "content": "1. 섹션1\\n2. 섹션2\\n3. 섹션3"},
    {"type": "content", "title": "슬라이드 제목", "content": "핵심 내용 2-3줄"},
    {"type": "key_takeaway", "title": "핵심 정리", "content": "주요 포인트 요약"},
    {"type": "closing", "title": "감사합니다", "content": ""}
  ]
}

가능한 type 값: "cover", "toc", "section", "content", "key_takeaway", "closing"`;

        const outlineText = await generateText(outlinePrompt);

        // Parse outline (new structure with designTheme)
        interface SlideOutline {
          type?: SlideType;
          title: string;
          subtitle?: string;
          content: string;
        }
        let slides: SlideOutline[];
        let designTheme: DesignTheme | undefined;

        try {
          const jsonMatch = outlineText.match(/\{[\s\S]*\}/);
          const parsed = JSON.parse(jsonMatch?.[0] || outlineText);

          if (parsed.slides && Array.isArray(parsed.slides)) {
            slides = parsed.slides;
            designTheme = parsed.designTheme;
          } else if (Array.isArray(parsed)) {
            // Fallback: old array format
            slides = parsed;
          } else {
            throw new Error("Unexpected format");
          }
        } catch {
          slides = [
            { type: "cover", title: "개요", content: "프레젠테이션 개요 슬라이드입니다." },
          ];
        }
        // 7장 이상인데 목차가 없으면 자동 삽입
        if (slides.length >= 7 && !slides.some((s) => s.type === "toc")) {
          const contentSlides = slides.filter((s) => s.type === "content" || s.type === "section");
          const tocContent = contentSlides
            .map((s, i) => `${i + 1}. ${s.title}`)
            .join("\n");
          slides.splice(1, 0, {
            type: "toc",
            title: "목차",
            content: tocContent,
          });
        }

        // 최대 50장 제한
        const MAX_SLIDES = 50;
        if (slides.length > MAX_SLIDES) {
          console.log(`[Slides ${outputId}] 아웃라인 ${slides.length}장 → ${MAX_SLIDES}장으로 제한`);
          slides = slides.slice(0, MAX_SLIDES);
        }
        console.log(`[Slides ${outputId}] 아웃라인 완료 - ${slides.length}장, 테마: ${designTheme?.mood || "기본"}`);

        // Determine topic
        const topic = slides[0]?.title || "프레젠테이션";

        // Update progress: image generation phase starts
        await adminClient
          .from("studio_outputs")
          .update({
            content: {
              slides,
              progress: { phase: "이미지 생성", completed: 0, total: slides.length, failed: 0 },
            },
            image_urls: [],
          })
          .eq("id", outputId);

        // Generate images in parallel (concurrency limit: 12)
        const CONCURRENCY_LIMIT = 12;
        const imageUrls: (string | null)[] = new Array(slides.length).fill(null);
        let completedCount = 0;
        let failedCount = 0;

        const tasks = slides.map((slide, i) => async () => {
          console.log(`[Slides ${outputId}] 슬라이드 ${i + 1}/${slides.length} (${slide.type || "content"}) 이미지 생성 중...`);

          const generateParams = {
            slideNumber: i + 1,
            totalSlides: slides.length,
            topic,
            slideTitle: slide.title,
            slideContent: slide.content,
            slideType: (slide.type || "content") as SlideType,
            subtitle: slide.subtitle,
            designTheme,
            userThemePrompt,
            language,
            format,
            userPrompt: prompt,
          };

          // 1회 자동 재시도 로직
          let imageData: string;
          let mimeType: string;
          try {
            const result = await generateSlideImage(generateParams);
            imageData = result.imageData;
            mimeType = result.mimeType;
          } catch (firstError) {
            console.warn(`[Slides ${outputId}] 슬라이드 ${i + 1} 첫 시도 실패, 재시도 중...`, firstError instanceof Error ? firstError.message : firstError);
            const result = await generateSlideImage(generateParams);
            imageData = result.imageData;
            mimeType = result.mimeType;
          }

          // Upload
          const ext = mimeType.includes("png") ? "png" : "jpg";
          const filePath = `${userId}/outputs/${outputId}-slide-${i + 1}.${ext}`;
          const imageBuffer = Buffer.from(imageData, "base64");

          await adminClient.storage
            .from("studio")
            .upload(filePath, imageBuffer, { contentType: mimeType });

          const {
            data: { publicUrl },
          } = adminClient.storage.from("studio").getPublicUrl(filePath);

          imageUrls[i] = publicUrl;
          completedCount++;

          // Incremental DB update: progress + ordered URLs
          const orderedUrls: string[] = [];
          for (let j = 0; j < slides.length; j++) {
            if (imageUrls[j] !== null) orderedUrls.push(imageUrls[j]!);
          }

          await adminClient
            .from("studio_outputs")
            .update({
              image_urls: orderedUrls,
              content: {
                slides,
                progress: {
                  phase: "이미지 생성",
                  completed: completedCount,
                  total: slides.length,
                  failed: failedCount,
                },
              },
            })
            .eq("id", outputId);

          console.log(`[Slides ${outputId}] 슬라이드 ${i + 1}/${slides.length} 완료 (${completedCount}/${slides.length})`);
          return publicUrl;
        });

        const results = await runWithConcurrency(tasks, CONCURRENCY_LIMIT);

        // Count failures
        const failures = results.filter((r) => r.status === "rejected");
        failedCount = failures.length;

        // Final ordered URLs
        const finalUrls: string[] = [];
        for (let j = 0; j < slides.length; j++) {
          if (imageUrls[j] !== null) finalUrls.push(imageUrls[j]!);
        }

        if (finalUrls.length === 0) {
          throw new Error("모든 슬라이드 이미지 생성에 실패했습니다.");
        }

        // Final update
        await adminClient
          .from("studio_outputs")
          .update({
            image_urls: finalUrls,
            content: {
              slides,
              progress: {
                phase: "완료",
                completed: completedCount,
                total: slides.length,
                failed: failedCount,
              },
            },
            generation_status: "completed",
          })
          .eq("id", outputId);

        console.log(`[Slides ${outputId}] ✅ 전체 생성 완료 - ${finalUrls.length}장 (실패: ${failedCount}장)`);
      } catch (error) {
        console.error(`[Slides ${outputId}] ❌ 생성 실패:`, error);
        await adminClient
          .from("studio_outputs")
          .update({
            generation_status: "failed",
            error_message:
              error instanceof Error ? error.message : "생성 실패",
          })
          .eq("id", outputId);
      }
    });

    return NextResponse.json({ id: output.id, status: "generating" });
  } catch (error) {
    console.error("Slides API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
