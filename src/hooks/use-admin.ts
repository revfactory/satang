"use client";

import { useQuery } from "@tanstack/react-query";
import type { User, Notebook, Source, StudioOutput } from "@/lib/supabase/types";

async function adminFetch<T>(params: Record<string, string>): Promise<T> {
  const query = new URLSearchParams(params).toString();
  const res = await fetch(`/api/admin?${query}`);
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || "Admin API error");
  }
  return res.json();
}

export function useAllUsers() {
  return useQuery({
    queryKey: ["admin", "users"],
    queryFn: () => adminFetch<User[]>({ action: "users" }),
  });
}

export function useUserNotebooks(userId: string | null) {
  return useQuery({
    queryKey: ["admin", "notebooks", userId],
    queryFn: () => adminFetch<Notebook[]>({ action: "notebooks", userId: userId! }),
    enabled: !!userId,
  });
}

export function useUserSources(userId: string | null, notebookId?: string | null) {
  return useQuery({
    queryKey: ["admin", "sources", userId, notebookId],
    queryFn: () => {
      const params: Record<string, string> = { action: "sources", userId: userId! };
      if (notebookId) params.notebookId = notebookId;
      return adminFetch<Source[]>(params);
    },
    enabled: !!userId,
  });
}

export function useUserStudioOutputs(userId: string | null, notebookId?: string | null) {
  return useQuery({
    queryKey: ["admin", "studio_outputs", userId, notebookId],
    queryFn: () => {
      const params: Record<string, string> = { action: "studio_outputs", userId: userId! };
      if (notebookId) params.notebookId = notebookId;
      return adminFetch<StudioOutput[]>(params);
    },
    enabled: !!userId,
  });
}

export function useAdminStats() {
  return useQuery({
    queryKey: ["admin", "stats"],
    queryFn: () =>
      adminFetch<{ totalUsers: number; totalNotebooks: number; totalSources: number }>({
        action: "stats",
      }),
  });
}
