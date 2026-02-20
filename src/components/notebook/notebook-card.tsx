"use client";

import { useState } from "react";
import type { Notebook } from "@/lib/supabase/types";
import { formatDistanceToNow } from "date-fns";
import { ko } from "date-fns/locale";
import { MoreVertical, Pencil, Trash2 } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Link from "next/link";

const CARD_COLORS = [
  "bg-card-mint",
  "bg-card-amber",
  "bg-card-lavender",
  "bg-card-sky",
  "bg-card-emerald",
  "bg-card-rose",
];

function getCardColor(id: string) {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = id.charCodeAt(i) + ((hash << 5) - hash);
  }
  return CARD_COLORS[Math.abs(hash) % CARD_COLORS.length];
}

interface NotebookCardProps {
  notebook: Notebook;
  onDelete: (id: string) => void;
  onRename: (id: string, title: string) => void;
}

export function NotebookCard({
  notebook,
  onDelete,
  onRename,
}: NotebookCardProps) {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showRenameDialog, setShowRenameDialog] = useState(false);
  const [renameValue, setRenameValue] = useState(notebook.title);

  const bgColor = getCardColor(notebook.id);
  const timeAgo = formatDistanceToNow(new Date(notebook.updated_at), {
    addSuffix: true,
    locale: ko,
  });

  return (
    <>
      <Link
        href={`/notebook/${notebook.id}`}
        className={`group relative flex flex-col h-[200px] p-6 rounded-2xl ${bgColor} bg-opacity-40 backdrop-blur-md border border-white/60 shadow-sm hover:shadow-card-hover hover:-translate-y-1.5 transition-all duration-400 ease-out overflow-hidden`}
      >
        {/* Decorative background glow */}
        <div className="absolute -top-10 -right-10 w-32 h-32 bg-white/40 rounded-full blur-2xl group-hover:bg-white/60 transition-colors" />
        {/* Menu */}
        <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-10">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                onClick={(e) => e.preventDefault()}
                className="p-2 rounded-full bg-white/50 hover:bg-white/80 backdrop-blur-sm text-text-tertiary hover:text-text-primary shadow-sm ring-1 ring-black/5 transition-all cursor-pointer"
              >
                <MoreVertical className="w-4 h-4" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onClick={(e) => {
                  e.preventDefault();
                  setRenameValue(notebook.title);
                  setShowRenameDialog(true);
                }}
                className="cursor-pointer"
              >
                <Pencil className="w-4 h-4 mr-2" />
                이름 변경
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={(e) => {
                  e.preventDefault();
                  setShowDeleteDialog(true);
                }}
                className="cursor-pointer text-error"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                삭제
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Emoji Container */}
        <div className="w-14 h-14 bg-white/60 rounded-2xl flex items-center justify-center shadow-sm border border-white/80 group-hover:scale-110 group-hover:rotate-3 transition-transform duration-300">
          <span className="text-[28px] leading-none drop-shadow-sm">{notebook.emoji}</span>
        </div>

        <div className="flex-1" />

        {/* Content Group */}
        <div className="mt-4 relative z-10">
          <h3 className="text-lg font-bold text-text-primary line-clamp-2 leading-snug group-hover:text-brand transition-colors">
            {notebook.title}
          </h3>

          <div className="flex items-center gap-2 mt-3 text-[13px] font-medium text-text-muted">
            <span className="bg-white/60 px-2 py-0.5 rounded-md border border-white/40 backdrop-blur-sm shadow-sm">
              소스 {notebook.source_count}
            </span>
            <span className="text-text-tertiary/40">•</span>
            <span>{timeAgo}</span>
          </div>
        </div>
      </Link>

      {/* Delete Confirmation */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>노트북 삭제</AlertDialogTitle>
            <AlertDialogDescription>
              &ldquo;{notebook.title}&rdquo; 노트북을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => onDelete(notebook.id)}
              className="bg-error hover:bg-red-700"
            >
              삭제
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Rename Dialog */}
      <Dialog open={showRenameDialog} onOpenChange={setShowRenameDialog}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>노트북 이름 변경</DialogTitle>
          </DialogHeader>
          <Input
            value={renameValue}
            onChange={(e) => setRenameValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && renameValue.trim()) {
                onRename(notebook.id, renameValue.trim());
                setShowRenameDialog(false);
              }
            }}
            placeholder="노트북 이름"
            autoFocus
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRenameDialog(false)}>
              취소
            </Button>
            <Button
              onClick={() => {
                if (renameValue.trim()) {
                  onRename(notebook.id, renameValue.trim());
                  setShowRenameDialog(false);
                }
              }}
              className="bg-brand hover:bg-brand-hover"
            >
              변경
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
