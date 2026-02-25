"use client";

import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import type { User, Notebook, Source, StudioOutput } from "@/lib/supabase/types";

export function useAllUsers() {
  const supabase = createClient();
  return useQuery({
    queryKey: ["admin", "users"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("users")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as User[];
    },
  });
}

export function useUserNotebooks(userId: string | null) {
  const supabase = createClient();
  return useQuery({
    queryKey: ["admin", "notebooks", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("notebooks")
        .select("*")
        .eq("user_id", userId!)
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return data as Notebook[];
    },
    enabled: !!userId,
  });
}

export function useUserSources(userId: string | null, notebookId?: string | null) {
  const supabase = createClient();
  return useQuery({
    queryKey: ["admin", "sources", userId, notebookId],
    queryFn: async () => {
      let query = supabase
        .from("sources")
        .select("*")
        .eq("user_id", userId!)
        .order("created_at", { ascending: false });
      if (notebookId) {
        query = query.eq("notebook_id", notebookId);
      }
      const { data, error } = await query;
      if (error) throw error;
      return data as Source[];
    },
    enabled: !!userId,
  });
}

export function useUserStudioOutputs(userId: string | null, notebookId?: string | null) {
  const supabase = createClient();
  return useQuery({
    queryKey: ["admin", "studio_outputs", userId, notebookId],
    queryFn: async () => {
      let query = supabase
        .from("studio_outputs")
        .select("*")
        .eq("user_id", userId!)
        .order("created_at", { ascending: false });
      if (notebookId) {
        query = query.eq("notebook_id", notebookId);
      }
      const { data, error } = await query;
      if (error) throw error;
      return data as StudioOutput[];
    },
    enabled: !!userId,
  });
}

export function useAdminStats() {
  const supabase = createClient();
  return useQuery({
    queryKey: ["admin", "stats"],
    queryFn: async () => {
      const [usersRes, notebooksRes, sourcesRes] = await Promise.all([
        supabase.from("users").select("id", { count: "exact", head: true }),
        supabase.from("notebooks").select("id", { count: "exact", head: true }),
        supabase.from("sources").select("id", { count: "exact", head: true }),
      ]);
      return {
        totalUsers: usersRes.count ?? 0,
        totalNotebooks: notebooksRes.count ?? 0,
        totalSources: sourcesRes.count ?? 0,
      };
    },
  });
}
