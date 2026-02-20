# Satang 슬라이드 생성 기능 상세 분석

## 1. 아키텍처 개요

### 전체 흐름

```
┌─────────────────────────────────────────────────────────────────┐
│  사용자 (SlideModal)                                              │
│  ─ 형식, 언어, 깊이, 슬라이드 수, 디자인 테마, 콘텐츠 설명 입력           │
└──────────────┬──────────────────────────────────────────────────┘
               │ POST /api/studio/slides
               ▼
┌─────────────────────────────────────────────────────────────────┐
│  API Route (route.ts)                                           │
│  1. 인증 확인                                                     │
│  2. 활성 소스 조회                                                  │
│  3. studio_outputs 레코드 생성 (status: generating)                 │
│  4. 즉시 { id, status } 응답 반환                                   │
│  5. after() 콜백으로 백그라운드 생성 시작                                │
└──────────────┬──────────────────────────────────────────────────┘
               │ Background (Next.js after() API)
               ▼
┌─────────────────────────────────────────────────────────────────┐
│  Phase 0: 디자인 테마 조회 (선택)                                     │
│  ─ designThemeId 있으면 design_themes 테이블에서 프롬프트 조회           │
└──────────────┬──────────────────────────────────────────────────┘
               ▼
┌─────────────────────────────────────────────────────────────────┐
│  Phase 1: 아웃라인 생성                                            │
│  ─ Model: gemini-3-flash-preview                                │
│  ─ 소스 텍스트 기반 슬라이드 구조 + 디자인 테마 JSON 생성                   │
│  ─ 사용자 테마 있으면 아웃라인 프롬프트에 디자인 지시사항 주입                  │
└──────────────┬──────────────────────────────────────────────────┘
               ▼
┌─────────────────────────────────────────────────────────────────┐
│  Phase 2: 이미지 생성 (병렬, 동시실행 12개 제한)                        │
│  ─ Model: gemini-3-pro-image-preview                            │
│  ─ 각 슬라이드별 타입별 프롬프트 + 디자인 테마 적용                         │
│  ─ 사용자 테마 프롬프트 우선, 없으면 Gemini 생성 테마 사용                  │
│  ─ 실패 시 1회 자동 재시도                                           │
│  ─ 완료된 슬라이드마다 DB 진행률 업데이트                                 │
└──────────────┬──────────────────────────────────────────────────┘
               ▼
┌─────────────────────────────────────────────────────────────────┐
│  Phase 3: 업로드 & 완료                                           │
│  ─ Supabase Storage에 이미지 업로드                                 │
│  ─ studio_outputs 레코드 최종 업데이트 (status: completed)            │
└─────────────────────────────────────────────────────────────────┘
```

### 파일 구조

| 파일 | 역할 |
|------|------|
| `src/app/api/studio/slides/route.ts` | 슬라이드 생성 API (메인 오케스트레이터) |
| `src/app/api/studio/slides/pdf/route.ts` | PDF 내보내기 API (병렬 이미지 다운로드) |
| `src/app/api/studio/slides/pptx/route.ts` | PPTX 내보내기 API (병렬 이미지 다운로드) |
| `src/app/api/studio/slides/regenerate/route.ts` | 개별 슬라이드 재생성 API |
| `src/app/api/studio/theme-preview/route.ts` | 디자인 테마 미리보기 이미지 생성 API |
| `src/app/api/chat/route.ts` | 채팅 API (스트리밍 + TransformStream DB 저장) |
| `src/lib/ai/nano-banana.ts` | 이미지 생성/편집 함수 + 슬라이드 타입별 프롬프트 |
| `src/lib/ai/gemini.ts` | Gemini 텍스트 생성 (아웃라인용, 채팅 스트리밍) |
| `src/components/studio/slide-modal.tsx` | 생성 옵션 UI 모달 |
| `src/components/studio/infographic-modal.tsx` | 인포그래픽 생성 모달 (테마 선택 포함) |
| `src/components/studio/theme-selector.tsx` | 디자인 테마 선택 컴포넌트 (가로 스크롤 카드 + 추가 버튼) |
| `src/components/studio/content-viewer.tsx` | 슬라이드 뷰어 (캐러셀 + 진행률 + 재생성) |
| `src/components/settings/theme-editor-dialog.tsx` | 디자인 테마 생성/수정 다이얼로그 |
| `src/components/chat/chat-panel.tsx` | 채팅 패널 (마크다운 렌더링, 스트리밍 표시) |
| `src/hooks/use-studio.ts` | React Query 뮤테이션 훅 |
| `src/hooks/use-design-themes.ts` | 디자인 테마 CRUD 훅 |
| `src/hooks/use-chat.ts` | 채팅 메시지 조회/전송 훅 |

