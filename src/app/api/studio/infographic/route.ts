import { NextResponse, after } from "next/server";
import { createServerSupabaseClient, createServiceRoleClient } from "@/lib/supabase/server";
import { generateInfographicImage } from "@/lib/ai/nano-banana";
import { generateText } from "@/lib/ai/gemini";

export async function POST(request: Request) {
  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { notebookId, language, orientation, detailLevel, prompt, designThemeId } =
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
        { error: "활성화된 소스가 없습니다. 소스를 추가하고 활성화해주세요." },
        { status: 400 }
      );
    }

    // Create studio output record (generating status)
    const { data: output, error: insertError } = await supabase
      .from("studio_outputs")
      .insert({
        notebook_id: notebookId,
        user_id: user.id,
        type: "infographic",
        title: `인포그래픽 - ${new Date().toLocaleDateString("ko-KR")}`,
        settings: { language, orientation, detailLevel, prompt, designThemeId },
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
        console.log(`[Infographic ${outputId}] 생성 시작 - 소스 ${sources.length}개`);

        // Fetch user design theme if specified
        let designTheme: { primaryColor: string; mood: string; style: string } | undefined;
        if (designThemeId) {
          const { data: themeRow } = await adminClient
            .from("design_themes")
            .select("primary_color, mood, style")
            .eq("id", designThemeId)
            .single();
          if (themeRow) {
            designTheme = {
              primaryColor: themeRow.primary_color,
              mood: themeRow.mood,
              style: themeRow.style,
            };
          }
        }

        // Summarize sources for infographic content
        const sourceTexts = sources
          .map((s) => `[${s.title}]\n${(s.extracted_text || "").slice(0, 5000)}`)
          .join("\n\n");

        console.log(`[Infographic ${outputId}] Gemini 요약 요청 중...`);
        const sourceContent = await generateText(
          `다음 소스 내용에서 인포그래픽에 포함할 핵심 데이터 포인트, 통계, 주요 개념을 추출하세요. 글머리 기호로 정리해주세요:\n\n${sourceTexts.slice(0, 20000)}`
        );
        console.log(`[Infographic ${outputId}] Gemini 요약 완료`);

        // Generate infographic image
        console.log(`[Infographic ${outputId}] 이미지 생성 중...`);
        const { imageData, mimeType } = await generateInfographicImage({
          sourceContent,
          language,
          orientation,
          detailLevel,
          userPrompt: prompt,
          designTheme,
        });
        console.log(`[Infographic ${outputId}] 이미지 생성 완료 (${mimeType})`);

        // Upload image to storage
        const ext = mimeType.includes("png") ? "png" : "jpg";
        const filePath = `${userId}/outputs/${outputId}.${ext}`;
        const imageBuffer = Buffer.from(imageData, "base64");

        console.log(`[Infographic ${outputId}] Storage 업로드 중...`);
        await adminClient.storage
          .from("studio")
          .upload(filePath, imageBuffer, {
            contentType: mimeType,
          });

        const {
          data: { publicUrl },
        } = adminClient.storage.from("studio").getPublicUrl(filePath);

        // Update output with image URL
        await adminClient
          .from("studio_outputs")
          .update({
            image_urls: [publicUrl],
            generation_status: "completed",
          })
          .eq("id", outputId);

        console.log(`[Infographic ${outputId}] ✅ 생성 완료`);
      } catch (error) {
        console.error(`[Infographic ${outputId}] ❌ 생성 실패:`, error);
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
    console.error("Infographic API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
