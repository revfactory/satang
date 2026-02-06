"use client";

import { useState, useRef, useEffect } from "react";
import { Send, AlertTriangle, Copy, BookmarkPlus, ThumbsUp, ThumbsDown } from "lucide-react";
import { useChatMessages, useSendMessage } from "@/hooks/use-chat";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { toast } from "sonner";

interface ChatPanelProps {
  notebookId: string;
  notebookTitle: string;
}

export function ChatPanel({ notebookId, notebookTitle }: ChatPanelProps) {
  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const { data: messages = [], isLoading } = useChatMessages(notebookId);
  const { sendMessage, isStreaming, streamingContent } =
    useSendMessage(notebookId);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamingContent]);

  const handleSend = async () => {
    const content = input.trim();
    if (!content || isStreaming) return;

    setInput("");
    if (textareaRef.current) textareaRef.current.style.height = "44px";

    try {
      await sendMessage(content);
    } catch {
      toast.error("메시지 전송에 실패했습니다.");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    const el = e.target;
    el.style.height = "44px";
    el.style.height = Math.min(el.scrollHeight, 200) + "px";
  };

  const suggestedQuestions = [
    "이 문서들의 핵심 내용을 요약해 줘",
    "주요 개념들 간의 관계를 설명해 줘",
    "이 주제에 대한 FAQ를 만들어 줘",
  ];

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="px-4 py-2.5 border-b border-border-default flex items-center">
        <h3 className="text-sm font-semibold text-text-primary">채팅</h3>
      </div>

      {/* Messages */}
      <div className="flex-1 min-h-0 overflow-y-auto px-4">
        {messages.length === 0 && !isStreaming ? (
          /* Initial State */
          <div className="py-8 max-w-2xl mx-auto">
            <div className="mb-6">
              <div className="flex items-start gap-2 mb-3 text-warning">
                <AlertTriangle className="w-5 h-5 mt-0.5 shrink-0" />
                <p className="text-xs text-text-muted">
                  KakaoBook은 소스의 내용을 기반으로 응답합니다. 정확하지 않은 정보가 포함될 수 있습니다.
                </p>
              </div>
              <h2 className="text-[22px] font-bold text-text-primary mb-2">
                {notebookTitle}
              </h2>
              <p className="text-sm text-text-secondary leading-relaxed">
                소스를 추가하고 질문하면 AI가 소스 내용을 기반으로 답변합니다.
              </p>
            </div>

            {/* Suggested Questions */}
            <div className="flex flex-wrap gap-2 mt-4">
              {suggestedQuestions.map((q) => (
                <button
                  key={q}
                  onClick={() => {
                    setInput(q);
                    textareaRef.current?.focus();
                  }}
                  className="px-3 py-1.5 bg-gray-100 rounded-full text-[13px] text-text-secondary hover:bg-brand-light hover:text-brand transition-colors cursor-pointer"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        ) : (
          /* Chat Messages */
          <div className="py-4 space-y-4 max-w-2xl mx-auto">
            {messages.map((msg) => (
              <div key={msg.id}>
                {msg.role === "user" ? (
                  <div className="flex justify-end">
                    <div className="bg-brand-light rounded-2xl rounded-br-md px-4 py-3 max-w-[80%]">
                      <p className="text-sm text-text-primary whitespace-pre-wrap">
                        {msg.content}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="prose prose-sm max-w-none text-text-secondary">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {msg.content}
                      </ReactMarkdown>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(msg.content);
                          toast.success("복사되었습니다.");
                        }}
                        className="p-1.5 rounded-md hover:bg-gray-100 text-text-muted cursor-pointer"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                      <button className="p-1.5 rounded-md hover:bg-gray-100 text-text-muted cursor-pointer">
                        <BookmarkPlus className="w-3.5 h-3.5" />
                      </button>
                      <button className="p-1.5 rounded-md hover:bg-gray-100 text-text-muted cursor-pointer">
                        <ThumbsUp className="w-3.5 h-3.5" />
                      </button>
                      <button className="p-1.5 rounded-md hover:bg-gray-100 text-text-muted cursor-pointer">
                        <ThumbsDown className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}

            {/* Streaming Response */}
            {isStreaming && (
              <div className="space-y-2">
                <div className="prose prose-sm max-w-none text-text-secondary">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {streamingContent || ""}
                  </ReactMarkdown>
                  {!streamingContent && (
                    <div className="flex gap-1 py-2">
                      <span className="w-2 h-2 bg-brand rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                      <span className="w-2 h-2 bg-brand rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                      <span className="w-2 h-2 bg-brand rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                    </div>
                  )}
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Input */}
      <div className="p-4 border-t border-border-default">
        <div className="relative max-w-2xl mx-auto">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder="입력을 시작하세요..."
            className="w-full min-h-[44px] max-h-[200px] resize-none rounded-2xl border border-border-default px-4 py-3 pr-12 text-sm text-text-primary placeholder:text-text-muted focus:border-brand focus:ring-2 focus:ring-brand/20 outline-none transition-colors"
            rows={1}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || isStreaming}
            className={`absolute right-2 bottom-2 w-9 h-9 rounded-full flex items-center justify-center transition-colors cursor-pointer ${
              input.trim() && !isStreaming
                ? "bg-brand text-white hover:bg-brand-hover"
                : "bg-gray-200 text-text-muted"
            }`}
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
