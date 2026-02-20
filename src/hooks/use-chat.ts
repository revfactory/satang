"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { useState, useCallback, useRef } from "react";
import type { ChatMessage } from "@/lib/supabase/types";

export function useChatMessages(notebookId: string) {
  const supabase = createClient();

  return useQuery({
    queryKey: ["chat-messages", notebookId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("chat_messages")
        .select("*")
        .eq("notebook_id", notebookId)
        .order("created_at", { ascending: true });

      if (error) throw error;
      return data as ChatMessage[];
    },
    enabled: !!notebookId,
  });
}

export function useSendMessage(notebookId: string) {
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingContent, setStreamingContent] = useState("");
  const abortControllerRef = useRef<AbortController | null>(null);
  const queryClient = useQueryClient();

  const stopStreaming = useCallback(() => {
    abortControllerRef.current?.abort();
    abortControllerRef.current = null;
  }, []);

  const sendMessage = useCallback(
    async (content: string) => {
      // 낙관적 업데이트: 사용자 메시지 즉시 표시
      const optimisticMessage: ChatMessage = {
        id: `temp-${Date.now()}`,
        notebook_id: notebookId,
        user_id: "",
        role: "user",
        content,
        citations: [],
        model: null,
        tokens_used: null,
        created_at: new Date().toISOString(),
      };
      queryClient.setQueryData<ChatMessage[]>(
        ["chat-messages", notebookId],
        (old) => [...(old || []), optimisticMessage]
      );

      setIsStreaming(true);
      setStreamingContent("");

      const controller = new AbortController();
      abortControllerRef.current = controller;

      try {
        const response = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ notebookId, message: content }),
          signal: controller.signal,
        });

        if (!response.ok) throw new Error("Chat request failed");

        const reader = response.body?.getReader();
        if (!reader) throw new Error("No response body");

        const decoder = new TextDecoder();
        let fullContent = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          fullContent += chunk;
          setStreamingContent(fullContent);
        }

        // 스트리밍 완료: AI 응답을 캐시에 즉시 반영 (DB 저장 완료 전 사라지는 문제 방지)
        const assistantMessage: ChatMessage = {
          id: `temp-assistant-${Date.now()}`,
          notebook_id: notebookId,
          user_id: "",
          role: "assistant",
          content: fullContent,
          citations: [],
          model: null,
          tokens_used: null,
          created_at: new Date().toISOString(),
        };
        queryClient.setQueryData<ChatMessage[]>(
          ["chat-messages", notebookId],
          (old) => [...(old || []), assistantMessage]
        );

        // DB 저장 완료를 기다린 후 실제 데이터로 갱신
        setTimeout(() => {
          queryClient.invalidateQueries({
            queryKey: ["chat-messages", notebookId],
          });
        }, 2000);
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") {
          // Aborted by user — still refresh messages
          setTimeout(() => {
            queryClient.invalidateQueries({
              queryKey: ["chat-messages", notebookId],
            });
          }, 2000);
        } else {
          throw err;
        }
      } finally {
        setIsStreaming(false);
        setStreamingContent("");
        abortControllerRef.current = null;
      }
    },
    [notebookId, queryClient]
  );

  return { sendMessage, isStreaming, streamingContent, stopStreaming };
}