### 사용 모델

| 단계 | 모델 | 용도 |
|------|------|------|
| 아웃라인 생성 | `gemini-3-flash-preview` | 슬라이드 구조 + 디자인 테마 JSON 생성 |
| 이미지 생성 | `gemini-3-pro-image-preview` | 각 슬라이드를 16:9 이미지로 렌더링 |
| 테마 미리보기 | `gemini-3-pro-image-preview` | 디자인 테마 샘플 슬라이드 생성 |

---

## 2. 사용자 옵션 (SlideModal)

### 2.1 형식 (format)

| 값 | 라벨 | 설명 |
|----|------|------|
| `"detailed"` | 자세한 자료 | 전체 텍스트의 세부정보가 가득한 포괄적인 자료. 이메일로 보내거나 단독으로 읽기에 적합 |
| `"presenter"` | 발표자 슬라이드 | 발표하는 동안 도움이 될 핵심 내용을 담은 간결하고 시각적인 슬라이드 |

아웃라인 프롬프트에 전달되는 형식 설명:
- `"detailed"` → `"상세형 (텍스트 풍부, 자세한 설명 포함)"`
- `"presenter"` → `"발표자용 (시각 중심, 텍스트 최소화, 키워드와 이미지 위주)"`

### 2.2 언어 (language)

| 코드 | 라벨 | 영문명 (프롬프트 내 사용) |
|------|------|-------------------------|
| `ko` | 한국어 | Korean |
| `en` | English | English |
| `ja` | 日本語 | Japanese |
| `zh` | 中文 | Chinese |
| `es` | Español | Spanish |
| `fr` | Français | French |
| `de` | Deutsch | German |

### 2.3 깊이 (depth)

| 값 | 라벨 |
|----|------|
| `"short"` | 짧게 |
| `"default"` | 기본값 |

### 2.4 슬라이드 수 (slideCount)

- **입력 범위**: 1~50 (number input)
- **비워두면**: 형식 × 깊이 조합에 따라 자동 계산

**자동 슬라이드 수 결정 로직:**

| 형식 | 깊이 | 슬라이드 수 |
|------|------|-------------|
| presenter | short | 4-5장 |
| presenter | default | 5-8장 |
| detailed | short | 5-7장 |
| detailed | default | 8-12장 |
| (직접 지정) | - | 정확히 N장 |

### 2.5 디자인 테마 (designThemeId)

- **선택 UI**: `ThemeSelector` 컴포넌트 (가로 스크롤 썸네일 카드)
- **기본값**: "자동" (null) — Gemini가 소스 내용에 맞는 테마를 자동 생성
- **사용자 테마 선택 시**: `design_themes` 테이블에서 프롬프트를 조회하여 아웃라인 + 이미지 생성에 주입
- **테마 추가**: 목록 끝 "+" 버튼으로 ThemeEditorDialog를 바로 열어 생성 가능

**테마 적용 우선순위:**

| 조건 | 아웃라인 프롬프트 | 이미지 생성 |
|------|-------------------|-------------|
| 사용자 테마 선택 | 사용자 프롬프트를 디자인 지시사항으로 주입 | `userThemePrompt`로 전달 |
| 자동 (기본) | Gemini가 자체 테마 선정 | Gemini가 생성한 `DesignTheme` 사용 |

### 2.6 콘텐츠 설명 (prompt)

- **선택사항**: 자유 텍스트 입력
- **라벨**: "콘텐츠 설명" (디자인과 분리된 콘텐츠 지시)
- 아웃라인 프롬프트에 `추가 지시사항:` 으로 전달
- 이미지 생성 프롬프트에 `Additional instructions:` 으로 전달

