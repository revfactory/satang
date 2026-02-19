"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Copy, Check, Link2, Loader2, Link2Off } from "lucide-react";
import { useShareNotebook, useUnshareNotebook } from "@/hooks/use-notebooks";
import { toast } from "sonner";
import type { Notebook } from "@/lib/supabase/types";

interface ShareModalProps {
  open: boolean;
  onClose: () => void;
  notebook: Notebook;
}

export function ShareModal({ open, onClose, notebook }: ShareModalProps) {
  const [copied, setCopied] = useState(false);
  const [isShared, setIsShared] = useState(notebook.is_shared);
  const [shareToken, setShareToken] = useState(notebook.share_token);
  const shareNotebook = useShareNotebook();
  const unshareNotebook = useUnshareNotebook();

  useEffect(() => {
    setIsShared(notebook.is_shared);
    setShareToken(notebook.share_token);
  }, [notebook.is_shared, notebook.share_token]);

  const shareUrl = shareToken
    ? `${window.location.origin}/shared/${shareToken}`
    : null;

  const handleShare = async () => {
    try {
      const result = await shareNotebook.mutateAsync(notebook.id);
      setIsShared(true);
      setShareToken(result.share_token);
      toast.success("공유 링크가 생성되었습니다.");
    } catch {
      toast.error("공유 설정에 실패했습니다.");
    }
  };

  const handleUnshare = async () => {
    try {
      await unshareNotebook.mutateAsync(notebook.id);
      setIsShared(false);
      setShareToken(null);
      toast.success("공유가 해제되었습니다.");
    } catch {
      toast.error("공유 해제에 실패했습니다.");
    }
  };

  const handleCopy = () => {
    if (shareUrl) {
      navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast.success("링크가 복사되었습니다.");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[440px]">
        <DialogHeader>
          <DialogTitle className="text-base font-semibold">
            노트북 공유
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 min-w-0">
          {isShared && shareUrl ? (
            <>
              <p className="text-sm text-text-secondary">
                이 노트북은 공유 중입니다. 링크를 가진 사람은 소스와 생성된 콘텐츠를 볼 수 있습니다.
              </p>

              <div className="flex items-center gap-2">
                <div className="flex-1 flex items-center gap-2 px-3 py-2.5 bg-gray-50 border border-border-default rounded-lg">
                  <Link2 className="w-4 h-4 text-text-muted shrink-0" />
                  <span className="text-[13px] text-text-secondary truncate">
                    {shareUrl}
                  </span>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCopy}
                  className="shrink-0"
                >
                  {copied ? (
                    <Check className="w-4 h-4 text-green-600" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </Button>
              </div>

              <Button
                variant="outline"
                onClick={handleUnshare}
                disabled={unshareNotebook.isPending}
                className="w-full text-error hover:text-error"
              >
                {unshareNotebook.isPending ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Link2Off className="w-4 h-4 mr-2" />
                )}
                공유 해제
              </Button>
            </>
          ) : (
            <>
              <p className="text-sm text-text-secondary">
                공유 링크를 생성하면 링크를 가진 사람이 이 노트북의 소스와 생성된 콘텐츠를 볼 수 있습니다.
              </p>

              <Button
                onClick={handleShare}
                disabled={shareNotebook.isPending}
                className="w-full bg-brand hover:bg-brand-hover"
              >
                {shareNotebook.isPending ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Link2 className="w-4 h-4 mr-2" />
                )}
                공유 링크 생성
              </Button>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
