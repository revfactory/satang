"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Eye, ImageIcon, Trash2 } from "lucide-react";
import {
  useCreateDesignTheme,
  useUpdateDesignTheme,
  useDeleteDesignTheme,
  useGenerateThemePreview,
} from "@/hooks/use-design-themes";
import type { DesignThemeRow } from "@/lib/supabase/types";
import { toast } from "sonner";

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
  const [prompt, setPrompt] = useState("");
  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null);

  const createTheme = useCreateDesignTheme();
  const updateTheme = useUpdateDesignTheme();
  const deleteTheme = useDeleteDesignTheme();
  const generatePreview = useGenerateThemePreview();

  const isEditing = !!theme;
  const isPending = createTheme.isPending || updateTheme.isPending;

  const handleDelete = async () => {
    if (!theme) return;
    if (!confirm("이 테마를 삭제하시겠습니까?")) return;
    try {
      await deleteTheme.mutateAsync(theme.id);
      toast.success("테마가 삭제되었습니다.");
      onClose();
    } catch {
      toast.error("테마 삭제에 실패했습니다.");
    }
  };

  useEffect(() => {
    if (theme) {
      setName(theme.name);
      setPrompt(theme.prompt);
      setThumbnailUrl(theme.thumbnail_url);
    } else {
      setName("");
      setPrompt("");
      setThumbnailUrl(null);
    }
  }, [theme, open]);

  const handlePreview = async () => {
    if (!prompt.trim()) {
      toast.error("디자인 프롬프트를 입력해주세요.");
      return;
    }

    try {
      const url = await generatePreview.mutateAsync(prompt.trim());
      setThumbnailUrl(url);
      toast.success("미리보기가 생성되었습니다.");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "미리보기 생성 실패"
      );
    }
  };

  const handleSave = async () => {
    if (!name.trim()) {
      toast.error("테마 이름을 입력해주세요.");
      return;
    }
    if (!prompt.trim()) {
      toast.error("디자인 프롬프트를 입력해주세요.");
      return;
    }
    if (!thumbnailUrl) {
      toast.error("미리보기를 먼저 생성해주세요.");
      return;
    }

    try {
      if (isEditing) {
        await updateTheme.mutateAsync({
          id: theme.id,
          name: name.trim(),
          prompt: prompt.trim(),
          thumbnail_url: thumbnailUrl,
        });
        toast.success("테마가 수정되었습니다.");
      } else {
        await createTheme.mutateAsync({
          name: name.trim(),
          prompt: prompt.trim(),
          thumbnail_url: thumbnailUrl,
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
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle className="text-base font-semibold">
            {isEditing ? "테마 수정" : "새 디자인 테마"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5">
          {/* Preview Image */}
          <div>
            <label className="text-[13px] font-medium text-text-secondary block mb-2">
              미리보기
            </label>
            <div className="relative rounded-xl overflow-hidden border border-border-default bg-gray-50 aspect-video">
              {thumbnailUrl ? (
                <img
                  src={thumbnailUrl}
                  alt="테마 미리보기"
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-text-tertiary gap-2">
                  <ImageIcon className="w-8 h-8" />
                  <span className="text-xs">
                    디자인 프롬프트를 입력하고 미리보기를 생성하세요
                  </span>
                </div>
              )}
              {generatePreview.isPending && (
                <div className="absolute inset-0 bg-black/40 flex flex-col items-center justify-center gap-2">
                  <Loader2 className="w-6 h-6 animate-spin text-white" />
                  <span className="text-xs text-white font-medium">
                    샘플 슬라이드 생성 중...
                  </span>
                </div>
              )}
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

          {/* Design Prompt */}
          <div>
            <label className="text-[13px] font-medium text-text-secondary block mb-2">
              디자인 프롬프트
            </label>
            <Textarea
              value={prompt}
              onChange={(e) => {
                setPrompt(e.target.value);
                // 프롬프트가 변경되면 기존 미리보기는 프롬프트 변경 전 상태임을 표시
                if (thumbnailUrl && !isEditing) {
                  // 새 테마일 때만 자동 초기화하지 않음 — 사용자가 재생성 버튼 클릭
                }
              }}
              placeholder={`색상, 분위기, 스타일 등 원하는 디자인을 자유롭게 설명하세요.\n\n예시:\n파란색(#4F46E5) 계열의 전문적이고 모던한 느낌\n미니멀한 레이아웃에 굵은 타이포그래피\n깔끔한 아이콘과 충분한 여백 사용`}
              className="min-h-[100px] max-h-[30vh] resize-y"
            />
          </div>

          {/* Actions */}
          <div className="flex justify-between">
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={handlePreview}
                disabled={generatePreview.isPending || !prompt.trim()}
              >
                {generatePreview.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    생성 중...
                  </>
                ) : (
                  <>
                    <Eye className="w-4 h-4 mr-2" />
                    미리보기 생성
                  </>
                )}
              </Button>
              {isEditing && (
                <Button
                  variant="outline"
                  onClick={handleDelete}
                  disabled={deleteTheme.isPending}
                  className="text-error hover:bg-red-50 hover:border-error"
                >
                  {deleteTheme.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Trash2 className="w-4 h-4" />
                  )}
                </Button>
              )}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={onClose}>
                취소
              </Button>
              <Button
                onClick={handleSave}
                disabled={isPending || !thumbnailUrl}
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
                  "등록"
                )}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