---

## 3. 디자인 테마 시스템

### 3.1 DB 스키마 (design_themes)

```sql
create table public.design_themes (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  name text not null,
  prompt text not null,
  thumbnail_url text,
  sort_order integer default 0,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);
```

- **name**: 테마 이름 (예: "비즈니스 블루")
- **prompt**: 자유 형식 디자인 프롬프트 (색상, 분위기, 스타일 등)
- **thumbnail_url**: 미리보기 이미지 URL (Supabase Storage)

### 3.2 테마 미리보기 생성

**경로**: `POST /api/studio/theme-preview`

1. 사용자가 디자인 프롬프트 입력
2. "미리보기 생성" 버튼 클릭
3. Gemini로 샘플 커버 슬라이드 이미지 생성 (16:9)
4. Supabase Storage에 업로드 후 공개 URL 반환
5. 다이얼로그에 미리보기 표시
6. "등록" 시 해당 URL을 `thumbnail_url`로 저장

**미리보기 없이 등록 불가** — 사용자가 반드시 미리보기를 확인한 후 저장

### 3.3 테마 관리 UI (설정 페이지)

- **위치**: 설정 > 프로필 아래, 계정 위
- **테마 카드 그리드**: 2~3열, 썸네일 이미지 배경
- **"+ 새 테마" 카드** → ThemeEditorDialog 열림
- **카드 hover 시** 수정/삭제 아이콘 표시

### 3.4 테마 선택 (생성 모달)

- **위치**: 슬라이드/인포그래픽 모달의 옵션 영역과 프롬프트 사이
- **첫 번째 카드**: "자동" (기본 선택)
- **이후 카드**: 저장된 테마 (썸네일 + 이름)
- **가로 스크롤**: `overflow-x-auto` + `flex-nowrap` + 부모 `overflow-hidden`

### 3.5 CRUD 훅

| 훅 | 용도 |
|----|------|
| `useDesignThemes()` | 사용자 테마 목록 조회 (sort_order 정렬) |
| `useCreateDesignTheme()` | 테마 생성 (name, prompt, thumbnail_url) |
| `useUpdateDesignTheme()` | 테마 수정 |
| `useDeleteDesignTheme()` | 테마 삭제 |
| `useGenerateThemePreview()` | 미리보기 이미지 생성 |

---

## 4. Phase 1: 아웃라인 생성

### 4.1 소스 데이터 준비

```typescript
// 활성화된 소스만 조회
const { data: sources } = await supabase
  .from("sources")
  .select("id, title, extracted_text")
  .eq("notebook_id", notebookId)
  .eq("is_enabled", true)
  .eq("processing_status", "completed");

// 소스별 최대 5000자 추출, 전체 결합
const sourceTexts = sources
  .map((s) => `[${s.title}]\n${(s.extracted_text || "").slice(0, 5000)}`)
  .join("\n\n");
```

- 아웃라인 프롬프트에는 최대 **15,000자**까지 전달: `sourceTexts.slice(0, 15000)`

### 4.2 사용자 디자인 테마 조회

```typescript
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
```

### 4.3 아웃라인 프롬프트 (핵심 구조)

```
다음 소스 내용을 기반으로 전문적인 프레젠테이션 슬라이드 아웃라인을 JSON으로 생성해주세요.

소스 내용: ${sourceTexts.slice(0, 15000)}
슬라이드 수: ${slideCountRange}장
형식: ${formatDescription}
${prompt ? `추가 지시사항: ${prompt}` : ""}

## 프레젠테이션 구조 규칙
1. cover → toc (7장 이상) → content/section → key_takeaway → closing

## 디자인 테마
${userThemePrompt
  ? `다음 사용자 지정 디자인 지시사항을 반드시 따르세요:\n${userThemePrompt}`
  : "소스 내용의 주제와 분위기에 맞는 디자인 테마를 하나 선정하세요."}

## JSON 형식
{ "designTheme": { "primaryColor", "mood", "style" }, "slides": [...] }
```

### 4.4 아웃라인 응답 파싱

