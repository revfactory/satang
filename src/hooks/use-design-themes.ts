"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import type { DesignThemeRow } from "@/lib/supabase/types";

export function useDesignThemes() {
  const supabase = createClient();

  return useQuery({
    queryKey: ["design-themes"],
    queryFn: async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from("design_themes")
        .select("*")
        .eq("user_id", user.id)
        .order("sort_order", { ascending: true });

      if (error) throw error;
      return data as DesignThemeRow[];
    },
  });
}

export function useCreateDesignTheme() {
  const supabase = createClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      name: string;
      primary_color: string;
      mood: string;
      style: string;
    }) => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from("design_themes")
        .insert({ ...params, user_id: user.id })
        .select()
        .single();

      if (error) throw error;
      return data as DesignThemeRow;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["design-themes"] });
    },
  });
}

export function useUpdateDesignTheme() {
  const supabase = createClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      id: string;
      name?: string;
      primary_color?: string;
      mood?: string;
      style?: string;
    }) => {
      const { id, ...updates } = params;
      const { data, error } = await supabase
        .from("design_themes")
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data as DesignThemeRow;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["design-themes"] });
    },
  });
}

export function useDeleteDesignTheme() {
  const supabase = createClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("design_themes")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["design-themes"] });
    },
  });
}
