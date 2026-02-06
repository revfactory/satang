"use client";

import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Upload, Globe, FolderOpen, ClipboardPaste, FileUp, X, Loader2 } from "lucide-react";
import { useAddTextSource } from "@/hooks/use-sources";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

interface SourceAddModalProps {
  open: boolean;
  onClose: () => void;
  notebookId: string;
  sourceCount: number;
}

type AddMode = "main" | "url" | "text";

export function SourceAddModal({
  open,
  onClose,
  notebookId,
  sourceCount,
}: SourceAddModalProps) {
  const [mode, setMode] = useState<AddMode>("main");
  const [urlInput, setUrlInput] = useState("");
  const [textTitle, setTextTitle] = useState("");
  const [textContent, setTextContent] = useState("");
  const [isUploading, setIsUploading] = useState(false);

  const addTextSource = useAddTextSource();
  const queryClient = useQueryClient();

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      if (sourceCount >= 300) {
        toast.error("소스는 최대 300개까지 추가할 수 있습니다.");
        return;
      }

      setIsUploading(true);
      try {
        for (const file of acceptedFiles) {
          if (file.size > 10 * 1024 * 1024) {
            toast.error(`${file.name}: 파일 크기가 10MB를 초과합니다.`);
            continue;
          }

          const formData = new FormData();
          formData.append("file", file);
          formData.append("notebookId", notebookId);

          const response = await fetch("/api/sources/upload", {
            method: "POST",
            body: formData,
          });

          if (!response.ok) {
            toast.error(`${file.name}: 업로드 실패`);
          } else {
            toast.success(`${file.name}: 업로드 완료`);
            queryClient.invalidateQueries({ queryKey: ["sources"] });
            queryClient.invalidateQueries({ queryKey: ["notebooks"] });
          }
        }
        onClose();
      } finally {
        setIsUploading(false);
      }
    },
    [notebookId, sourceCount, onClose]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "application/pdf": [".pdf"],
      "text/*": [".txt", ".md", ".csv"],
      "image/*": [".png", ".jpg", ".jpeg", ".gif", ".webp"],
      "audio/*": [".mp3", ".wav", ".m4a", ".ogg"],
    },
    maxSize: 10 * 1024 * 1024,
    noClick: true,
  });

  const handleAddUrl = async () => {
    if (!urlInput.trim()) return;
    if (sourceCount >= 300) {
      toast.error("소스는 최대 300개까지 추가할 수 있습니다.");
      return;
    }

    setIsUploading(true);
    try {
      const response = await fetch("/api/sources/process", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notebookId, type: "url", url: urlInput.trim() }),
      });

      if (!response.ok) {
        toast.error("URL 소스 추가 실패");
      } else {
        toast.success("URL 소스가 추가되었습니다.");
        queryClient.invalidateQueries({ queryKey: ["sources"] });
        queryClient.invalidateQueries({ queryKey: ["notebooks"] });
        setUrlInput("");
        setMode("main");
        onClose();
      }
    } finally {
      setIsUploading(false);
    }
  };

  const handleAddText = async () => {
    if (!textContent.trim()) return;

    try {
      await addTextSource.mutateAsync({
        notebookId,
        title: textTitle.trim() || "복사된 텍스트",
        content: textContent.trim(),
      });
      toast.success("텍스트 소스가 추가되었습니다.");
      setTextTitle("");
      setTextContent("");
      setMode("main");
      onClose();
    } catch {
      toast.error("텍스트 소스 추가 실패");
    }
  };

  const handleClose = () => {
    setMode("main");
    setUrlInput("");
    setTextTitle("");
    setTextContent("");
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[560px]">
        <DialogHeader>
          <DialogTitle className="text-base font-semibold text-center">
            {mode === "url"
              ? "URL 소스 추가"
              : mode === "text"
              ? "텍스트 소스 추가"
              : "소스를 활용해 AI 콘텐츠 만들기"}
          </DialogTitle>
        </DialogHeader>

        {mode === "main" && (
          <div className="space-y-4">
            {/* File Drop Zone */}
            <div
              {...getRootProps()}
              className={`h-32 border-2 border-dashed rounded-xl flex flex-col items-center justify-center transition-colors ${
                isDragActive
                  ? "border-brand bg-brand-faint"
                  : "border-border-dashed bg-gray-50"
              }`}
            >
              <input {...getInputProps()} />
              {isUploading ? (
                <Loader2 className="w-8 h-8 text-brand animate-spin" />
              ) : (
                <>
                  <FileUp className="w-8 h-8 text-text-muted mb-2" />
                  <p className="text-[15px] font-medium text-text-secondary">
                    또는 파일 드롭
                  </p>
                  <p className="text-[13px] text-text-muted mt-1">
                    PDF, 이미지, 문서, 오디오 등
                  </p>
                </>
              )}
            </div>

            {/* Source Type Buttons */}
            <div className="flex gap-2">
              <button
                onClick={() => {
                  const input = document.createElement("input");
                  input.type = "file";
                  input.multiple = true;
                  input.accept = ".pdf,.txt,.md,.csv,.png,.jpg,.jpeg,.gif,.webp,.mp3,.wav,.m4a,.ogg";
                  input.onchange = (e) => {
                    const files = (e.target as HTMLInputElement).files;
                    if (files) onDrop(Array.from(files));
                  };
                  input.click();
                }}
                className="flex-1 h-9 flex items-center justify-center gap-1.5 border border-border-default rounded-lg text-[13px] text-text-secondary hover:bg-gray-50 cursor-pointer"
              >
                <Upload className="w-4 h-4" />
                파일 업로드
              </button>
              <button
                onClick={() => setMode("url")}
                className="flex-1 h-9 flex items-center justify-center gap-1.5 border border-border-default rounded-lg text-[13px] text-text-secondary hover:bg-gray-50 cursor-pointer"
              >
                <Globe className="w-4 h-4" />
                웹사이트
              </button>
              <button
                disabled
                className="flex-1 h-9 flex items-center justify-center gap-1.5 border border-border-default rounded-lg text-[13px] text-text-muted cursor-not-allowed opacity-50"
              >
                <FolderOpen className="w-4 h-4" />
                Drive
              </button>
              <button
                onClick={() => setMode("text")}
                className="flex-1 h-9 flex items-center justify-center gap-1.5 border border-border-default rounded-lg text-[13px] text-text-secondary hover:bg-gray-50 cursor-pointer"
              >
                <ClipboardPaste className="w-4 h-4" />
                복사된 텍스트
              </button>
            </div>

            {/* Counter */}
            <p className="text-xs text-text-muted text-right">
              {sourceCount}/300
            </p>
          </div>
        )}

        {mode === "url" && (
          <div className="space-y-4">
            <div className="flex gap-2">
              <Input
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                placeholder="https://example.com"
                className="flex-1"
                onKeyDown={(e) => e.key === "Enter" && handleAddUrl()}
              />
              <Button
                onClick={handleAddUrl}
                disabled={!urlInput.trim() || isUploading}
                className="bg-brand hover:bg-brand-hover"
              >
                {isUploading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  "추가"
                )}
              </Button>
            </div>
            <Button variant="ghost" size="sm" onClick={() => setMode("main")}>
              뒤로
            </Button>
          </div>
        )}

        {mode === "text" && (
          <div className="space-y-4">
            <Input
              value={textTitle}
              onChange={(e) => setTextTitle(e.target.value)}
              placeholder="소스 제목 (선택)"
            />
            <Textarea
              value={textContent}
              onChange={(e) => setTextContent(e.target.value)}
              placeholder="텍스트를 붙여넣으세요..."
              className="min-h-[120px]"
            />
            <div className="flex justify-between">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setMode("main")}
              >
                뒤로
              </Button>
              <Button
                onClick={handleAddText}
                disabled={!textContent.trim() || addTextSource.isPending}
                className="bg-brand hover:bg-brand-hover"
              >
                {addTextSource.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  "추가"
                )}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