```typescript
const jsonMatch = outlineText.match(/\{[\s\S]*\}/);
const parsed = JSON.parse(jsonMatch?.[0] || outlineText);

if (parsed.slides && Array.isArray(parsed.slides)) {
  slides = parsed.slides;
  designTheme = parsed.designTheme;  // Gemini가 생성한 구조화된 테마
} else if (Array.isArray(parsed)) {
  slides = parsed;  // 구형 호환
}
```

### 4.5 디자인 테마 타입 (Gemini 자동 생성용)

```typescript
export interface DesignTheme {
  primaryColor: string;  // 예: "#FF6B6B"
  mood: string;          // 예: "professional and modern"
  style: string;         // 예: "minimal with bold typography"
}
```

- 사용자 테마가 있으면 `userThemePrompt`가 이미지 생성에 우선 사용됨
- 사용자 테마가 없으면 Gemini가 아웃라인에서 생성한 `DesignTheme` 구조체 사용

### 4.6 슬라이드 타입

```typescript
export type SlideType = "cover" | "toc" | "section" | "content" | "key_takeaway" | "closing";
```

| 타입 | 역할 | 사용 위치 |
|------|------|----------|
| `cover` | 표지 슬라이드 | 첫 번째 |
| `toc` | 목차 | 두 번째 (7장 이상일 때) |
| `section` | 섹션 구분 | 중간 (선택) |
| `content` | 본문 콘텐츠 | 중간 |
| `key_takeaway` | 핵심 정리 | 마지막에서 두 번째 |
| `closing` | 마무리 | 마지막 |

---

## 5. Phase 2: 이미지 생성

### 5.1 병렬 실행 제어

```typescript
const CONCURRENCY_LIMIT = 12;  // 최대 12개 동시 생성

async function runWithConcurrency<T>(
  tasks: (() => Promise<T>)[],
  limit: number
): Promise<PromiseSettledResult<T>[]>
```

### 5.2 슬라이드 타입별 프롬프트 (SLIDE_TYPE_PROMPTS)

각 슬라이드 타입은 `(params) => string` 함수로 정의되며, `format` 값에 따라 추가 지시가 붙습니다.

#### cover (표지)

```
This is the COVER slide (title slide).
Layout:
- Large, bold title "${title}" centered prominently
- Subtitle "${subtitle}" below the title in smaller text  (subtitle 있을 때)
- Clean, impactful background with minimal elements
- No bullet points or body text
```
- **presenter 추가**: `- Extra emphasis on visual impact, very minimal text`

#### toc (목차)

```
This is a TABLE OF CONTENTS slide.
Layout:
- Title "목차" or "Table of Contents" at the top
- Numbered list of sections with clear visual separation
- Content: ${content}
- Use subtle icons or dividers between items
```
- **presenter 추가**: `- Keep text minimal, use icons to represent each section`

#### section (섹션 구분)

```
This is a SECTION DIVIDER slide.
Layout:
- Section title "${title}" displayed large and centered
- Minimal background, acts as a visual break between topics
- No bullet points or detailed text
```
- **presenter 추가**: `- Bold, dramatic typography with visual impact`

#### content (본문)

```
This is a CONTENT slide.
Layout:
- Title "${title}" at the top
- Key points presented as bullet points or short paragraphs
- Content: ${content}
```
- **presenter 추가**:
  ```
  - Visual-focused: use large keywords, icons, and diagrams instead of full sentences
  - Maximum 3-4 key words or short phrases visible
  ```
- **detailed 추가**:
  ```
  - Include detailed explanations with clear text hierarchy
  - Use bullet points with supporting details
  ```

#### key_takeaway (핵심 정리)

```
This is a KEY TAKEAWAY / SUMMARY slide.
Layout:
- Title "${title}" at the top
- Highlight 3-5 key points with emphasis (bold, icons, or numbered)
- Content: ${content}
- Use visual emphasis (larger text, highlight boxes, or icons) for each point
```
- **presenter 추가**: `- Use large icons or numbers with single keywords for each takeaway`

#### closing (마무리)

```
This is the CLOSING slide.
Layout:
- "${title}" displayed prominently
- ${content || "Thank you message"}
- Clean, elegant design matching the cover slide style
- Optional: contact info or QR code area at bottom
```
- **presenter 추가**: `- Very minimal, focus on a memorable closing visual`

