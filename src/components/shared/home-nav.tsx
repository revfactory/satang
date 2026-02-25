"use client";

import { useState } from "react";
import { Grid3X3, List, Search, X } from "lucide-react";
import Image from "next/image";
import { UserMenu } from "./user-menu";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface HomeNavProps {
  user: {
    display_name: string | null;
    email: string;
    avatar_url: string | null;
    role?: "user" | "admin";
  };
  activeTab: string;
  onTabChange: (tab: string) => void;
  viewMode: "grid" | "list";
  onViewModeChange: (mode: "grid" | "list") => void;
  onNewNotebook: () => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
}

const tabs = [
  { id: "all", label: "전체" },
  { id: "mine", label: "내 노트북" },
  { id: "shared", label: "공유 검색함" },
];

export function HomeNav({
  user,
  activeTab,
  onTabChange,
  viewMode,
  onViewModeChange,
  onNewNotebook,
  searchQuery,
  onSearchChange,
}: HomeNavProps) {
  const [showSearch, setShowSearch] = useState(false);
  return (
    <header className="sticky top-0 z-50 h-[64px] border-b border-border-default/50 bg-white/70 backdrop-blur-xl flex items-center px-6 gap-6 transition-all">
      {/* Logo */}
      <div className="flex items-center gap-1.5 mr-4">
        <Image src="/images/logo_satang.png" alt="Satang" width={36} height={24} className="h-6 w-auto" />
        <span className="text-lg font-bold text-text-primary">Satang</span>
      </div>

      {/* Tabs */}
      <nav className="hidden md:flex items-center gap-1.5 bg-gray-100/50 p-1.5 rounded-full border border-gray-200/50">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={cn(
              "px-4 py-1.5 text-sm rounded-full transition-all duration-300 font-medium cursor-pointer",
              activeTab === tab.id
                ? "text-brand bg-white shadow-sm ring-1 ring-gray-200/50"
                : "text-text-tertiary hover:text-text-primary hover:bg-white/50"
            )}
          >
            {tab.label}
          </button>
        ))}
      </nav>

      <div className="flex-1" />

      {/* Actions */}
      <div className="flex items-center gap-3">
        {showSearch ? (
          <div className="relative group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted group-focus-within:text-brand transition-colors" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="노트북 검색..."
              className="h-10 w-[200px] md:w-[280px] pl-10 pr-10 text-sm rounded-full bg-gray-50/50 border border-border-default focus:border-brand focus:ring-2 focus:ring-brand/20 transition-all outline-none"
              autoFocus
              onBlur={() => { if (!searchQuery) setShowSearch(false); }}
            />
            {searchQuery && (
              <button
                onClick={() => { onSearchChange(""); setShowSearch(false); }}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-gray-200/50 cursor-pointer transition-colors"
                aria-label="Clear search"
              >
                <X className="w-3.5 h-3.5 text-text-muted" />
              </button>
            )}
          </div>
        ) : (
          <button
            onClick={() => setShowSearch(true)}
            className="p-2.5 rounded-full hover:bg-gray-100/80 text-text-tertiary cursor-pointer transition-colors"
            aria-label="Open search"
          >
            <Search className="w-5 h-5" />
          </button>
        )}

        <div className="hidden sm:flex items-center border border-border-default rounded-full p-0.5 bg-gray-50/50">
          <button
            onClick={() => onViewModeChange("grid")}
            className={cn(
               "p-2.5 rounded-full cursor-pointer transition-all",
               viewMode === "grid"
                 ? "bg-white text-brand shadow-sm"
                 : "text-text-muted hover:text-text-primary hover:bg-white/50"
            )}
            aria-label="Grid view"
          >
            <Grid3X3 className="w-4 h-4" />
          </button>
          <button
            onClick={() => onViewModeChange("list")}
            className={cn(
               "p-2.5 rounded-full cursor-pointer transition-all",
               viewMode === "list"
                 ? "bg-white text-brand shadow-sm"
                 : "text-text-muted hover:text-text-primary hover:bg-white/50"
            )}
            aria-label="List view"
          >
            <List className="w-4 h-4" />
          </button>
        </div>

        <Button onClick={onNewNotebook} className="rounded-full px-5 py-2.5 bg-brand hover:bg-brand-hover text-white text-sm h-10 shadow-sm shadow-brand/20 transition-all hover:shadow-brand/40 hover:-translate-y-0.5">
          새로 만들기
        </Button>

        <div className="ml-2">
          <UserMenu user={user} />
        </div>
      </div>
    </header>
  );
}
