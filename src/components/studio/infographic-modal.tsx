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
import { Loader2, BarChart3 } from "lucide-react";
import { useGenerateInfographic } from "@/hooks/use-studio";
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

const ORIENTATIONS = [
  { value: "landscape", label: "가로" },
  { value: "portrait", label: "세로" },
  { value: "square", label: "정사각형" },
];

const DETAIL_LEVELS = [
  { value: "concise", label: "간결하게" },
  { value: "standard", label: "표준" },
  { value: "detailed", label: "상세 (AI)", hasAiBadge: true },
];

interface InfographicModalProps {
  open: boolean;
  onClose: () => void;
  notebookId: string;
}

export function InfographicModal({
  open,
  onClose,
  notebookId,
}: InfographicModalProps) {
  const [language, setLanguage] = useState("ko");
  const [orientation, setOrientation] = useState("landscape");
  const [detailLevel, setDetailLevel] = useState("standard");
  const [designThemeId, setDesignThemeId] = useState<string | null>(null);
  const [prompt, setPrompt] = useState("");

  const generate = useGenerateInfographic();

  const handleGenerate = async () => {
    try {
      await generate.mutateAsync({
        notebookId,
        language,
        orientation,
        detailLevel,
        prompt,
        designThemeId: designThemeId || undefined,
      });
      toast.success("인포그래픽 생성이 시작되었습니다.");
      onClose();
      setPrompt("");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "인포그래픽 생성 실패"
      );
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base font-semibold">
            <BarChart3 className="w-5 h-5" />
            인포그래픽 맞춤설정
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5">
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

          {/* Orientation */}
          <div>
            <label className="text-[13px] font-medium text-text-secondary block mb-2">
              방향 선택
            </label>
            <div className="flex gap-2">
              {ORIENTATIONS.map((o) => (
                <button
                  key={o.value}
                  onClick={() => setOrientation(o.value)}
                  className={cn(
                    "flex-1 h-9 rounded-lg border text-sm font-medium transition-colors cursor-pointer",
                    orientation === o.value
                      ? "bg-gray-100 border-text-primary text-text-primary"
                      : "border-border-default text-text-tertiary hover:bg-gray-50"
                  )}
                >
                  {o.label}
                </button>
              ))}
            </div>
          </div>

          {/* Detail Level */}
          <div>
            <label className="text-[13px] font-medium text-text-secondary block mb-2">
              세부정보 수준
            </label>
            <div className="flex gap-2">
              {DETAIL_LEVELS.map((d) => (
                <button
                  key={d.value}
                  onClick={() => setDetailLevel(d.value)}
                  className={cn(
                    "flex-1 h-9 rounded-lg border text-sm font-medium transition-colors cursor-pointer",
                    detailLevel === d.value
                      ? "bg-gray-100 border-text-primary text-text-primary"
                      : "border-border-default text-text-tertiary hover:bg-gray-50"
                  )}
                >
                  {d.label}
                </button>
              ))}
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
              placeholder='스타일, 색상 또는 강조할 부분 안내: "파란색 색상 테마를 사용하고 3가지 주요 통계를 강조해 줘."'
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
