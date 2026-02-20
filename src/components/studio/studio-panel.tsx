"use client";

import { useState } from "react";
import {
  Headphones, Video, Brain, FileText, CreditCard, HelpCircle,
  BarChart3, Presentation, Table, Pencil, MoreVertical, Trash2,
  Loader2, StickyNote, Image, AlertCircle, RefreshCw, Pin, X, Plus,
} from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
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
import { useStudioOutputs, useDeleteStudioOutput, useRetryStudioOutput } from "@/hooks/use-studio";
import { useNotes, useAddNote, useDeleteNote, useTogglePin } from "@/hooks/use-notes";
import { InfographicModal } from "./infographic-modal";
import { SlideModal } from "./slide-modal";
import { MindMapModal } from "./mindmap-modal";
import { ReportModal } from "./report-modal";
import { FlashcardModal } from "./flashcard-modal";
import { QuizModal } from "./quiz-modal";
import { ContentViewer } from "./content-viewer";
import { toast } from "sonner";
import type { StudioOutput } from "@/lib/supabase/types";
import { formatDistanceToNow } from "date-fns";
import { ko } from "date-fns/locale";

const STUDIO_TILES = [
  { type: "mind_map", label: "마인드맵", icon: Brain, gradient: "from-[#A78BFA] to-[#F0ABFC]", enabled: true },        // 포도캔디
  { type: "report", label: "보고서", icon: FileText, gradient: "from-[#F4A7BB] to-[#FDDDE6]", enabled: true },          // 딸기우유
  { type: "flashcard", label: "플래시카드", icon: CreditCard, gradient: "from-[#7BC67E] to-[#F6E27A]", enabled: true },  // 메로나
  { type: "quiz", label: "퀴즈", icon: HelpCircle, gradient: "from-[#93C5FD] to-[#C4B5FD]", enabled: true },            // 소다캔디
  { type: "infographic", label: "인포그래픽", icon: BarChart3, gradient: "from-[#FDE68A] to-[#FCA5A5]", enabled: true }, // 레몬에이드
  { type: "slide_deck", label: "슬라이드 자료", icon: Presentation, gradient: "from-[#FDBA74] to-[#FCA5A5]", enabled: true }, // 살구젤리
  { type: "audio_overview", label: "AI 오디오 오버뷰", icon: Headphones, gradient: "from-[#D1D5DB] to-[#E5E7EB]", enabled: false },
  { type: "video_overview", label: "동영상 개요", icon: Video, gradient: "from-[#D1D5DB] to-[#E5E7EB]", enabled: false },
  { type: "data_table", label: "데이터 표", icon: Table, gradient: "from-[#D1D5DB] to-[#E5E7EB]", enabled: false, fullWidth: true },
] as const;

const OUTPUT_ICONS: Record<string, React.ReactNode> = {
  infographic: <BarChart3 className="w-4 h-4 text-amber-600" />,
  slide_deck: <Presentation className="w-4 h-4 text-amber-600" />,
  audio_overview: <Headphones className="w-4 h-4 text-blue-600" />,
  mind_map: <Brain className="w-4 h-4 text-rose-600" />,
  report: <FileText className="w-4 h-4 text-rose-600" />,
  flashcard: <CreditCard className="w-4 h-4 text-emerald-600" />,
  quiz: <HelpCircle className="w-4 h-4 text-emerald-600" />,
};

interface StudioPanelProps {
  notebookId: string;
}

