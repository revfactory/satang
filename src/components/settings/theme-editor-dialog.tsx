"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import {
  useCreateDesignTheme,
  useUpdateDesignTheme,
} from "@/hooks/use-design-themes";
import type { DesignThemeRow } from "@/lib/supabase/types";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const MOOD_PRESETS = [
  { label: "전문적", value: "professional and modern" },
  { label: "따뜻한", value: "warm and friendly" },
  { label: "대담한", value: "bold and impactful" },
  { label: "우아한", value: "elegant and sophisticated" },
  { label: "재미있는", value: "fun and playful" },
];

const STYLE_PRESETS = [
  { label: "미니멀", value: "minimal with bold typography" },
  { label: "기업스타일", value: "corporate with structured layout" },
  { label: "화려한", value: "vibrant with rich visuals" },
  { label: "다크테마", value: "dark theme with neon accents" },
  { label: "파스텔", value: "pastel and soft gradients" },
];

interface ThemeEditorDialogProps {
  open: boolean;
  onClose: () => void;
  theme?: DesignThemeRow | null;
}

export function ThemeEditorDialog({
  open,
  onClose,
  theme,
}: ThemeEditorDialogProps) {
  const [name, setName] = useState("");
  const [primaryColor, setPrimaryColor] = useState("#4F46E5");
  const [mood, setMood] = useState("professional and modern");
  const [style, setStyle] = useState("minimal with bold typography");

  const createTheme = useCreateDesignTheme();
  const updateTheme = useUpdateDesignTheme();

  const isEditing = !!theme;
  const isPending = createTheme.isPending || updateTheme.isPending;

  useEffect(() => {
    if (theme) {
      setName(theme.name);
      setPrimaryColor(theme.primary_color);
      setMood(theme.mood);
      setStyle(theme.style);
    } else {
      setName("");
      setPrimaryColor("#4F46E5");
      setMood("professional and modern");
      setStyle("minimal with bold typography");
    }
  }, [theme, open]);

  const handleSave = async () => {
    if (!name.trim()) {
      toast.error("테마 이름을 입력해주세요.");
      return;
    }

    try {
      if (isEditing) {
        await updateTheme.mutateAsync({
          id: theme.id,
          name: name.trim(),
          primary_color: primaryColor,
          mood,
          style,
        });
        toast.success("테마가 수정되었습니다.");
      } else {
        await createTheme.mutateAsync({
          name: name.trim(),
          primary_color: primaryColor,
          mood,
          style,
        });
        toast.success("테마가 생성되었습니다.");
      }
      onClose();
    } catch {
      toast.error(isEditing ? "테마 수정 실패" : "테마 생성 실패");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle className="text-base font-semibold">
            {isEditing ? "테마 수정" : "새 디자인 테마"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5">
          {/* Preview Card */}
          <div
            className="rounded-xl p-6 text-white relative overflow-hidden"
            style={{ backgroundColor: primaryColor }}
          >
            <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-black/20" />
            <div className="relative">
              <div className="text-xs font-medium opacity-80 mb-1">미리보기</div>
              <div className="text-lg font-bold mb-1">
                {name || "테마 이름"}
              </div>
              <div className="text-xs opacity-70 leading-relaxed">
                {mood} · {style}
              </div>
            </div>
          </div>

          {/* Theme Name */}
          <div>
            <label className="text-[13px] font-medium text-text-secondary block mb-2">
              테마 이름
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="예: 비즈니스 블루"
              className="w-full h-9 rounded-lg border border-border-default px-3 text-sm focus:border-brand focus:ring-2 focus:ring-brand/20 outline-none"
            />
          </div>

          {/* Primary Color */}
          <div>
            <label className="text-[13px] font-medium text-text-secondary block mb-2">
              주요 색상
            </label>
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={primaryColor}
                onChange={(e) => setPrimaryColor(e.target.value)}
                className="w-10 h-10 rounded-lg border border-border-default cursor-pointer p-0.5"
              />
              <input
                type="text"
                value={primaryColor}
                onChange={(e) => setPrimaryColor(e.target.value)}
                className="w-28 h-9 rounded-lg border border-border-default px-3 text-sm font-mono focus:border-brand focus:ring-2 focus:ring-brand/20 outline-none"
              />
            </div>
          </div>

          {/* Mood */}
          <div>
            <label className="text-[13px] font-medium text-text-secondary block mb-2">
              분위기
            </label>
            <div className="flex flex-wrap gap-2 mb-2">
              {MOOD_PRESETS.map((preset) => (
                <button
                  key={preset.value}
                  onClick={() => setMood(preset.value)}
                  className={cn(
                    "px-3 h-7 rounded-full text-xs font-medium transition-colors cursor-pointer",
                    mood === preset.value
                      ? "bg-brand text-white"
                      : "bg-gray-100 text-text-secondary hover:bg-gray-200"
                  )}
                >
                  {preset.label}
                </button>
              ))}
            </div>
            <input
              type="text"
              value={mood}
              onChange={(e) => setMood(e.target.value)}
              placeholder="분위기를 직접 입력..."
              className="w-full h-9 rounded-lg border border-border-default px-3 text-sm focus:border-brand focus:ring-2 focus:ring-brand/20 outline-none"
            />
          </div>

          {/* Style */}
          <div>
            <label className="text-[13px] font-medium text-text-secondary block mb-2">
              스타일
            </label>
            <div className="flex flex-wrap gap-2 mb-2">
              {STYLE_PRESETS.map((preset) => (
                <button
                  key={preset.value}
                  onClick={() => setStyle(preset.value)}
                  className={cn(
                    "px-3 h-7 rounded-full text-xs font-medium transition-colors cursor-pointer",
                    style === preset.value
                      ? "bg-brand text-white"
                      : "bg-gray-100 text-text-secondary hover:bg-gray-200"
                  )}
                >
                  {preset.label}
                </button>
              ))}
            </div>
            <input
              type="text"
              value={style}
              onChange={(e) => setStyle(e.target.value)}
              placeholder="스타일을 직접 입력..."
              className="w-full h-9 rounded-lg border border-border-default px-3 text-sm focus:border-brand focus:ring-2 focus:ring-brand/20 outline-none"
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onClose}>
              취소
            </Button>
            <Button
              onClick={handleSave}
              disabled={isPending}
              className="bg-brand hover:bg-brand-hover"
            >
              {isPending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  저장 중...
                </>
              ) : isEditing ? (
                "수정"
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