### 5.3 이미지 생성 최종 프롬프트

```
Create slide ${slideNumber} of ${totalSlides} for a professional presentation.
Language: ${langName}
Overall topic: ${topic}

${typePrompt}                        ← 위의 타입별 프롬프트

Design Theme (apply consistently):   ← 테마 적용 (우선순위에 따라)
${themeInstructions}

Global Requirements:
- All text MUST be in ${langName}
- 16:9 aspect ratio, professional presentation slide
- Clear, readable typography with good hierarchy
- Consistent visual style across all slides in this deck

Additional instructions: ${userPrompt}  ← 콘텐츠 설명이 있을 때만
```

**테마 적용 우선순위:**

```typescript
const themeInstructions = userThemePrompt
  ? `Design Theme (apply consistently):\n${userThemePrompt}\n`
  : designTheme
  ? `Design Theme (apply consistently):
- Primary color: ${designTheme.primaryColor}
- Mood: ${designTheme.mood}
- Style: ${designTheme.style}\n`
  : "";
```

1. `userThemePrompt` (사용자 저장 테마) → 자유 형식 프롬프트 그대로 주입
2. `designTheme` (Gemini 자동 생성) → 구조화된 primaryColor/mood/style
3. 둘 다 없으면 → 테마 지시 없이 생성

### 5.4 이미지 생성 API 설정

```typescript
const response = await ai.models.generateContent({
  model: "gemini-3-pro-image-preview",
  contents: [{ role: "user", parts: [{ text: prompt }] }],
  config: {
    responseModalities: ["IMAGE"],
    imageGenerationConfig: {
      aspectRatio: "16:9",
    },
  },
});
```

### 5.5 재시도 로직

```typescript
// 1회 자동 재시도
try {
  const result = await generateSlideImage(generateParams);
} catch (firstError) {
  console.warn(`슬라이드 ${i + 1} 첫 시도 실패, 재시도 중...`);
  const result = await generateSlideImage(generateParams);  // 한 번 더 시도
}
```

- 첫 번째 시도 실패 → 동일 파라미터로 1회 재시도
- 재시도도 실패 → 해당 슬라이드 생성 실패 (나머지 슬라이드는 계속 진행)
- 모든 슬라이드 실패 시 → `"모든 슬라이드 이미지 생성에 실패했습니다."` 에러

---

## 6. 인포그래픽 테마 적용

슬라이드와 동일한 `ThemeSelector` + `designThemeId` 흐름을 사용합니다.

### 테마 주입 방식

```typescript
// nano-banana.ts generateInfographicImage()
const themeBlock = userThemePrompt
  ? `\nDesign Theme (apply consistently):\n${userThemePrompt}\n`
  : "";
```

- 사용자 테마가 있으면 인포그래픽 이미지 프롬프트의 Requirements 위에 삽입
- 없으면 기존 동작 (Professional color scheme with good contrast)

---

## 7. 스토리지 & 진행률

### 7.1 이미지 저장

| 항목 | 값 |
|------|-----|
| 버킷 | `studio` (Supabase Storage) |
| 슬라이드 경로 | `{userId}/outputs/{outputId}-slide-{slideNumber}.{ext}` |
| 인포그래픽 경로 | `{userId}/outputs/{outputId}.{ext}` |
| 테마 미리보기 경로 | `{userId}/themes/preview-{timestamp}.{ext}` |
| 확장자 | `png` 또는 `jpg` (Gemini 응답의 mimeType 기반) |

### 7.2 진행률 구조 (DB content 필드)

```typescript
{
  slides: SlideOutline[],     // 아웃라인 데이터
  progress: {
    phase: string,            // "아웃라인 생성" | "이미지 생성" | "완료"
    completed: number,        // 완료된 슬라이드 수
    total: number,            // 전체 슬라이드 수
    failed: number            // 실패한 슬라이드 수
  }
}
```

### 7.3 DB 업데이트 시점

