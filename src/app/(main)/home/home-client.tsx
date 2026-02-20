"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { BookOpen } from "lucide-react";
import Link from "next/link";
import { HomeNav } from "@/components/shared/home-nav";
import { NotebookCard } from "@/components/notebook/notebook-card";
import { NewNotebookCard } from "@/components/notebook/new-notebook-card";
import {
  useNotebooks,
  useCreateNotebook,
  useDeleteNotebook,
  useUpdateNotebook,
} from "@/hooks/use-notebooks";

interface HomeClientProps {
  user: {
    display_name: string | null;
    email: string;
    avatar_url: string | null;
  };
}

export function HomeClient({ user }: HomeClientProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("all");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [searchQuery, setSearchQuery] = useState("");

  const { data: notebooks, isLoading } = useNotebooks();
  const createNotebook = useCreateNotebook();
  const deleteNotebook = useDeleteNotebook();
  const updateNotebook = useUpdateNotebook();

  const handleNewNotebook = async () => {
    try {
      const notebook = await createNotebook.mutateAsync(undefined);
      router.push(`/notebook/${notebook.id}`);
    } catch {
      toast.error("노트북 생성에 실패했습니다.");
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteNotebook.mutateAsync(id);
      toast.success("노트북이 삭제되었습니다.");
    } catch {
      toast.error("삭제에 실패했습니다.");
    }
  };

  const handleRename = async (id: string, title: string) => {
    try {
      await updateNotebook.mutateAsync({ id, title });
    } catch {
      toast.error("이름 변경에 실패했습니다.");
    }
  };

  const filteredNotebooks = notebooks
    ?.filter((nb) => {
      if (activeTab === "mine") return !nb.is_shared;
      if (activeTab === "shared") return nb.is_shared;
      return true;
    })
    ?.filter((nb) => {
      if (!searchQuery) return true;
      return nb.title.toLowerCase().includes(searchQuery.toLowerCase());
    });

  return (
    <div className="min-h-screen bg-background text-text-primary">
      <HomeNav
        user={user}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        onNewNotebook={handleNewNotebook}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
      />

      <main className="max-w-[1440px] mx-auto px-6 sm:px-8 py-10 fade-in">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-2xl font-semibold tracking-tight text-text-primary">
            최근 노트북
          </h2>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
            {Array.from({ length: 10 }).map((_, i) => (
              <div
                key={i}
                className="rounded-xl h-[200px] bg-slate-100 animate-pulse ring-1 ring-border-default/50"
              />
            ))}
          </div>
        ) : !filteredNotebooks?.length ? (
          <div className="flex flex-col items-center justify-center mt-20 sm:mt-32 p-12 bg-white/50 backdrop-blur-sm rounded-3xl border border-white/80 shadow-card">
            <div className="relative w-28 h-28 bg-gradient-to-tr from-brand-faint to-card-lavender/50 rounded-full flex items-center justify-center mb-6 shadow-sm group">
              <div className="absolute inset-0 bg-brand/5 rounded-full animate-ping opacity-75" style={{ animationDuration: '3s' }} />
              <BookOpen className="w-12 h-12 text-brand drop-shadow-sm group-hover:scale-110 transition-transform duration-500" />
            </div>
            <h3 className="text-xl font-bold text-text-primary">
              새로운 지식 여정을 시작하세요
            </h3>
            <p className="text-[15px] text-text-muted mt-3 mb-8 text-center max-w-[300px] leading-relaxed">
              PDF나 문서를 업로드하고 AI의 도움을 받아 정보를 학습하고 슬라이드를 만드세요
            </p>
            <button
              onClick={handleNewNotebook}
              className="px-8 py-3.5 bg-brand text-white rounded-full text-sm font-semibold hover:bg-brand-hover shadow-lg shadow-brand/20 hover:shadow-brand/40 hover:-translate-y-1 transition-all cursor-pointer"
            >
              새 노트북 만들기
            </button>
          </div>
        ) : (
          <div
            className={
              viewMode === "grid"
                ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6"
                : "flex flex-col gap-3"
            }
          >
            {viewMode === "grid" && (
              <NewNotebookCard onClick={handleNewNotebook} />
            )}
            {filteredNotebooks.map((notebook) =>
              viewMode === "grid" ? (
                <NotebookCard
                  key={notebook.id}
                  notebook={notebook}
                  onDelete={handleDelete}
                  onRename={handleRename}
                />
              ) : (
                <Link
                  key={notebook.id}
                  href={`/notebook/${notebook.id}`}
                  className="group flex items-center gap-4 h-16 px-5 rounded-2xl bg-white border border-border-default hover:border-brand/30 hover:shadow-card-hover transition-all duration-300"
                >
                  <span className="text-2xl group-hover:scale-110 transition-transform">{notebook.emoji}</span>
                  <span className="text-[15px] font-semibold text-text-primary flex-1 truncate group-hover:text-brand transition-colors">
                    {notebook.title}
                  </span>
                  <div className="flex items-center gap-2 bg-slate-50 px-3 py-1 rounded-full border border-border-default/50">
                    <span className="text-xs font-medium text-text-secondary">
                      소스 {notebook.source_count}
                    </span>
                  </div>
                </Link>
              )
            )}
          </div>
        )}
      </main>
    </div>
  );
}
