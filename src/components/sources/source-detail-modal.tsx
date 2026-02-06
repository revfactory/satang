"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ExternalLink, Copy, Trash2, FileText, Link2, Type, Youtube, Image, Music } from "lucide-react";
import { useDeleteSource } from "@/hooks/use-sources";
import { toast } from "sonner";
import type { Source, SourceType } from "@/lib/supabase/types";
import { formatDistanceToNow } from "date-fns";
import { ko } from "date-fns/locale";

const TYPE_LABELS: Record<SourceType, string> = {
  pdf: "PDF",
  text: "텍스트",
  url: "웹페이지",
  youtube: "YouTube",
  google_doc: "Google 문서",
  google_slide: "Google 슬라이드",
  google_sheet: "Google 시트",
  image: "이미지",
  audio: "오디오",
};

const TYPE_ICONS: Record<SourceType, React.ReactNode> = {
  pdf: <FileText className="w-4 h-4 text-red-500" />,
  text: <Type className="w-4 h-4 text-gray-500" />,
  url: <Link2 className="w-4 h-4 text-blue-500" />,
  youtube: <Youtube className="w-4 h-4 text-red-600" />,
  google_doc: <FileText className="w-4 h-4 text-blue-600" />,
  google_slide: <FileText className="w-4 h-4 text-yellow-600" />,
  google_sheet: <FileText className="w-4 h-4 text-green-600" />,
  image: <Image className="w-4 h-4 text-purple-500" />,
  audio: <Music className="w-4 h-4 text-orange-500" />,
};

interface SourceDetailModalProps {
  source: Source | null;
  onClose: () => void;
}

export function SourceDetailModal({ source, onClose }: SourceDetailModalProps) {
  const deleteSource = useDeleteSource();

  if (!source) return null;

  const handleCopy = () => {
    const text = source.extracted_text || "";
    navigator.clipboard.writeText(text);
    toast.success("텍스트가 복사되었습니다.");
  };

  const handleDelete = async () => {
    if (!confirm("이 소스를 삭제하시겠습니까?")) return;
    try {
      await deleteSource.mutateAsync(source.id);
      toast.success("소스가 삭제되었습니다.");
      onClose();
    } catch {
      toast.error("삭제에 실패했습니다.");
    }
  };

  return (
    <Dialog open={!!source} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[640px] max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <div className="flex items-center gap-2">
            {TYPE_ICONS[source.type]}
            <DialogTitle className="text-base font-semibold truncate">
              {source.title}
            </DialogTitle>
          </div>
          <div className="flex items-center gap-2 mt-1.5">
            <Badge variant="secondary" className="text-[11px]">
              {TYPE_LABELS[source.type]}
            </Badge>
            <span className="text-[11px] text-text-muted">
              {formatDistanceToNow(new Date(source.created_at), {
                addSuffix: true,
                locale: ko,
              })}
            </span>
            {source.original_url && (
              <a
                href={source.original_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[11px] text-blue-500 hover:underline flex items-center gap-0.5"
              >
                원본 링크
                <ExternalLink className="w-3 h-3" />
              </a>
            )}
          </div>
        </DialogHeader>

        {/* Summary */}
        {source.summary && (
          <div className="shrink-0 bg-brand-faint border border-brand-light rounded-lg px-3 py-2.5">
            <p className="text-[11px] font-medium text-brand mb-1">AI 요약</p>
            <p className="text-[13px] text-text-secondary leading-relaxed">
              {source.summary}
            </p>
          </div>
        )}

        {/* Content */}
        <div className="flex-1 min-h-0 border border-border-default rounded-lg overflow-y-auto p-4">
          {source.extracted_text ? (
            <pre className="text-[13px] text-text-secondary leading-relaxed whitespace-pre-wrap font-sans break-words">
              {source.extracted_text}
            </pre>
          ) : (
            <p className="text-[13px] text-text-muted text-center py-8">
              추출된 텍스트가 없습니다.
            </p>
          )}
        </div>

        {/* Actions */}
        <div className="shrink-0 flex justify-between pt-1">
          <Button
            variant="ghost"
            size="sm"
            className="text-error hover:text-error hover:bg-red-50"
            onClick={handleDelete}
          >
            <Trash2 className="w-4 h-4 mr-1.5" />
            삭제
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleCopy}
            disabled={!source.extracted_text}
          >
            <Copy className="w-4 h-4 mr-1.5" />
            텍스트 복사
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
