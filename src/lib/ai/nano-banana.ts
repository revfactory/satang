import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

const ASPECT_RATIOS: Record<string, string> = {
  landscape: "16:9",
  portrait: "9:16",
  square: "1:1",
};

export async function generateInfographicImage(params: {
  sourceContent: string;
  language: string;
  orientation: string;
  detailLevel: string;
  userPrompt: string;
  designTheme?: { primaryColor: string; mood: string; style: string };
}): Promise<{ imageData: string; mimeType: string }> {
  const { sourceContent, language, orientation, detailLevel, userPrompt, designTheme } =
    params;

  const languageNames: Record<string, string> = {
    ko: "Korean",
    en: "English",
    ja: "Japanese",
    zh: "Chinese",
    es: "Spanish",
    fr: "French",
    de: "German",
  };

  const detailLabels: Record<string, string> = {
    concise: "concise with key highlights only",
    standard: "standard level of detail",
    detailed: "comprehensive with in-depth data points",
  };

  const themeBlock = designTheme
    ? `
Design Theme (apply consistently):
- Primary color: ${designTheme.primaryColor}
- Mood: ${designTheme.mood}
- Style: ${designTheme.style}
- Use this color as the dominant accent throughout the infographic
`
    : "";

  const prompt = `Create a professional infographic in ${languageNames[language] || "Korean"}.

Topic and key data points from sources:
${sourceContent.slice(0, 8000)}

Detail level: ${detailLabels[detailLevel] || "standard level of detail"}
${themeBlock}
Requirements:
- All text must be in ${languageNames[language] || "Korean"}
- Use clean, modern design with clear visual hierarchy
- Include relevant icons, charts, and data visualizations
- Ensure all text is legible and properly rendered
${designTheme ? "- Follow the specified design theme consistently" : "- Professional color scheme with good contrast"}

${userPrompt ? `Additional style instructions: ${userPrompt}` : ""}`;

  const response = await ai.models.generateContent({
    model: "gemini-3-pro-image-preview",
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    config: {
      responseModalities: ["IMAGE"],
      imageGenerationConfig: {
        aspectRatio: ASPECT_RATIOS[orientation] || "16:9",
      },
    } as Record<string, unknown>,
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const parts: any[] = response.candidates?.[0]?.content?.parts || [];
  const imagePart = parts.find((p) => p.inlineData);

  if (!imagePart?.inlineData) {
    throw new Error("이미지 생성에 실패했습니다.");
  }

  return {
    imageData: imagePart.inlineData.data as string,
    mimeType: imagePart.inlineData.mimeType as string,
  };
}

export type SlideType = "cover" | "toc" | "section" | "content" | "key_takeaway" | "closing";

export interface DesignTheme {
  primaryColor: string;
  mood: string;
  style: string;
}

const SLIDE_TYPE_PROMPTS: Record<SlideType, (params: { title: string; subtitle?: string; content: string; format: string }) => string> = {
  cover: ({ title, subtitle, format }) => {
    const base = `This is the COVER slide (title slide).
Layout:
- Large, bold title "${title}" centered prominently
${subtitle ? `- Subtitle "${subtitle}" below the title in smaller text` : ""}
- Clean, impactful background with minimal elements
- No bullet points or body text`;
    return format === "presenter"
      ? `${base}\n- Extra emphasis on visual impact, very minimal text`
      : base;
  },
  toc: ({ content, format }) => {
    const base = `This is a TABLE OF CONTENTS slide.
Layout:
- Title "목차" or "Table of Contents" at the top
- Numbered list of sections with clear visual separation
- Content: ${content}
- Use subtle icons or dividers between items`;
    return format === "presenter"
      ? `${base}\n- Keep text minimal, use icons to represent each section`
      : base;
  },
  section: ({ title, format }) => {
    const base = `This is a SECTION DIVIDER slide.
Layout:
- Section title "${title}" displayed large and centered
- Minimal background, acts as a visual break between topics
- No bullet points or detailed text`;
    return format === "presenter"
      ? `${base}\n- Bold, dramatic typography with visual impact`
      : base;
  },
  content: ({ title, content, format }) => {
    const base = `This is a CONTENT slide.
Layout:
- Title "${title}" at the top
- Key points presented as bullet points or short paragraphs
- Content: ${content}`;
    return format === "presenter"
      ? `${base}\n- Visual-focused: use large keywords, icons, and diagrams instead of full sentences\n- Maximum 3-4 key words or short phrases visible`
      : `${base}\n- Include detailed explanations with clear text hierarchy\n- Use bullet points with supporting details`;
  },
  key_takeaway: ({ title, content, format }) => {
    const base = `This is a KEY TAKEAWAY / SUMMARY slide.
Layout:
- Title "${title}" at the top
- Highlight 3-5 key points with emphasis (bold, icons, or numbered)
- Content: ${content}
- Use visual emphasis (larger text, highlight boxes, or icons) for each point`;
    return format === "presenter"
      ? `${base}\n- Use large icons or numbers with single keywords for each takeaway`
      : base;
  },
  closing: ({ title, content, format }) => {
    const base = `This is the CLOSING slide.
Layout:
- "${title}" displayed prominently
- ${content || "Thank you message"}
- Clean, elegant design matching the cover slide style
- Optional: contact info or QR code area at bottom`;
    return format === "presenter"
      ? `${base}\n- Very minimal, focus on a memorable closing visual`
      : base;
  },
};

export async function generateSlideImage(params: {
  slideNumber: number;
  totalSlides: number;
  topic: string;
  slideTitle: string;
  slideContent: string;
  slideType?: SlideType;
  subtitle?: string;
  designTheme?: DesignTheme;
  language: string;
  format: string;
  userPrompt: string;
}): Promise<{ imageData: string; mimeType: string }> {
  const {
    slideNumber,
    totalSlides,
    topic,
    slideTitle,
    slideContent,
    slideType = "content",
    subtitle,
    designTheme,
    language,
    format,
    userPrompt,
  } = params;

  const languageNames: Record<string, string> = {
    ko: "Korean",
    en: "English",
    ja: "Japanese",
    zh: "Chinese",
    es: "Spanish",
    fr: "French",
    de: "German",
  };

  const langName = languageNames[language] || "Korean";

  const typePrompt = SLIDE_TYPE_PROMPTS[slideType]?.({
    title: slideTitle,
    subtitle,
    content: slideContent,
    format,
  }) ?? SLIDE_TYPE_PROMPTS.content({
    title: slideTitle,
    content: slideContent,
    format,
  });

  const themeInstructions = designTheme
    ? `Design Theme (apply consistently):
- Primary color: ${designTheme.primaryColor}
- Mood: ${designTheme.mood}
- Style: ${designTheme.style}
`
    : "";

  const prompt = `Create slide ${slideNumber} of ${totalSlides} for a professional presentation.
Language: ${langName}
Overall topic: ${topic}

${typePrompt}

${themeInstructions}Global Requirements:
- All text MUST be in ${langName}
- 16:9 aspect ratio, professional presentation slide
- Clear, readable typography with good hierarchy
- Consistent visual style across all slides in this deck

${userPrompt ? `Additional instructions: ${userPrompt}` : ""}`;

  const response = await ai.models.generateContent({
    model: "gemini-3-pro-image-preview",
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    config: {
      responseModalities: ["IMAGE"],
      imageGenerationConfig: {
        aspectRatio: "16:9",
      },
    } as Record<string, unknown>,
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const parts: any[] = response.candidates?.[0]?.content?.parts || [];
  const imagePart = parts.find((p) => p.inlineData);

  if (!imagePart?.inlineData) {
    throw new Error(`슬라이드 ${slideNumber} 이미지 생성에 실패했습니다.`);
  }

  return {
    imageData: imagePart.inlineData.data as string,
    mimeType: imagePart.inlineData.mimeType as string,
  };
}
