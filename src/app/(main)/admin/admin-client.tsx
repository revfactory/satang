"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Search, Users, BookOpen, FileText, Palette, Loader2 } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { UserMenu } from "@/components/shared/user-menu";
import {
  useAllUsers,
  useUserNotebooks,
  useUserSources,
  useUserStudioOutputs,
  useAdminStats,
} from "@/hooks/use-admin";
import { cn } from "@/lib/utils";
import type { User } from "@/lib/supabase/types";

interface AdminClientProps {
  user: {
    display_name: string | null;
    email: string;
    avatar_url: string | null;
    role?: "user" | "admin";
  };
}

export function AdminClient({ user }: AdminClientProps) {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [selectedNotebookId, setSelectedNotebookId] = useState<string | null>(null);

  const { data: users, isLoading: usersLoading } = useAllUsers();
  const { data: stats } = useAdminStats();
  const { data: notebooks, isLoading: notebooksLoading } = useUserNotebooks(selectedUserId);
  const { data: sources } = useUserSources(selectedUserId, selectedNotebookId);
  const { data: studioOutputs } = useUserStudioOutputs(selectedUserId, selectedNotebookId);

  const filteredUsers = useMemo(() => {
    if (!users) return [];
    if (!searchQuery.trim()) return users;
    const q = searchQuery.toLowerCase();
    return users.filter(
      (u) =>
        (u.display_name?.toLowerCase().includes(q)) ||
        u.email.toLowerCase().includes(q)
    );
  }, [users, searchQuery]);

  const selectedUser = useMemo(
    () => users?.find((u) => u.id === selectedUserId) ?? null,
    [users, selectedUserId]
  );

  const handleSelectUser = (userId: string) => {
    setSelectedUserId(userId);
    setSelectedNotebookId(null);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("ko-KR", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const getSourceTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      pdf: "PDF",
      text: "텍스트",
      url: "URL",
      youtube: "YouTube",
      google_doc: "Google 문서",
      google_slide: "Google 슬라이드",
      google_sheet: "Google 시트",
      image: "이미지",
      audio: "오디오",
    };
    return labels[type] || type;
  };

  const getOutputTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      audio_overview: "오디오 개요",
      video_overview: "비디오 개요",
      mind_map: "마인드맵",
      report: "보고서",
      flashcard: "플래시카드",
      quiz: "퀴즈",
      infographic: "인포그래픽",
      slide_deck: "슬라이드",
      data_table: "데이터 테이블",
    };
    return labels[type] || type;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-green-100 text-green-700";
      case "processing":
      case "generating":
        return "bg-yellow-100 text-yellow-700";
      case "failed":
        return "bg-red-100 text-red-700";
      default:
        return "bg-gray-100 text-gray-600";
    }
  };

  return (
    <div className="h-screen flex flex-col bg-bg-secondary">
      {/* Header */}
      <header className="sticky top-0 z-50 h-[64px] border-b border-border-default/50 bg-white/70 backdrop-blur-xl flex items-center px-6 gap-4 shrink-0">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.push("/home")}
          className="shrink-0"
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <h1 className="text-lg font-semibold text-text-primary">어드민 대시보드</h1>
        <div className="flex-1" />

        {/* Stats */}
        {stats && (
          <div className="hidden md:flex items-center gap-4">
            <StatCard icon={Users} label="사용자" value={stats.totalUsers} />
            <StatCard icon={BookOpen} label="노트북" value={stats.totalNotebooks} />
            <StatCard icon={FileText} label="소스" value={stats.totalSources} />
          </div>
        )}

        <UserMenu user={user} />
      </header>

      {/* Body */}
      <div className="flex flex-1 min-h-0">
        {/* Left: User List */}
        <div className="w-80 border-r border-border-default/50 bg-white flex flex-col shrink-0">
          <div className="p-3 border-b border-border-default/30">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-tertiary" />
              <Input
                placeholder="사용자 검색..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-9 text-sm"
              />
            </div>
          </div>

          <ScrollArea className="flex-1">
            {usersLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-5 h-5 animate-spin text-text-tertiary" />
              </div>
            ) : filteredUsers.length === 0 ? (
              <div className="text-center py-12 text-sm text-text-tertiary">
                사용자가 없습니다
              </div>
            ) : (
              <div className="p-2">
                {filteredUsers.map((u) => (
                  <UserListItem
                    key={u.id}
                    user={u}
                    isSelected={u.id === selectedUserId}
                    onClick={() => handleSelectUser(u.id)}
                    formatDate={formatDate}
                  />
                ))}
              </div>
            )}
          </ScrollArea>
        </div>

        {/* Right: Detail */}
        <div className="flex-1 min-w-0 overflow-auto">
          {!selectedUser ? (
            <div className="flex items-center justify-center h-full text-text-tertiary text-sm">
              좌측에서 사용자를 선택하세요
            </div>
          ) : (
            <div className="p-6 space-y-6 max-w-4xl">
              {/* Selected User Info */}
              <div className="flex items-center gap-4">
                <Avatar className="w-12 h-12">
                  <AvatarImage src={selectedUser.avatar_url || undefined} />
                  <AvatarFallback className="bg-brand-light text-brand font-medium">
                    {(selectedUser.display_name || selectedUser.email).slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-semibold text-text-primary">
                      {selectedUser.display_name || "이름 없음"}
                    </h2>
                    <span
                      className={cn(
                        "px-2 py-0.5 text-[11px] font-semibold rounded",
                        selectedUser.role === "admin"
                          ? "bg-brand-light text-brand"
                          : "bg-gray-100 text-gray-600"
                      )}
                    >
                      {selectedUser.role === "admin" ? "어드민" : "사용자"}
                    </span>
                  </div>
                  <p className="text-sm text-text-secondary">{selectedUser.email}</p>
                  <p className="text-xs text-text-tertiary">
                    가입일: {formatDate(selectedUser.created_at)}
                  </p>
                </div>
              </div>

              {/* Notebooks */}
              <section>
                <h3 className="text-sm font-semibold text-text-primary mb-3 flex items-center gap-2">
                  <BookOpen className="w-4 h-4" />
                  노트북 ({notebooks?.length ?? 0})
                </h3>

                {notebooksLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-5 h-5 animate-spin text-text-tertiary" />
                  </div>
                ) : !notebooks?.length ? (
                  <p className="text-sm text-text-tertiary py-4">노트북이 없습니다</p>
                ) : (
                  <div className="space-y-2">
                    {notebooks.map((nb) => (
                      <button
                        key={nb.id}
                        onClick={() =>
                          setSelectedNotebookId(
                            selectedNotebookId === nb.id ? null : nb.id
                          )
                        }
                        className={cn(
                          "w-full text-left px-4 py-3 rounded-lg border transition-colors",
                          selectedNotebookId === nb.id
                            ? "border-brand bg-brand-light/30"
                            : "border-border-default/50 bg-white hover:border-border-hover"
                        )}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="text-base">{nb.emoji}</span>
                            <span className="text-sm font-medium text-text-primary truncate">
                              {nb.title}
                            </span>
                          </div>
                          <div className="flex items-center gap-3 shrink-0 text-xs text-text-tertiary">
                            <span>소스 {nb.source_count}개</span>
                            <span>{formatDate(nb.updated_at)}</span>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </section>

              {/* Sources & Studio Outputs (when notebook selected) */}
              {selectedNotebookId && (
                <>
                  {/* Sources */}
                  <section>
                    <h3 className="text-sm font-semibold text-text-primary mb-3 flex items-center gap-2">
                      <FileText className="w-4 h-4" />
                      소스 ({sources?.length ?? 0})
                    </h3>
                    {!sources?.length ? (
                      <p className="text-sm text-text-tertiary py-2">소스가 없습니다</p>
                    ) : (
                      <div className="space-y-1.5">
                        {sources.map((s) => (
                          <div
                            key={s.id}
                            className="flex items-center justify-between px-4 py-2.5 rounded-lg bg-white border border-border-default/50"
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <span
                                className={cn(
                                  "px-1.5 py-0.5 text-[10px] font-medium rounded",
                                  "bg-gray-100 text-gray-600"
                                )}
                              >
                                {getSourceTypeLabel(s.type)}
                              </span>
                              <span className="text-sm text-text-primary truncate">
                                {s.title}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              <span
                                className={cn(
                                  "px-1.5 py-0.5 text-[10px] font-medium rounded",
                                  getStatusColor(s.processing_status)
                                )}
                              >
                                {s.processing_status}
                              </span>
                              <span className="text-xs text-text-tertiary">
                                {formatDate(s.created_at)}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </section>

                  {/* Studio Outputs */}
                  <section>
                    <h3 className="text-sm font-semibold text-text-primary mb-3 flex items-center gap-2">
                      <Palette className="w-4 h-4" />
                      스튜디오 아웃풋 ({studioOutputs?.length ?? 0})
                    </h3>
                    {!studioOutputs?.length ? (
                      <p className="text-sm text-text-tertiary py-2">아웃풋이 없습니다</p>
                    ) : (
                      <div className="space-y-1.5">
                        {studioOutputs.map((o) => (
                          <div
                            key={o.id}
                            className="flex items-center justify-between px-4 py-2.5 rounded-lg bg-white border border-border-default/50"
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <span
                                className={cn(
                                  "px-1.5 py-0.5 text-[10px] font-medium rounded",
                                  "bg-purple-100 text-purple-600"
                                )}
                              >
                                {getOutputTypeLabel(o.type)}
                              </span>
                              <span className="text-sm text-text-primary truncate">
                                {o.title}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              <span
                                className={cn(
                                  "px-1.5 py-0.5 text-[10px] font-medium rounded",
                                  getStatusColor(o.generation_status)
                                )}
                              >
                                {o.generation_status}
                              </span>
                              <span className="text-xs text-text-tertiary">
                                {formatDate(o.created_at)}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </section>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ─── Sub-components ─── */

function StatCard({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number;
}) {
  return (
    <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-bg-secondary">
      <Icon className="w-4 h-4 text-text-tertiary" />
      <span className="text-xs text-text-secondary">{label}</span>
      <span className="text-sm font-semibold text-text-primary">{value.toLocaleString()}</span>
    </div>
  );
}

function UserListItem({
  user,
  isSelected,
  onClick,
  formatDate,
}: {
  user: User;
  isSelected: boolean;
  onClick: () => void;
  formatDate: (d: string) => string;
}) {
  const initials = (user.display_name || user.email).slice(0, 2).toUpperCase();

  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full text-left px-3 py-2.5 rounded-lg transition-colors flex items-center gap-3",
        isSelected
          ? "bg-brand-light/50 border border-brand/20"
          : "hover:bg-bg-secondary border border-transparent"
      )}
    >
      <Avatar className="w-9 h-9 shrink-0">
        <AvatarImage src={user.avatar_url || undefined} />
        <AvatarFallback className="text-xs bg-brand-light text-brand">
          {initials}
        </AvatarFallback>
      </Avatar>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <span className="text-sm font-medium text-text-primary truncate">
            {user.display_name || "이름 없음"}
          </span>
          {user.role === "admin" && (
            <span className="px-1 py-0.5 text-[9px] font-semibold rounded bg-brand-light text-brand leading-none shrink-0">
              어드민
            </span>
          )}
        </div>
        <p className="text-xs text-text-tertiary truncate">{user.email}</p>
        <p className="text-[10px] text-text-tertiary mt-0.5">
          {formatDate(user.created_at)}
        </p>
      </div>
    </button>
  );
}
