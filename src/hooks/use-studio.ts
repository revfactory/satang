"use client";

import { useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import type { StudioOutput, StudioOutputType } from "@/lib/supabase/types";

export function useStudioOutputs(notebookId: string) {
  const supabase = createClient();
  const queryClient = useQueryClient();

  // Supabase Realtime 구독으로 변경사항 즉시 반영
  useEffect(() => {
    if (!notebookId) return;

    const channel = supabase
      .channel(`studio-outputs:${notebookId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "studio_outputs",
          filter: `notebook_id=eq.${notebookId}`,
        },
        () => {
          queryClient.invalidateQueries({
            queryKey: ["studio-outputs", notebookId],
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [notebookId, supabase, queryClient]);

  return useQuery({
    queryKey: ["studio-outputs", notebookId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("studio_outputs")
        .select("*")
        .eq("notebook_id", notebookId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as StudioOutput[];
    },
    enabled: !!notebookId,
  });
}

export function useGenerateInfographic() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      notebookId: string;
      language: string;
      orientation: string;
      detailLevel: string;
      prompt: string;
      designThemeId?: string;
    }) => {
      const response = await fetch("/api/studio/infographic", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(params),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "인포그래픽 생성 실패");
      }

      return response.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["studio-outputs", variables.notebookId],
      });
    },
  });
}

export function useGenerateSlides() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      notebookId: string;
      format: string;
      language: string;
      depth: string;
      prompt: string;
      slideCount?: number;
      designThemeId?: string;
    }) => {
      const response = await fetch("/api/studio/slides", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(params),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "슬라이드 생성 실패");
      }

      return response.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["studio-outputs", variables.notebookId],
      });
    },
  });
}

export function useGenerateMindMap() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (params: { notebookId: string; language: string; prompt: string }) => {
      const response = await fetch("/api/studio/mindmap", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(params),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "마인드맵 생성 실패");
      }
      return response.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["studio-outputs", variables.notebookId] });
    },
  });
}

export function useGenerateReport() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (params: { notebookId: string; language: string; detailLevel: string; prompt: string }) => {
      const response = await fetch("/api/studio/report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(params),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "보고서 생성 실패");
      }
      return response.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["studio-outputs", variables.notebookId] });
    },
  });
}

export function useGenerateFlashcard() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (params: { notebookId: string; language: string; cardCount: number; prompt: string }) => {
      const response = await fetch("/api/studio/flashcard", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(params),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "플래시카드 생성 실패");
      }
      return response.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["studio-outputs", variables.notebookId] });
    },
  });
}

export function useGenerateQuiz() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (params: { notebookId: string; language: string; questionCount: number; prompt: string }) => {
      const response = await fetch("/api/studio/quiz", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(params),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "퀴즈 생성 실패");
      }
      return response.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["studio-outputs", variables.notebookId] });
    },
  });
}

export function useRetryStudioOutput() {
  const supabase = createClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (output: StudioOutput) => {
      // Delete the old record
      await supabase.from("studio_outputs").delete().eq("id", output.id);

      // Re-trigger generation with saved settings
      const settings = output.settings as Record<string, string>;
      const endpointMap: Record<string, string> = {
        infographic: "/api/studio/infographic",
        slide_deck: "/api/studio/slides",
        mind_map: "/api/studio/mindmap",
        report: "/api/studio/report",
        flashcard: "/api/studio/flashcard",
        quiz: "/api/studio/quiz",
      };
      const endpoint = endpointMap[output.type] || "/api/studio/infographic";

      const baseBody = { notebookId: output.notebook_id, language: settings.language || "ko", prompt: settings.prompt || "" };
      const bodyMap: Record<string, object> = {
        infographic: { ...baseBody, orientation: settings.orientation || "landscape", detailLevel: settings.detailLevel || "standard", designThemeId: settings.designThemeId || undefined },
        slide_deck: { ...baseBody, format: settings.format || "detailed", depth: settings.depth || "default", slideCount: settings.slideCount ? Number(settings.slideCount) : undefined, designThemeId: settings.designThemeId || undefined },
        mind_map: baseBody,
        report: { ...baseBody, detailLevel: settings.detailLevel || "standard" },
        flashcard: { ...baseBody, cardCount: Number(settings.cardCount) || 10 },
        quiz: { ...baseBody, questionCount: Number(settings.questionCount) || 10 },
      };
      const body = bodyMap[output.type] || baseBody;

      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "재생성 실패");
      }

      return response.json();
    },
    onSuccess: (_, output) => {
      queryClient.invalidateQueries({
        queryKey: ["studio-outputs", output.notebook_id],
      });
    },
  });
}

export function useDeleteStudioOutput() {
  const supabase = createClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("studio_outputs")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["studio-outputs"] });
    },
  });
}