| 시점 | 업데이트 내용 |
|------|-------------|
| 생성 시작 | `content.progress = { phase: "아웃라인 생성", completed: 0, total: 0, failed: 0 }` |
| 아웃라인 완료 | `content = { slides, progress: { phase: "이미지 생성", completed: 0, total: N } }`, `image_urls = []` |
| 각 슬라이드 완료 | `image_urls` 에 순서대로 URL 추가, `progress.completed++` |
| 전체 완료 | `generation_status = "completed"`, `progress.phase = "완료"` |
| 전체 실패 | `generation_status = "failed"`, `error_message = "..."` |

### 7.4 프론트엔드 폴링

```typescript
// 2초 간격 자동 리패치 (generating 상태인 출력물이 있을 때)
refetchInterval: (query) => {
  const hasGenerating = query.state.data?.some(
    (o) => o.generation_status === "generating"
  );
  return hasGenerating ? 2000 : false;
},
```

---

## 8. 내보내기 (PDF / PPTX)

### 8.1 PDF 내보내기

**경로**: `POST /api/studio/slides/pdf`

**입력:**
```typescript
{ imageUrls: string[], title: string }
```

**처리 로직:**
1. `PDFDocument.create()` (pdf-lib)
2. **병렬 이미지 다운로드** (`Promise.allSettled`) — 모든 이미지를 동시에 fetch
3. 순서를 유지하면서 성공한 이미지만 PDF에 삽입
4. Content-Type 헤더 또는 매직 바이트로 이미지 타입 판별 (JPEG/PNG)
5. A4 가로 (842 × 595pt) 페이지에 맞춰 비율 유지하며 중앙 배치
6. 실패한 이미지는 건너뜀 (로그 출력)
7. PDF 바이너리 응답 (Content-Disposition: attachment)

### 8.2 PPTX 내보내기

**경로**: `POST /api/studio/slides/pptx`

**입력:**
```typescript
{ imageUrls: string[], title: string }
```

**처리 로직:**
1. `new PptxGenJS()` — 16:9 (LAYOUT_WIDE) 레이아웃
2. **병렬 이미지 다운로드** (`Promise.allSettled`) — base64 data URI로 변환
3. 순서를 유지하면서 성공한 이미지만 슬라이드에 추가
4. 각 이미지를 슬라이드 전체 크기(`w: "100%", h: "100%"`)로 삽입
5. `pptx.write({ outputType: "nodebuffer" })` 로 바이너리 생성
6. PPTX 바이너리 응답 (Content-Disposition: attachment)

---

## 9. 개별 슬라이드 재생성

### 경로: `POST /api/studio/slides/regenerate`

### 입력

```typescript
{ outputId: string, slideIndex: number, prompt: string }
```

### 처리 흐름

1. 기존 `studio_outputs` 레코드에서 슬라이드 아웃라인, 디자인 테마, 설정 조회
2. `settings.designThemeId`로 `design_themes` 테이블에서 `userThemePrompt` 조회
3. 기존 이미지 URL이 있으면 → **이미지 편집 모드** (`editSlideImage`)
4. 기존 이미지 없거나 다운로드 실패 시 → **새로 생성** (`generateSlideImage`)
5. 새 이미지를 Supabase Storage에 업로드
6. `image_urls` 배열의 해당 인덱스만 교체

### editSlideImage vs generateSlideImage

| 항목 | `editSlideImage` | `generateSlideImage` |
|------|-------------------|----------------------|
| 입력 | 기존 이미지 + 편집 프롬프트 | 슬라이드 정보만 |
| Gemini 호출 | 이미지 + 텍스트 (멀티모달) | 텍스트만 |
| 프롬프트 | "Edit this slide... Edit instructions: {prompt}" | "Create slide N of M..." |
| `userThemePrompt` | 지원 (동일 우선순위) | 지원 (동일 우선순위) |
| `designTheme` | 지원 | 지원 |

### 테마 적용 우선순위 (generateSlideImage과 동일)

```typescript
const themeInstructions = userThemePrompt
  ? `Design Theme (apply consistently):\n${userThemePrompt}\n`
  : designTheme
  ? `Design Theme (apply consistently):\n- Primary color: ...\n- Mood: ...\n- Style: ...\n`
  : "";
```

---

## 10. UI 컴포넌트

### 10.1 SlideModal (생성 옵션)

