"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Loader2, Presentation, Check } from "lucide-react";
import { useGenerateSlides } from "@/hooks/use-studio";
import { ThemeSelector } from "@/components/studio/theme-selector";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const LANGUAGES = [
  { value: "ko", label: "한국어" },
  { value: "en", label: "English" },
  { value: "ja", label: "日本語" },
  { value: "zh", label: "中文" },
  { value: "es", label: "Español" },
  { value: "fr", label: "Français" },
  { value: "de", label: "Deutsch" },
];

const FORMATS = [
  {
    value: "detailed",
    label: "자세한 자료",
    description:
      "전체 텍스트의 세부정보가 가득한 포괄적인 자료로, 이메일로 보내거나 단독으로 읽기에 적합합니다.",
  },
  {
    value: "presenter",
    label: "발표자 슬라이드",
    description:
      "발표하는 동안 도움이 될 핵심 내용을 담은 간결하고 시각적인 슬라이드입니다.",
  },
];

const DEPTHS = [
  { value: "short", label: "짧게" },
  { value: "default", label: "기본값" },
];

interface SlideModalProps {
  open: boolean;
  onClose: () => void;
  notebookId: string;
}

export function SlideModal({ open, onClose, notebookId }: SlideModalProps) {
  const [format, setFormat] = useState("detailed");
  const [language, setLanguage] = useState("ko");
  const [depth, setDepth] = useState("default");
  const [slideCount, setSlideCount] = useState("");
  const [designThemeId, setDesignThemeId] = useState<string | null>(null);
  const [prompt, setPrompt] = useState("");

  const generate = useGenerateSlides();

  const handleGenerate = async () => {
    try {
      await generate.mutateAsync({
        notebookId,
        format,
        language,
        depth,
        prompt,
        slideCount: slideCount ? parseInt(slideCount, 10) : undefined,
        designThemeId: designThemeId || undefined,
      });
      toast.success("슬라이드 생성이 시작되었습니다.");
      onClose();
      setPrompt("");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "슬라이드 생성 실패"
      );
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[560px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base font-semibold">
            <Presentation className="w-5 h-5" />
            슬라이드 자료 맞춤설정
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5 min-w-0">
          {/* Format */}
          <div>
            <label className="text-[13px] font-medium text-text-secondary block mb-2">
              형식
            </label>
            <div className="grid grid-cols-2 gap-3">
              {FORMATS.map((f) => (
                <button
                  key={f.value}
                  onClick={() => setFormat(f.value)}
                  className={cn(
                    "p-4 rounded-xl border text-left transition-all cursor-pointer",
                    format === f.value
                      ? "border-2 border-brand bg-brand-faint"
                      : "border-border-default hover:bg-gray-50"
                  )}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-sm font-medium text-text-primary">
                      {f.label}
                    </span>
                    {format === f.value && (
                      <Check className="w-4 h-4 text-brand" />
                    )}
                  </div>
                  <p className="text-xs text-text-tertiary leading-relaxed">
                    {f.description}
                  </p>
                </button>
              ))}
            </div>
          </div>

          {/* Language */}
          <div>
            <label className="text-[13px] font-medium text-text-secondary block mb-2">
              언어 선택
            </label>
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              className="w-full h-9 rounded-lg border border-border-default px-3 text-sm focus:border-brand focus:ring-2 focus:ring-brand/20 outline-none"
            >
              {LANGUAGES.map((l) => (
                <option key={l.value} value={l.value}>
                  {l.label}
                </option>
              ))}
            </select>
          </div>

          {/* Depth */}
          <div>
            <label className="text-[13px] font-medium text-text-secondary block mb-2">
              깊이
            </label>
            <div className="flex gap-2">
              {DEPTHS.map((d) => (
                <button
                  key={d.value}
                  onClick={() => setDepth(d.value)}
                  className={cn(
                    "flex-1 h-9 rounded-lg border text-sm font-medium transition-colors cursor-pointer flex items-center justify-center gap-1.5",
                    depth === d.value
                      ? "bg-gray-100 border-text-primary text-text-primary"
                      : "border-border-default text-text-tertiary hover:bg-gray-50"
                  )}
                >
                  {depth === d.value && <Check className="w-3.5 h-3.5" />}
                  {d.label}
                </button>
              ))}
            </div>
          </div>

          {/* Slide Count */}
          <div>
            <label className="text-[13px] font-medium text-text-secondary block mb-2">
              슬라이드 수
            </label>
            <div className="flex items-center gap-3">
              <input
                type="number"
                min={1}
                max={20}
                value={slideCount}
                onChange={(e) => setSlideCount(e.target.value)}
                placeholder="자동"
                className="w-24 h-9 rounded-lg border border-border-default px-3 text-sm focus:border-brand focus:ring-2 focus:ring-brand/20 outline-none"
              />
              <span className="text-xs text-text-tertiary">
                비워두면 형식과 깊이에 따라 자동 결정
              </span>
            </div>
          </div>

          {/* Design Theme */}
          <ThemeSelector
            selectedThemeId={designThemeId}
            onSelect={setDesignThemeId}
          />

          {/* Prompt */}
          <div>
            <label className="text-[13px] font-medium text-text-secondary block mb-2">
              콘텐츠 설명
            </label>
            <Textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder='간략한 개요를 추가하거나 청중, 스타일, 강조할 점에 대한 가이드 제공: "단계별 안내에 초점을 둔 대담하고 재미있는 스타일의 초보자용 자료를 만들어 줘."'
              className="min-h-[80px] max-h-[30vh] resize-y"
            />
          </div>

          {/* Submit */}
          <div className="flex justify-end">
            <Button
              onClick={handleGenerate}
              disabled={generate.isPending}
              className="bg-brand hover:bg-brand-hover px-6"
            >
              {generate.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  생성 중...
                </>
              ) : (
                "생성"
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
