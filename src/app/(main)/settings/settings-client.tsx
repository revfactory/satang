"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { BookOpen, ArrowLeft, LogOut, Plus, Pencil, Trash2 } from "lucide-react";
import Link from "next/link";
import {
  useDesignThemes,
  useDeleteDesignTheme,
} from "@/hooks/use-design-themes";
import { ThemeEditorDialog } from "@/components/settings/theme-editor-dialog";
import type { DesignThemeRow } from "@/lib/supabase/types";
import { toast } from "sonner";

interface SettingsClientProps {
  user: {
    display_name: string | null;
    email: string;
    avatar_url: string | null;
  };
}

export function SettingsClient({ user }: SettingsClientProps) {
  const router = useRouter();
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingTheme, setEditingTheme] = useState<DesignThemeRow | null>(null);

  const { data: themes, isLoading: themesLoading } = useDesignThemes();
  const deleteTheme = useDeleteDesignTheme();

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
  };

  const handleEditTheme = (theme: DesignThemeRow) => {
    setEditingTheme(theme);
    setEditorOpen(true);
  };

  const handleNewTheme = () => {
    setEditingTheme(null);
    setEditorOpen(true);
  };

  const handleDeleteTheme = async (theme: DesignThemeRow) => {
    try {
      await deleteTheme.mutateAsync(theme.id);
      toast.success("테마가 삭제되었습니다.");
    } catch {
      toast.error("테마 삭제 실패");
    }
  };

  const initials = (user.display_name || user.email)
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="h-14 border-b border-border-default flex items-center px-4 gap-3">
        <Link
          href="/home"
          className="p-1.5 rounded-md hover:bg-gray-50 text-text-tertiary"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 bg-brand rounded flex items-center justify-center">
            <BookOpen className="w-3.5 h-3.5 text-white" />
          </div>
          <span className="text-[15px] font-semibold text-text-primary">
            설정
          </span>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-[640px] mx-auto px-6 py-8">
        {/* Profile */}
        <section className="mb-8">
          <h2 className="text-lg font-semibold text-text-primary mb-4">
            프로필
          </h2>
          <div className="flex items-center gap-4">
            <Avatar className="w-16 h-16">
              <AvatarImage src={user.avatar_url || undefined} />
              <AvatarFallback className="text-lg bg-brand-light text-brand">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="text-base font-medium text-text-primary">
                {user.display_name}
              </p>
              <p className="text-sm text-text-tertiary">{user.email}</p>
            </div>
          </div>
        </section>

        <Separator />

        {/* Design Themes */}
        <section className="my-8">
          <h2 className="text-lg font-semibold text-text-primary mb-4">
            디자인 테마
          </h2>
          <p className="text-sm text-text-tertiary mb-4">
            자주 사용하는 디자인 테마를 저장해두고 슬라이드/인포그래픽 생성 시 선택할 수 있습니다.
          </p>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {/* New theme card */}
            <button
              onClick={handleNewTheme}
              className="h-[120px] rounded-xl border-2 border-dashed border-border-default hover:border-brand hover:bg-brand-faint transition-all cursor-pointer flex flex-col items-center justify-center gap-2"
            >
              <Plus className="w-5 h-5 text-text-tertiary" />
              <span className="text-xs font-medium text-text-tertiary">
                새 테마
              </span>
            </button>

            {/* Existing themes */}
            {themesLoading
              ? Array.from({ length: 2 }).map((_, i) => (
                  <div
                    key={i}
                    className="h-[120px] rounded-xl border border-border-default bg-gray-50 animate-pulse"
                  />
                ))
              : themes?.map((theme) => (
                  <div
                    key={theme.id}
                    className="group h-[120px] rounded-xl overflow-hidden relative cursor-pointer border border-transparent hover:border-brand transition-all"
                    onClick={() => handleEditTheme(theme)}
                  >
                    <div
                      className="absolute inset-0"
                      style={{ backgroundColor: theme.primary_color }}
                    >
                      <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-black/20" />
                      {/* Mini slide layout mockup */}
                      <div className="absolute top-3 left-3 right-3">
                        <div className="h-1.5 w-12 bg-white/60 rounded-full mb-1.5" />
                        <div className="h-1 w-16 bg-white/30 rounded-full mb-1" />
                        <div className="h-1 w-10 bg-white/20 rounded-full" />
                      </div>
                      <div className="absolute bottom-8 left-3 right-3 flex gap-1.5">
                        <div className="h-3 flex-1 bg-white/15 rounded-sm" />
                        <div className="h-3 flex-1 bg-white/15 rounded-sm" />
                        <div className="h-3 flex-1 bg-white/15 rounded-sm" />
                      </div>
                    </div>

                    {/* Name label */}
                    <div className="absolute bottom-0 left-0 right-0 bg-black/50 px-3 py-1.5">
                      <span className="text-xs text-white font-medium truncate block">
                        {theme.name}
                      </span>
                    </div>

                    {/* Hover actions */}
                    <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEditTheme(theme);
                        }}
                        className="w-6 h-6 rounded-md bg-white/90 hover:bg-white flex items-center justify-center"
                      >
                        <Pencil className="w-3 h-3 text-gray-700" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteTheme(theme);
                        }}
                        className="w-6 h-6 rounded-md bg-white/90 hover:bg-white flex items-center justify-center"
                      >
                        <Trash2 className="w-3 h-3 text-red-500" />
                      </button>
                    </div>
                  </div>
                ))}
          </div>
        </section>

        <Separator />

        {/* Account */}
        <section className="my-8">
          <h2 className="text-lg font-semibold text-text-primary mb-4">
            계정
          </h2>
          <Button
            variant="outline"
            onClick={handleSignOut}
            className="text-error border-error/30 hover:bg-error/5"
          >
            <LogOut className="w-4 h-4 mr-2" />
            로그아웃
          </Button>
        </section>
      </main>

      <ThemeEditorDialog
        open={editorOpen}
        onClose={() => setEditorOpen(false)}
        theme={editingTheme}
      />
    </div>
  );
}
