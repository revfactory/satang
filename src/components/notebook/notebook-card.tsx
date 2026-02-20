"use client";

import { useState } from "react";
import type { Notebook } from "@/lib/supabase/types";
import { formatDistanceToNow, format } from "date-fns";
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

const CARD_THEMES = [
  {
    bg: "bg-gradient-to-br from-[#7BC67E] to-[#F6E27A]", // 메로나 (연초록→바닐라)
    borderGlow: "group-hover:ring-[#7BC67E]/40",
    shadowGlow: "hover:shadow-[#7BC67E]/25",
  },
  {
    bg: "bg-gradient-to-br from-[#F4A7BB] to-[#FDDDE6]", // 딸기우유 (딸기핑크→크림)
    borderGlow: "group-hover:ring-[#F4A7BB]/40",
    shadowGlow: "hover:shadow-[#F4A7BB]/25",
  },
  {
    bg: "bg-gradient-to-br from-[#FDE68A] to-[#FCA5A5]", // 레몬에이드 (레몬→피치)
    borderGlow: "group-hover:ring-[#FDE68A]/40",
    shadowGlow: "hover:shadow-[#FDE68A]/25",
  },
  {
    bg: "bg-gradient-to-br from-[#A78BFA] to-[#F0ABFC]", // 포도캔디 (라벤더→라일락)
    borderGlow: "group-hover:ring-[#A78BFA]/40",
    shadowGlow: "hover:shadow-[#A78BFA]/25",
  },
  {
    bg: "bg-gradient-to-br from-[#93C5FD] to-[#C4B5FD]", // 소다캔디 (스카이→퍼플)
    borderGlow: "group-hover:ring-[#93C5FD]/40",
    shadowGlow: "hover:shadow-[#93C5FD]/25",
  },
  {
    bg: "bg-gradient-to-br from-[#FDBA74] to-[#FCA5A5]", // 살구젤리 (살구→코랄)
    borderGlow: "group-hover:ring-[#FDBA74]/40",
    shadowGlow: "hover:shadow-[#FDBA74]/25",
  },
];

function getCardTheme(id: string) {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = id.charCodeAt(i) + ((hash << 5) - hash);
  }
  return CARD_THEMES[Math.abs(hash) % CARD_THEMES.length];
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

  const theme = getCardTheme(notebook.id);
  const timeAgo = formatDistanceToNow(new Date(notebook.updated_at), {
    addSuffix: true,
    locale: ko,
  });
  const createdAt = format(new Date(notebook.created_at), 'yyyy.MM.dd');

  return (
    <>
      <Link
        href={`/notebook/${notebook.id}`}
        className={`group relative flex flex-col h-[160px] p-5 rounded-[24px] ${theme.bg} shadow-lg ${theme.shadowGlow} card-glow-hover transition-shadow duration-500 ease-out overflow-hidden cursor-pointer`}
      >
        {/* Shine Sweep Animation on Hover */}
        <div className="absolute inset-0 -translate-x-full group-hover:animate-[shimmer_1.5s_infinite] bg-gradient-to-r from-transparent via-white/20 to-transparent skew-x-12 z-0 pointer-events-none" />

        {/* Decorative inner glow blobs */}
        <div className="absolute -top-12 -right-12 w-40 h-40 bg-white/20 rounded-full blur-3xl group-hover:scale-150 group-hover:bg-white/30 transition-all duration-700 z-0 pointer-events-none" />
        <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-black/15 rounded-full blur-2xl group-hover:scale-150 transition-all duration-700 z-0 pointer-events-none" />

        {/* Border sweep glow */}
        <div className="border-sweep">
          <div className="border-sweep-inner" />
        </div>

        {/* Menu */}
        <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-20">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                onClick={(e) => e.preventDefault()}
                className="p-1.5 rounded-full bg-black/10 hover:bg-black/20 backdrop-blur-md text-gray-700 shadow-sm transition-all cursor-pointer"
              >
                <MoreVertical className="w-[18px] h-[18px]" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="z-50 border-white/20 bg-white/90 backdrop-blur-xl">
              <DropdownMenuItem
                onClick={(e) => {
                  e.preventDefault();
                  setRenameValue(notebook.title);
                  setShowRenameDialog(true);
                }}
                className="cursor-pointer font-medium hover:bg-black/5"
              >
                <Pencil className="w-4 h-4 mr-2" />
                이름 변경
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={(e) => {
                  e.preventDefault();
                  setShowDeleteDialog(true);
                }}
                className="cursor-pointer text-error font-medium hover:bg-red-50 focus:bg-red-50"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                삭제
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="flex-1" />

        {/* Content Group */}
        <div className="relative z-10 w-full">
          <h3 className="text-[17px] font-bold text-gray-900 line-clamp-2 leading-snug transition-all">
            {notebook.title}
          </h3>

          <div className="flex flex-col gap-1.5 mt-3">
            <div className="flex items-center gap-2 text-[12px] font-medium text-gray-700/80 opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-400">
              <span>생성일: {createdAt}</span>
              <span className="ml-auto">{timeAgo}</span>
            </div>
            <div className="flex items-center gap-2 text-[12px] font-semibold text-gray-800 mt-1">
              <span className="bg-white/50 backdrop-blur-md px-2.5 py-1 rounded-lg border border-white/60 shadow-sm">
                소스 {notebook.source_count}개
              </span>
            </div>
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
