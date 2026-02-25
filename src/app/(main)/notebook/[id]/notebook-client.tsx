"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { FileText, MessageSquare, Sparkles } from "lucide-react";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import { NotebookNav } from "@/components/shared/notebook-nav";
import { SourcesPanel } from "@/components/sources/sources-panel";
import { ChatPanel } from "@/components/chat/chat-panel";
import { StudioPanel } from "@/components/studio/studio-panel";
import { ShareModal } from "@/components/shared/share-modal";
import { useUpdateNotebook } from "@/hooks/use-notebooks";
import { useSources } from "@/hooks/use-sources";
import { cn } from "@/lib/utils";
import type { Notebook } from "@/lib/supabase/types";
import { toast } from "sonner";

interface NotebookClientProps {
  notebook: Notebook;
  user: {
    display_name: string | null;
    email: string;
    avatar_url: string | null;
    role?: "user" | "admin";
  };
}

const MOBILE_TABS = [
  { id: "sources", label: "소스", icon: FileText },
  { id: "chat", label: "채팅", icon: MessageSquare },
  { id: "studio", label: "스튜디오", icon: Sparkles },
] as const;

type MobileTab = (typeof MOBILE_TABS)[number]["id"];

export function NotebookClient({ notebook, user }: NotebookClientProps) {
  const searchParams = useSearchParams();
  const autoUpload = searchParams.get("upload") === "true";
  const [title, setTitle] = useState(notebook.title);
  const [mobileTab, setMobileTab] = useState<MobileTab>(autoUpload ? "sources" : "chat");
  const [showShareModal, setShowShareModal] = useState(false);
  const [isGeneratingTitle, setIsGeneratingTitle] = useState(false);
  const updateNotebook = useUpdateNotebook();
  const { data: sources } = useSources(notebook.id);
  const sourceCount = sources?.filter((s) => s.processing_status === "completed").length ?? 0;

  const handleTitleChange = async (newTitle: string) => {
    setTitle(newTitle);
    try {
      await updateNotebook.mutateAsync({ id: notebook.id, title: newTitle });
    } catch {
      toast.error("제목 변경에 실패했습니다.");
      setTitle(notebook.title);
    }
  };

  const handleGenerateTitle = async () => {
    setIsGeneratingTitle(true);
    try {
      const res = await fetch("/api/notebook/suggest-title", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notebookId: notebook.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      const newTitle = data.title;
      setTitle(newTitle);
      await updateNotebook.mutateAsync({ id: notebook.id, title: newTitle });
      toast.success("제목이 변경되었습니다.");
    } catch {
      toast.error("제목 추천에 실패했습니다.");
    } finally {
      setIsGeneratingTitle(false);
    }
  };

  const handleShare = () => {
    setShowShareModal(true);
  };

  return (
    <div className="h-screen flex flex-col bg-white">
      <NotebookNav
        user={user}
        notebookTitle={title}
        onTitleChange={handleTitleChange}
        onShare={handleShare}
        sourceCount={sourceCount}
        onGenerateTitle={handleGenerateTitle}
        isGeneratingTitle={isGeneratingTitle}
      />

      {/* Desktop: 3-panel resizable layout */}
      <div className="hidden md:flex flex-1 min-h-0 overflow-hidden">
        <ResizablePanelGroup orientation="horizontal">
          <ResizablePanel
            defaultSize="20%"
            minSize="15%"
            maxSize="30%"
            className="border-r border-border-default"
          >
            <SourcesPanel notebookId={notebook.id} autoOpenUpload={autoUpload} />
          </ResizablePanel>

          <ResizableHandle withHandle />

          <ResizablePanel defaultSize="50%" minSize="30%">
            <ChatPanel notebookId={notebook.id} notebookTitle={title} sourceCount={sourceCount} />
          </ResizablePanel>

          <ResizableHandle withHandle />

          <ResizablePanel
            defaultSize="30%"
            minSize="18%"
            maxSize="35%"
            className="border-l border-border-default"
          >
            <StudioPanel notebookId={notebook.id} sourceCount={sourceCount} />
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>

      {/* Mobile: tabbed layout */}
      <div className="flex md:hidden flex-1 min-h-0 flex-col">
        <div className="flex-1 min-h-0 overflow-hidden">
          {mobileTab === "sources" && <SourcesPanel notebookId={notebook.id} />}
          {mobileTab === "chat" && <ChatPanel notebookId={notebook.id} notebookTitle={title} sourceCount={sourceCount} />}
          {mobileTab === "studio" && <StudioPanel notebookId={notebook.id} sourceCount={sourceCount} />}
        </div>
        <nav className="flex border-t border-border-default bg-white shrink-0">
          {MOBILE_TABS.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setMobileTab(tab.id)}
                className={cn(
                  "flex-1 flex flex-col items-center gap-0.5 py-2 text-[11px] transition-colors cursor-pointer",
                  mobileTab === tab.id
                    ? "text-brand font-medium"
                    : "text-text-muted"
                )}
              >
                <Icon className="w-5 h-5" />
                {tab.label}
              </button>
            );
          })}
        </nav>
      </div>

      <ShareModal
        open={showShareModal}
        onClose={() => setShowShareModal(false)}
        notebook={notebook}
      />
    </div>
  );
}
