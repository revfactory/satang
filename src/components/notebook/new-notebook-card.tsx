"use client";

import { Plus } from "lucide-react";

interface NewNotebookCardProps {
  onClick: () => void;
}

export function NewNotebookCard({ onClick }: NewNotebookCardProps) {
  return (
    <button
      onClick={onClick}
      className="group relative flex flex-col items-center justify-center h-[200px] p-6 rounded-2xl border-2 border-dashed border-border-hover/60 bg-slate-50/50 hover:bg-brand-faint hover:border-brand/40 transition-all duration-300 cursor-pointer overflow-hidden"
    >
      <div className="absolute inset-0 bg-gradient-to-br from-brand/5 focus:brand/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

      <div className="relative w-14 h-14 bg-white rounded-full flex items-center justify-center shadow-sm border border-border-default/50 group-hover:scale-110 group-hover:shadow-md transition-all duration-300 mb-4 group-hover:border-brand/30">
        <Plus className="w-6 h-6 text-text-tertiary group-hover:text-brand transition-colors duration-300" />
      </div>

      <span className="relative text-[15px] font-semibold text-text-secondary group-hover:text-brand transition-colors duration-300">
        새노트 만들기
      </span>
      <span className="relative text-xs text-text-muted mt-1 opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-300 delay-75">
        새로운 지식을 탐구하세요
      </span>
    </button>
  );
}