- **형식**: 2열 카드 라디오 (detailed / presenter)
- **언어**: 드롭다운 셀렉트 (7개 언어)
- **깊이**: 토글 버튼 (짧게 / 기본값)
- **슬라이드 수**: 숫자 입력 (1~50, 비워두면 자동)
- **디자인 테마**: ThemeSelector (가로 스크롤 카드, "자동" 기본값)
- **콘텐츠 설명**: 텍스트 영역 (리사이즈 가능)
- **생성 버튼**: 로딩 스피너 표시

### 10.2 ThemeSelector (테마 선택)

- **"자동" 카드**: Sparkles 아이콘 + "자동" 라벨, 기본 선택
- **테마 카드**: 썸네일 이미지 배경 + 하단 이름 오버레이
- **"+ 테마 추가" 카드**: 점선 테두리 버튼, 클릭 시 ThemeEditorDialog 인라인 열림 (설정 페이지 이동 불필요)
- **가로 스크롤**: `overflow-hidden` 래퍼 > `flex-nowrap overflow-x-auto` 컨테이너

### 10.3 ThemeEditorDialog (테마 에디터)

- **미리보기 영역**: 16:9 비율, 생성 전 placeholder / 생성 후 이미지
- **테마 이름**: 텍스트 입력
- **디자인 프롬프트**: 여러 줄 텍스트 입력 (자유 형식)
- **미리보기 생성 버튼**: 프롬프트 기반 샘플 슬라이드 생성
- **등록/수정 버튼**: 미리보기 없으면 비활성화

### 10.4 ContentViewer (뷰어)

**생성 중 표시:**
- 스피너 애니메이션
- 진행 상태 텍스트 (예: "이미지 생성... 3/8 슬라이드 생성 완료")
- 프로그레스 바 (퍼센트)
- 완료된 슬라이드 미리보기 (캐러셀 탐색 가능)

**완료 후 표시:**
- 풀 사이즈 이미지 캐러셀
- 좌/우 네비게이션 버튼
- 하단 dot 인디케이터 (슬라이드 위치)
- 이미지 저장 버튼 (개별 슬라이드)
- 개별 슬라이드 재생성 (프롬프트 입력 → regenerate API)
- PDF / PPTX 다운로드 버튼

### 10.5 ChatPanel (채팅)

- **메시지 표시**: 사용자 메시지 (우측 말풍선), AI 응답 (좌측 마크다운)
- **스트리밍**: SSE 기반 실시간 타이핑 효과
- **빈 상태**: 추천 질문 3개 표시
- **AI 응답 액션**: 복사, 메모 저장, 좋아요/싫어요
- **중단 기능**: 스트리밍 중 AbortController로 취소

---

## 11. 채팅 시스템

### 11.1 아키텍처

```
┌──────────────────────────────────────────────────────────────┐
│  ChatPanel (클라이언트)                                        │
│  1. 사용자 메시지 → 낙관적 업데이트 (캐시에 즉시 추가)                │
│  2. POST /api/chat → SSE 스트리밍 수신                         │
│  3. 스트리밍 완료 → AI 응답을 캐시에 즉시 반영                      │
│  4. invalidateQueries로 DB 데이터로 교체                        │
└──────────────┬───────────────────────────────────────────────┘
               │
               ▼
┌──────────────────────────────────────────────────────────────┐
│  API Route (/api/chat)                                       │
│  1. 사용자 메시지 DB 저장                                       │
│  2. 활성 소스 + 대화 이력 조회                                    │
│  3. Gemini 스트리밍 응답 생성                                    │
│  4. TransformStream으로 클라이언트 전송 + 내용 수집                │
│  5. flush()에서 assistant 메시지 DB 저장 (스트림 종료 전 보장)       │
└──────────────────────────────────────────────────────────────┘
```

### 11.2 DB 저장 방식 (TransformStream)

```typescript
const passthrough = new TransformStream<Uint8Array, Uint8Array>({
  transform(chunk, controller) {
    fullContent += decoder.decode(chunk, { stream: true });
    controller.enqueue(chunk);  // 클라이언트에 그대로 전달
  },
  async flush() {
    // 스트림 종료 직전에 DB 저장 — 함수 종료 전 반드시 실행
    await supabase.from("chat_messages").insert({ ... });
  },
});
return new Response(stream.pipeThrough(passthrough), { ... });
```