export function StudioPanel({ notebookId }: StudioPanelProps) {
  const [showInfographicModal, setShowInfographicModal] = useState(false);
  const [showSlideModal, setShowSlideModal] = useState(false);
  const [showMindMapModal, setShowMindMapModal] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [showFlashcardModal, setShowFlashcardModal] = useState(false);
  const [showQuizModal, setShowQuizModal] = useState(false);
  const [viewingOutputId, setViewingOutputId] = useState<string | null>(null);
  const [deletingOutputId, setDeletingOutputId] = useState<string | null>(null);
  const [noteInput, setNoteInput] = useState("");
  const [showNoteInput, setShowNoteInput] = useState(false);

  const { data: outputs = [] } = useStudioOutputs(notebookId);
  const viewingOutput = outputs.find((o) => o.id === viewingOutputId) || null;
  const deleteOutput = useDeleteStudioOutput();
  const retryOutput = useRetryStudioOutput();

  const { data: notes = [] } = useNotes(notebookId);
  const addNote = useAddNote();
  const deleteNote = useDeleteNote();
  const togglePin = useTogglePin();

  const handleTileClick = (type: string, enabled: boolean) => {
    if (!enabled) {
      toast.info("곧 출시 예정입니다.");
      return;
    }
    if (type === "infographic") setShowInfographicModal(true);
    if (type === "slide_deck") setShowSlideModal(true);
    if (type === "mind_map") setShowMindMapModal(true);
    if (type === "report") setShowReportModal(true);
    if (type === "flashcard") setShowFlashcardModal(true);
    if (type === "quiz") setShowQuizModal(true);
  };

  const handleDeleteOutput = async (id: string) => {
    try {
      await deleteOutput.mutateAsync(id);
      toast.success("삭제되었습니다.");
    } catch {
      toast.error("삭제에 실패했습니다.");
    }
  };

  const handleRetryOutput = async (output: StudioOutput) => {
    try {
      await retryOutput.mutateAsync(output);
      toast.success("재생성을 시작했습니다.");
    } catch {
      toast.error("재생성에 실패했습니다.");
    }
  };

  const isStuck = (output: StudioOutput) => {
    if (output.generation_status !== "generating") return false;
    const elapsed = Date.now() - new Date(output.created_at).getTime();
    return elapsed > 3 * 60 * 1000; // 3분 이상
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="px-3 py-2.5 border-b border-border-default">
        <h3 className="text-sm font-semibold text-text-primary">스튜디오</h3>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-3">
          {/* Tiles Grid */}
          <div className="grid grid-cols-2 gap-2">
            {STUDIO_TILES.map((tile) => {
              const Icon = tile.icon;
              const isFullWidth = "fullWidth" in tile && tile.fullWidth;
              return (
                <div
                  key={tile.type}
                  className={`relative group rounded-xl ${isFullWidth ? "col-span-2" : ""} ${
                    !tile.enabled ? "opacity-50" : ""
                  }`}
                >
                  {/* Rotating border sweep */}
                  {tile.enabled && (
                    <div className="absolute inset-0 rounded-xl overflow-hidden opacity-0 group-hover:opacity-100 transition-opacity duration-400 pointer-events-none z-0">
                      <div className="absolute inset-[-50%] animate-[sweep-rotate_2.5s_linear_infinite] bg-[conic-gradient(from_0deg,transparent_0%,transparent_50%,rgba(255,255,255,0.7)_75%,transparent_95%)]" />
                    </div>
                  )}
                  <button
                    onClick={() => handleTileClick(tile.type, tile.enabled)}
                    className={`relative w-full bg-gradient-to-br ${tile.gradient} rounded-[11px] m-[1px] px-3 py-2.5 flex items-center gap-2 overflow-hidden transition-all duration-300 ${
                      tile.enabled
                        ? "card-glow-hover hover:shadow-lg cursor-pointer"
                        : "cursor-not-allowed"
                    }`}
                  >
                    {/* Shimmer glow blob */}
                    {tile.enabled && (
                      <div className="absolute -top-3 -right-3 w-12 h-12 bg-white/20 rounded-full blur-2xl transition-transform duration-500 group-hover:scale-150" />
                    )}
                    <Icon className="w-4 h-4 text-gray-700 shrink-0 relative z-10" />
                    <span className="text-xs font-medium text-gray-800 truncate relative z-10">
                      {tile.label}
                    </span>
                    {tile.enabled && (
                      <Pencil className="w-3 h-3 text-gray-500 opacity-0 group-hover:opacity-100 transition-opacity ml-auto shrink-0 relative z-10" />
                    )}
                  </button>
                </div>
              );
            })}
          </div>

          {/* Generated Content */}
          {outputs.length > 0 && (
            <>
              <div className="my-4 border-t border-border-default" />
              <div className="space-y-1">
                {outputs.map((output) => (
                  <div
                    key={output.id}
                    className="flex items-center gap-2 px-2 py-2 rounded-md hover:bg-gray-50 group cursor-pointer"
                    onClick={() => setViewingOutputId(output.id)}
                  >
                    {OUTPUT_ICONS[output.type] || (
                      <Image className="w-4 h-4 text-text-muted" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-medium text-text-primary truncate">
                        {output.title}
                      </p>
                      {output.generation_status === "failed" || isStuck(output) ? (
                        <p className="text-[11px] text-error truncate">
                          {output.error_message || (isStuck(output) ? "시간 초과로 생성이 중단되었습니다" : "생성에 실패했습니다")}
                        </p>
                      ) : (
                        <p className="text-[11px] text-text-muted">
                          {output.source_ids?.length || 0}개 소스
                          {" · "}
                          {formatDistanceToNow(new Date(output.created_at), {
                            addSuffix: true,
                            locale: ko,
                          })}
                        </p>
                      )}
                    </div>

                    {output.generation_status === "generating" && !isStuck(output) ? (
                      <div className="flex items-center gap-1.5">
                        <Loader2 className="w-4 h-4 text-brand animate-spin shrink-0" />
                        {(() => {
                          const progress = (output.content as Record<string, unknown>)?.progress as
                            { completed?: number; total?: number } | undefined;
                          if (progress?.total) {
                            return (
                              <span className="text-[11px] text-text-muted whitespace-nowrap">
                                {progress.completed || 0}/{progress.total}
                              </span>
                            );
                          }
                          return null;
                        })()}
                      </div>
                    ) : output.generation_status === "failed" || isStuck(output) ? (
                      <div className="flex items-center gap-1">
                        <AlertCircle className="w-4 h-4 text-error shrink-0" />
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button
                              onClick={(e) => e.stopPropagation()}
                              className="p-1 rounded hover:bg-gray-100 cursor-pointer"
                            >
                              <MoreVertical className="w-3.5 h-3.5 text-text-muted" />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={(e) => {
                                e.stopPropagation();
                                handleRetryOutput(output);
                              }}
                              className="cursor-pointer"
                            >
                              <RefreshCw className="w-4 h-4 mr-2" />
                              재생성
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={(e) => {
                                e.stopPropagation();
                                setDeletingOutputId(output.id);
                              }}
                              className="text-error cursor-pointer"
                            >
                              <Trash2 className="w-4 h-4 mr-2" />
                              삭제
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    ) : (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button
                            onClick={(e) => e.stopPropagation()}
                            className="p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-gray-100 cursor-pointer"
                          >
                            <MoreVertical className="w-3.5 h-3.5 text-text-muted" />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRetryOutput(output);
                            }}
                            className="cursor-pointer"
                          >
                            <RefreshCw className="w-4 h-4 mr-2" />
                            재생성
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={(e) => {
                              e.stopPropagation();
                              setDeletingOutputId(output.id);
                            }}
                            className="text-error cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            삭제
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </div>
                ))}
              </div>
            </>
          )}

          {/* Notes Section */}
          {notes.length > 0 && (
            <>
              <div className="my-4 border-t border-border-default" />
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-xs font-semibold text-text-muted uppercase tracking-wide">메모</h4>
                <span className="text-[11px] text-text-muted">{notes.length}개</span>
              </div>
              <div className="space-y-1">
                {notes.map((note) => (
                  <div
                    key={note.id}
                    className="group flex items-start gap-2 px-2 py-1.5 rounded-md hover:bg-gray-50"
                  >
                    {note.pinned && <Pin className="w-3 h-3 text-brand shrink-0 mt-0.5" />}
                    <p className="flex-1 text-[12px] text-text-secondary line-clamp-2 min-w-0">
                      {note.content}
                    </p>
                    <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 shrink-0">
                      <button
                        onClick={() => togglePin.mutate({ id: note.id, pinned: !note.pinned })}
                        className="p-1 rounded hover:bg-gray-200 cursor-pointer"
                        title={note.pinned ? "고정 해제" : "고정"}
                      >
                        <Pin className={`w-3 h-3 ${note.pinned ? "text-brand" : "text-text-muted"}`} />
                      </button>
                      <button
                        onClick={() => deleteNote.mutate(note.id)}
                        className="p-1 rounded hover:bg-gray-200 cursor-pointer"
                      >
                        <X className="w-3 h-3 text-text-muted" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </ScrollArea>

      {/* Note Input */}
      {showNoteInput && (
        <div className="px-3 pb-3 border-t border-border-default pt-2">
          <textarea
            value={noteInput}
            onChange={(e) => setNoteInput(e.target.value)}
            placeholder="메모를 입력하세요..."
            className="w-full h-16 text-[13px] rounded-md border border-border-default px-2.5 py-2 resize-none focus:border-brand focus:ring-1 focus:ring-brand/20 outline-none"
            autoFocus
          />
          <div className="flex justify-end gap-1.5 mt-1.5">
            <button
              onClick={() => { setShowNoteInput(false); setNoteInput(""); }}
              className="px-2.5 py-1 text-[12px] text-text-muted rounded hover:bg-gray-100 cursor-pointer"
            >
              취소
            </button>
            <button
              onClick={async () => {
                if (!noteInput.trim()) return;
                try {
                  await addNote.mutateAsync({ notebookId, content: noteInput.trim() });
                  setNoteInput("");
                  setShowNoteInput(false);
                  toast.success("메모가 추가되었습니다.");
                } catch {
                  toast.error("메모 추가에 실패했습니다.");
                }
              }}
              disabled={!noteInput.trim() || addNote.isPending}
              className="px-2.5 py-1 text-[12px] text-white bg-brand rounded hover:bg-brand-hover disabled:opacity-50 cursor-pointer"
            >
              {addNote.isPending ? "저장 중..." : "추가"}
            </button>
          </div>
        </div>
      )}

      {/* Bottom Action */}
      <div className="p-3 border-t border-border-default">
        <button
          onClick={() => setShowNoteInput(!showNoteInput)}
          className="w-full h-10 flex items-center justify-center gap-2 bg-gray-50 border border-border-default rounded-lg text-[13px] text-text-secondary hover:bg-gray-100 transition-colors cursor-pointer"
        >
          {showNoteInput ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
          메모 추가
        </button>
      </div>

      {/* Modals */}
      <InfographicModal
        open={showInfographicModal}
        onClose={() => setShowInfographicModal(false)}
        notebookId={notebookId}
      />
      <SlideModal
        open={showSlideModal}
        onClose={() => setShowSlideModal(false)}
        notebookId={notebookId}
      />
      <MindMapModal
        open={showMindMapModal}
        onClose={() => setShowMindMapModal(false)}
        notebookId={notebookId}
      />
      <ReportModal
        open={showReportModal}
        onClose={() => setShowReportModal(false)}
        notebookId={notebookId}
      />
      <FlashcardModal
        open={showFlashcardModal}
        onClose={() => setShowFlashcardModal(false)}
        notebookId={notebookId}
      />
      <QuizModal
        open={showQuizModal}
        onClose={() => setShowQuizModal(false)}
        notebookId={notebookId}
      />

      {/* Content Viewer */}
      {viewingOutput && (
        <ContentViewer
          output={viewingOutput}
          onClose={() => setViewingOutputId(null)}
        />
      )}

      {/* Delete Confirmation */}
      <AlertDialog open={!!deletingOutputId} onOpenChange={(open) => !open && setDeletingOutputId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>콘텐츠 삭제</AlertDialogTitle>
            <AlertDialogDescription>
              이 콘텐츠를 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (deletingOutputId) handleDeleteOutput(deletingOutputId);
                setDeletingOutputId(null);
              }}
              className="bg-error hover:bg-red-700"
            >
              삭제
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
