"use client";

import type { RefObject } from "react";
import { IdeaCard } from "./idea-card";
import type { Idea, IdeaGroup } from "@/lib/types";

// 想法列表：加载骨架 / 空状态 / 分组卡片流 + 无限滚动分页
interface IdeaListProps {
  loading: boolean;
  ideas: Idea[];
  groups: IdeaGroup[];
  isSearching: boolean;
  activeCollection: string;
  total: number;
  hasMore: boolean;
  loadingMore: boolean;
  onLoadMore: () => void;
  sentinelRef: RefObject<HTMLDivElement | null>;
  quickMenuId: string | null;
  onToggleQuickMenu: (id: string) => void;
  onCloseQuickMenu: () => void;
  onOpenIdea: (id: string) => void;
  onAdvanceStatus: (idea: Idea) => void;
  onSetImportance: (id: string, value: number) => void;
  onArchive: (idea: Idea) => void;
}

export function IdeaList({
  loading, ideas, groups, isSearching, activeCollection,
  total, hasMore, loadingMore, onLoadMore, sentinelRef,
  quickMenuId, onToggleQuickMenu, onCloseQuickMenu,
  onOpenIdea, onAdvanceStatus, onSetImportance, onArchive,
}: IdeaListProps) {
  if (loading) {
    return (
      <div className="space-y-2">
        {[1,2,3].map(i => (
          <div key={i} className="flex rounded-[10px] bg-white shadow-sm ring-1 ring-[#e5e5e5] animate-pulse">
            <div className="w-[3px] rounded-l-[10px] bg-[#f0f0f0]" />
            <div className="flex-1 py-3 pl-3.5 space-y-2">
              <div className="h-3.5 w-3/5 rounded bg-[#f0f0f0]" />
              <div className="h-3 w-4/5 rounded bg-[#f0f0f0]" />
            </div>
            <div className="flex shrink-0 flex-col items-end justify-center gap-1.5 py-3 pr-3">
              <div className="h-2.5 w-10 rounded bg-[#f0f0f0]" />
              <div className="h-2.5 w-14 rounded bg-[#f0f0f0]" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (ideas.length === 0) {
    return (
      <div className="flex flex-col items-center py-20">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white shadow-sm ring-1 ring-[#e5e5e5] mb-5">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#a3a3a3" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2l2 7h7l-5.5 4 2 7L12 16l-5.5 4 2-7L3 9h7z"/>
          </svg>
        </div>
        <p className="text-[14px] font-medium text-[#737373]">
          {isSearching ? "没有找到匹配的想法" : activeCollection ? `「${activeCollection}」还是空的` : "还没有想法"}
        </p>
        <p className="mt-1 text-[12px] text-[#a3a3a3]">
          {isSearching ? "试试其他关键词" : activeCollection ? "换个集合看看" : "在上面写下第一个想法吧"}
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className="space-y-5">
        {groups.map(group => (
          <section key={group.key}>
            {/* sticky 分组标题：半粗标题 + 细分隔线，滚动时提供方位感 */}
            <div className="sticky top-0 z-10 bg-[#f5f5f4]/90 pb-2 pt-1 backdrop-blur-sm">
              <div className="flex items-center gap-2.5">
                <p className="shrink-0 text-[14px] font-semibold text-[#404040]">{group.label}</p>
                <span className="shrink-0 text-[12px] tabular-nums text-[#a3a3a3]">{group.ideas.length}</span>
                <div className="h-px flex-1 bg-[#e8e8e8]" />
              </div>
            </div>
            <div className="space-y-2">
              {group.ideas.map((idea, i) => (
                <IdeaCard
                  key={idea.id}
                  idea={idea}
                  index={i}
                  quickMenuOpen={quickMenuId === idea.id}
                  onToggleQuickMenu={() => onToggleQuickMenu(idea.id)}
                  onCloseQuickMenu={onCloseQuickMenu}
                  onOpen={() => onOpenIdea(idea.id)}
                  onAdvanceStatus={() => onAdvanceStatus(idea)}
                  onSetImportance={(v) => onSetImportance(idea.id, v)}
                  onArchive={() => onArchive(idea)}
                />
              ))}
            </div>
          </section>
        ))}
      </div>

      {/* Pagination */}
      <div className="mt-6 flex flex-col items-center gap-2">
        {loadingMore && (
          <div className="flex items-center gap-1.5 text-[11px] text-[#a3a3a3]">
            <div className="h-3 w-3 animate-spin rounded-full border-2 border-[#e5e5e5] border-t-amber-500" />
            加载中...
          </div>
        )}
        {hasMore && !loadingMore && (
          <button
            onClick={onLoadMore}
            className="inline-flex h-8 items-center gap-1.5 rounded-[8px] border border-[#e5e5e5] bg-white px-4 text-[12px] font-medium text-[#737373] shadow-sm hover:bg-[#fafafa] hover:text-[#171717] disabled:opacity-40 transition-colors"
          >
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 5v14"/><path d="M5 12h14"/>
            </svg>
            加载更多
          </button>
        )}
        <p className="text-[11px] text-[#a3a3a3] tabular-nums">
          {hasMore ? `已显示 ${ideas.length} / ${total} 条` : `共 ${total} 条`}
        </p>
        {/* 无限滚动哨兵：进入视口即自动加载下一页 */}
        <div ref={sentinelRef} className="h-px w-full" />
      </div>
    </div>
  );
}
