"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import type { Notebook } from "@/lib/supabase/types";

const EMOJI_LIST = ["📓", "📘", "📕", "📗", "📙", "🔬", "🧪", "💡", "🎯", "🚀", "🌍", "🧠", "📊", "🎓", "🖊️"];

function randomEmoji() {
  return EMOJI_LIST[Math.floor(Math.random() * EMOJI_LIST.length)];
}

export function useNotebooks() {
  const supabase = createClient();

  return useQuery({
    queryKey: ["notebooks"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("notebooks")
        .select("*")
        .order("updated_at", { ascending: false });

      if (error) throw error;
      return data as Notebook[];
    },
  });
}

export function useCreateNotebook() {
  const supabase = createClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (title?: string) => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // users 테이블에 프로필이 없으면 생성 (FK 제약 충족)
      await supabase.from("users").upsert(
        {
          id: user.id,
          email: user.email || "",
          display_name:
            user.user_metadata?.full_name ||
            user.user_metadata?.name ||
            user.email ||
            "",
          avatar_url:
            user.user_metadata?.avatar_url ||
            user.user_metadata?.picture ||
            null,
        },
        { onConflict: "id" }
      );

      const { data, error } = await supabase
        .from("notebooks")
        .insert({
          user_id: user.id,
          title: title || "제목 없는 노트북",
          emoji: randomEmoji(),
        })
        .select()
        .single();

      if (error) throw error;
      return data as Notebook;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notebooks"] });
    },
  });
}

export function useUpdateNotebook() {
  const supabase = createClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      ...updates
    }: { id: string } & Partial<Pick<Notebook, "title" | "emoji">>) => {
      const { data, error } = await supabase
        .from("notebooks")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data as Notebook;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notebooks"] });
    },
  });
}

export function useDeleteNotebook() {
  const supabase = createClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("notebooks").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notebooks"] });
    },
  });
}
