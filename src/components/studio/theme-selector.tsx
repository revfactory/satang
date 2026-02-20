"use client";

import { useState } from "react";
import { useDesignThemes } from "@/hooks/use-design-themes";
import { cn } from "@/lib/utils";
import { Sparkles, Palette, Plus, Pencil } from "lucide-react";
import { ThemeEditorDialog } from "@/components/settings/theme-editor-dialog";
import type { DesignThemeRow } from "@/lib/supabase/types";

interface ThemeSelectorProps {
  selectedThemeId: string | null;
  onSelect: (themeId: string | null) => void;
}

export function ThemeSelector({
  selectedThemeId,
  onSelect,
}: ThemeSelectorProps) {
  const { data: themes, isLoading } = useDesignThemes();
  const [showEditor, setShowEditor] = useState(false);
  const [editingTheme, setEditingTheme] = useState<DesignThemeRow | null>(null);

  return (
    <div className="overflow-hidden">
      <label className="text-[13px] font-medium text-text-secondary block mb-2">
        디자인 테마
      </label>
      <div className="flex flex-nowrap gap-2 overflow-x-auto pb-2">
        {/* Auto option */}
        <button
          onClick={() => onSelect(null)}
          className={cn(
            "flex-shrink-0 w-[100px] h-[68px] rounded-lg border-2 transition-all cursor-pointer flex flex-col items-center justify-center gap-1",
            selectedThemeId === null
              ? "border-brand bg-brand-faint"
              : "border-border-default hover:bg-gray-50"
          )}
        >
          <Sparkles
            className={cn(
              "w-4 h-4",
              selectedThemeId === null ? "text-brand" : "text-text-tertiary"
            )}
          />
          <span
            className={cn(
              "text-xs font-medium",
              selectedThemeId === null ? "text-brand" : "text-text-secondary"
            )}
          >
            자동
          </span>
        </button>

        {/* Theme cards */}
        {isLoading ? (
          <div className="flex-shrink-0 w-[100px] h-[68px] rounded-lg border border-border-default bg-gray-50 animate-pulse" />
        ) : (
          themes?.map((theme) => (
            <div key={theme.id} className="relative flex-shrink-0 group/theme">
              <button
                onClick={() => onSelect(theme.id)}
                className={cn(
                  "w-[100px] h-[68px] rounded-lg border-2 transition-all cursor-pointer overflow-hidden relative",
                  selectedThemeId === theme.id
                    ? "border-brand"
                    : "border-border-default hover:border-gray-300"
                )}
              >
                {theme.thumbnail_url ? (
                  <>
                    <img
                      src={theme.thumbnail_url}
                      alt={theme.name}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent px-1.5 py-0.5">
                      <span className="text-[10px] text-white font-medium truncate block">
                        {theme.name}
                      </span>
                    </div>
                  </>
                ) : (
                  <div className="flex flex-col items-center justify-center h-full px-2 gap-1 bg-gray-50">
                    <Palette
                      className={cn(
                        "w-4 h-4",
                        selectedThemeId === theme.id
                          ? "text-brand"
                          : "text-text-tertiary"
                      )}
                    />
                    <span className="text-[10px] font-medium text-text-primary truncate w-full text-center">
                      {theme.name}
                    </span>
                  </div>
                )}
              </button>
              {/* Edit overlay */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setEditingTheme(theme);
                  setShowEditor(true);
                }}
                className="absolute top-1 right-1 p-1 rounded-md bg-black/50 text-white opacity-0 group-hover/theme:opacity-100 transition-opacity cursor-pointer hover:bg-black/70 z-10"
              >
                <Pencil className="w-3 h-3" />
              </button>
            </div>
          ))
        )}

        {/* Add theme button */}
        {!isLoading && (
          <button
            onClick={() => { setEditingTheme(null); setShowEditor(true); }}
            className="flex-shrink-0 w-[100px] h-[68px] rounded-lg border-2 border-dashed border-border-default hover:border-brand hover:bg-brand-faint transition-all cursor-pointer flex flex-col items-center justify-center gap-1"
          >
            <Plus className="w-4 h-4 text-text-tertiary" />
            <span className="text-[10px] font-medium text-text-tertiary">
              테마 추가
            </span>
          </button>
        )}
      </div>

      <ThemeEditorDialog
        open={showEditor}
        onClose={() => { setShowEditor(false); setEditingTheme(null); }}
        theme={editingTheme}
      />
    </div>
  );
}
