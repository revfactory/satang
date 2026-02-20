"use client";

import { useState } from "react";
import { Plus, Search, FileText, Link2, Youtube, Type, Image, Music, Loader2, AlertCircle, CheckCircle2, X } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useSources, useToggleSource, useToggleAllSources, useDeleteSource } from "@/hooks/use-sources";
import { SourceAddModal } from "./source-add-modal";
import { SourceDetailModal } from "./source-detail-modal";
import type { Source, SourceType } from "@/lib/supabase/types";

const SOURCE_ICONS: Record<SourceType, React.ReactNode> = {
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

function StatusIcon({ status }: { status: string }) {
  switch (status) {
    case "processing":
    case "pending":
      return <Loader2 className="w-4 h-4 text-brand animate-spin" />;
    case "failed":
      return <AlertCircle className="w-4 h-4 text-error" />;
    case "completed":
      return <CheckCircle2 className="w-4 h-4 text-success" />;
    default:
      return null;
  }
}

interface SourcesPanelProps {
  notebookId: string;
  autoOpenUpload?: boolean;
}

export function SourcesPanel({ notebookId, autoOpenUpload }: SourcesPanelProps) {
  const [showAddModal, setShowAddModal] = useState(autoOpenUpload ?? false);
  const [selectedSource, setSelectedSource] = useState<Source | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const { data: sources = [], isLoading } = useSources(notebookId);
  const toggleSource = useToggleSource();
  const toggleAll = useToggleAllSources();

  const filteredSources = searchQuery
    ? sources.filter((s) => s.title.toLowerCase().includes(searchQuery.toLowerCase()))
    : sources;
  const allEnabled = sources.length > 0 && sources.every((s) => s.is_enabled);
  const enabledCount = sources.filter((s) => s.is_enabled).length;

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Header */}
      <div className="p-3 border-b border-border-default">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-text-primary">출처</h3>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="w-full h-9 flex items-center justify-center gap-1.5 border border-dashed border-border-dashed rounded-lg text-[13px] text-text-tertiary hover:border-brand hover:text-brand transition-colors cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          소스 추가
        </button>
        {sources.length > 0 && (
          <div className="relative mt-2">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-muted" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="소스 검색..."
              className="w-full h-8 pl-8 pr-8 text-[13px] rounded-md border border-border-default focus:border-brand focus:ring-1 focus:ring-brand/20 outline-none transition-colors"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 rounded hover:bg-gray-100 cursor-pointer"
              >
                <X className="w-3 h-3 text-text-muted" />
              </button>
            )}
          </div>
        )}
      </div>

      {/* Source List */}
      <ScrollArea className="flex-1">
        {isLoading ? (
          <div className="p-4 space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-9 bg-gray-100 rounded animate-pulse" />
            ))}
          </div>
        ) : sources.length === 0 ? (
          <div className="p-6 text-center">
            <p className="text-[13px] text-text-muted">
              소스를 추가하여 시작하세요
            </p>
          </div>
        ) : (
          <div className="p-2">
            {/* Select All */}
            <label className="flex items-center gap-2 px-2 py-1.5 mb-1 cursor-pointer">
              <Checkbox
                checked={allEnabled}
                onCheckedChange={(checked) =>
                  toggleAll.mutate({
                    notebookId,
                    is_enabled: !!checked,
                  })
                }
              />
              <span className="text-[13px] text-text-secondary">
                모든 소스 선택
              </span>
            </label>

            {/* Sources */}
            {filteredSources.map((source) => (
              <div
                key={source.id}
                className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-gray-50 group cursor-pointer min-w-0"
                onClick={() => setSelectedSource(source)}
              >
                {source.processing_status === "completed" ? (
                  SOURCE_ICONS[source.type]
                ) : (
                  <StatusIcon status={source.processing_status} />
                )}
                <span className="text-[13px] text-text-primary truncate flex-1 w-0">
                  {source.title}
                </span>
                <Checkbox
                  checked={source.is_enabled}
                  onCheckedChange={(checked) =>
                    toggleSource.mutate({
                      id: source.id,
                      is_enabled: !!checked,
                    })
                  }
                  onClick={(e) => e.stopPropagation()}
                />
              </div>
            ))}
          </div>
        )}
      </ScrollArea>

      {/* Source Add Modal */}
      <SourceAddModal
        open={showAddModal}
        onClose={() => setShowAddModal(false)}
        notebookId={notebookId}
        sourceCount={sources.length}
      />

      {/* Source Detail Modal */}
      <SourceDetailModal
        source={selectedSource}
        onClose={() => setSelectedSource(null)}
      />
    </div>
  );
}