- `flush()`는 스트림이 닫히기 전에 실행되므로 Vercel serverless에서도 DB 저장이 보장됨
- 클라이언트가 `done: true`를 받는 시점에 이미 DB 저장 완료

### 11.3 클라이언트 캐시 전략

1. **사용자 메시지**: 낙관적 업데이트 (temp ID로 캐시에 즉시 추가)
2. **AI 응답 스트리밍**: `streamingContent` state로 실시간 표시
3. **스트리밍 완료**: AI 응답을 `ChatMessage`로 캐시에 즉시 추가 (사라짐 방지)
4. **DB 갱신**: `invalidateQueries`로 실제 DB 데이터로 교체 (temp ID → 실제 ID)

---

## 12. DB 스키마

### 12.1 studio_outputs (슬라이드)

```typescript
{
  id: string;
  notebook_id: string;
  user_id: string;
  type: "slide_deck";
  title: string;               // "슬라이드 - 2026. 2. 19."
  content: {
    slides: Array<{
      type: SlideType;
      title: string;
      subtitle?: string;
      content: string;
    }>;
    progress: { phase, completed, total, failed };
  };
  image_urls: string[];
  settings: {
    format: string;            // "detailed" | "presenter"
    language: string;
    depth: string;             // "short" | "default"
    prompt?: string;           // 콘텐츠 설명
    slideCount?: number;
    designThemeId?: string;    // 선택한 디자인 테마 ID
  };
  generation_status: "generating" | "completed" | "failed";
  error_message?: string;
  source_ids: string[];
  created_at: string;
  updated_at: string;
}
```

### 12.2 design_themes

```typescript
{
  id: string;                  // UUID
  user_id: string;             // 소유자
  name: string;                // 테마 이름
  prompt: string;              // 디자인 프롬프트 (자유 형식)
  thumbnail_url: string | null; // 미리보기 이미지 URL
  sort_order: number;          // 정렬 순서
  created_at: string;
  updated_at: string;
}
```

---

### 12.3 chat_messages

```typescript
{
  id: string;
  notebook_id: string;
  user_id: string;
  role: "user" | "assistant";
  content: string;
  citations: unknown[];
  model: string | null;         // "gemini-3-flash-preview" (assistant만)
  tokens_used: number | null;
  created_at: string;
}
```

---

## 13. 에러 처리 총정리

| 상황 | 처리 |
|------|------|
| 인증 실패 | 401 Unauthorized |
| notebookId 없음 | 400 "노트북 ID가 필요합니다." |
| 활성 소스 없음 | 400 "활성화된 소스가 없습니다." |
| DB 레코드 생성 실패 | 500 "출력 레코드 생성 실패" |
| 아웃라인 JSON 파싱 실패 | 폴백: 기본 cover 슬라이드 1장 |
| 개별 슬라이드 이미지 실패 | 1회 재시도 → 재실패 시 해당 슬라이드 스킵, 나머지 계속 |
| 전체 슬라이드 이미지 실패 | generation_status = "failed", error_message 기록 |
| PDF 내 이미지 읽기 실패 | 해당 이미지 건너뜀 |
| designThemeId 해당 테마 없음 | userThemePrompt = undefined, 자동 모드로 폴백 |
| 테마 미리보기 생성 실패 | 500 "미리보기 생성 실패" |
| PPTX 이미지 fetch 실패 | 해당 이미지 건너뜀 (로그 출력) |
| 슬라이드 재생성 시 기존 이미지 다운로드 실패 | generateSlideImage로 폴백 (새로 생성) |
| 채팅 스트리밍 중 사용자 중단 | AbortController로 취소, DB에 부분 저장 |

---

## 14. 의존성

```json
{
  "@google/genai": "^1.40.0",        // Gemini API 클라이언트
  "pdf-lib": "^1.17.1",              // PDF 생성 (슬라이드 PDF)
  "pptxgenjs": "^3.12.0",            // PPTX 생성 (슬라이드 PPTX)
  "@supabase/supabase-js": "^2.95.2" // DB + Storage
}
```

### 환경변수

```
GEMINI_API_KEY=<Google AI Studio API 키>
```
