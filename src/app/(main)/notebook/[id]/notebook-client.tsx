"use client";

import { useState } from "react";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import { NotebookNav } from "@/components/shared/notebook-nav";
import { SourcesPanel } from "@/components/sources/sources-panel";
import { ChatPanel } from "@/components/chat/chat-panel";
import { StudioPanel } from "@/components/studio/studio-panel";
import { useUpdateNotebook } from "@/hooks/use-notebooks";
import type { Notebook } from "@/lib/supabase/types";
import { toast } from "sonner";

interface NotebookClientProps {
  notebook: Notebook;
  user: {
    display_name: string | null;
    email: string;
    avatar_url: string | null;
  };
}

export function NotebookClient({ notebook, user }: NotebookClientProps) {
  const [title, setTitle] = useState(notebook.title);
  const updateNotebook = useUpdateNotebook();

  const handleTitleChange = async (newTitle: string) => {
    setTitle(newTitle);
    try {
      await updateNotebook.mutateAsync({ id: notebook.id, title: newTitle });
    } catch {
      toast.error("제목 변경에 실패했습니다.");
      setTitle(notebook.title);
    }
  };

  const handleShare = () => {
    toast.info("공유 기능은 곧 제공될 예정입니다.");
  };

  return (
    <div className="h-screen flex flex-col bg-white">
      <NotebookNav
        user={user}
        notebookTitle={title}
        onTitleChange={handleTitleChange}
        onShare={handleShare}
      />

      <div className="flex-1 min-h-0 overflow-hidden">
        <ResizablePanelGroup orientation="horizontal">
          {/* Sources Panel */}
          <ResizablePanel
            defaultSize="20%"
            minSize="15%"
            maxSize="30%"
            className="border-r border-border-default"
          >
            <SourcesPanel notebookId={notebook.id} />
          </ResizablePanel>

          <ResizableHandle withHandle />

          {/* Chat Panel */}
          <ResizablePanel defaultSize="50%" minSize="30%">
            <ChatPanel notebookId={notebook.id} notebookTitle={title} />
          </ResizablePanel>

          <ResizableHandle withHandle />

          {/* Studio Panel */}
          <ResizablePanel
            defaultSize="30%"
            minSize="18%"
            maxSize="35%"
            className="border-l border-border-default"
          >
            <StudioPanel notebookId={notebook.id} />
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>
    </div>
  );
}
