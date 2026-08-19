"use client";

import { useRef } from "react";
import { formatRelativeTime, stripMarkdown, truncate } from "@spark/utils";
import { useOutsideClick } from "@/hooks/use-outside-click";
import { EMOTION_CONFIG, IMPORTANCE_CONFIG, STATUS_BY_VALUE } from "@/lib/config";
import type { Idea } from "@/lib/types";

// 想法卡片：左栏标题+预览（扫读主线，预览剥离 Markdown 语法），右栏元信息列（时间/状态徽标/集合），
// 左缘 3px 重要度色条 + 标题后情绪 emoji；快捷菜单锚定在右栏时间行
interface IdeaCardProps {
  idea: Idea;
  index: number;
  quickMenuOpen: boolean;
  onToggleQuickMenu: () => void;
  onCloseQuickMenu: () => void;
  onOpen: () => void;
  onAdvanceStatus: () => void;
  onSetImportance: (value: number) => void;
  onArchive: () => void;
}

export function IdeaCard({
  idea, index, quickMenuOpen,
  onToggleQuickMenu, onCloseQuickMenu, onOpen,
  onAdvanceStatus, onSetImportance, onArchive,
}: IdeaCardProps) {
  const s = STATUS_BY_VALUE[idea.status] ?? STATUS_BY_VALUE.seed;
  const isSealed = idea.is_capsule && !!idea.unlock_at && new Date(idea.unlock_at) > new Date();
  const capsuleDays = isSealed && idea.unlock_at ? Math.ceil((new Date(idea.unlock_at).getTime() - Date.now()) / 86400000) : 0;
  const lastActivity = idea.last_reviewed_at || idea.updated_at;
  const daysSinceReview = lastActivity ? Math.floor((Date.now() - new Date(lastActivity).getTime()) / 86400000) : 0;
  const isAged = daysSinceReview > 30;
  const ic = IMPORTANCE_CONFIG.find(c => c.value === idea.importance);
  const emotion = idea.emotion ? EMOTION_CONFIG.find(e => e.value === idea.emotion) : undefined;

  const quickMenuRef = useRef<HTMLSpanElement>(null);
  useOutsideClick(quickMenuRef, onCloseQuickMenu, quickMenuOpen);

  return (
    <div className="animate-slide-up" style={{ animationDelay: `${Math.min(index, 5) * 25}ms` }}>
      <div
        onClick={onOpen}
        className="group relative flex w-full cursor-pointer rounded-[10px] bg-white text-left shadow-sm ring-1 ring-[#e5e5e5] transition-all hover:shadow-md hover:ring-[#d4d4d4] active:scale-[0.99]"
      >
        {/* 重要度色条：左缘扫读锚点，未评级时透明占位保持对齐 */}
        <div className={`w-[3px] shrink-0 rounded-l-[10px] ${idea.importance > 0 && ic ? ic.dot : "bg-transparent"}`} />

        {/* 左栏：标题 + 一行预览（扫读主线） */}
        <div className="min-w-0 flex-1 py-3 pl-3.5 pr-1">
          <div className="flex items-center gap-1.5">
            <h3 className="truncate text-[15px] font-semibold text-[#171717] leading-snug group-hover:text-amber-600 transition-colors">
              {idea.title}
            </h3>
            {emotion && (
              <span className="shrink-0 text-[13px] leading-none" title={`情绪：${emotion.label}`}>{emotion.emoji}</span>
            )}
          </div>
          {isSealed ? (
            <p className="mt-0.5 inline-flex items-center gap-1 text-[11px] text-violet-500 font-medium">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect width="18" height="11" x="3" y="11" rx="2" ry="2"/>
                <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
              </svg>
              {capsuleDays} 天后解锁
            </p>
          ) : idea.content && (
            <p className="mt-0.5 truncate text-[13px] text-[#737373] leading-relaxed">{truncate(stripMarkdown(idea.content), 120)}</p>
          )}
        </div>

        {/* 右栏：元信息扫读列（时间 / 状态徽标 / 集合徽标）；快捷菜单收进时间行左侧，隐藏时占位不位移 */}
        <div className="flex shrink-0 flex-col items-end justify-center gap-1.5 py-3 pl-2 pr-3">
          <div className="flex items-center gap-1">
            <span ref={quickMenuRef} className={`relative flex h-4 w-4 items-center justify-center rounded transition-opacity ${
              quickMenuOpen ? "opacity-100" : "opacity-0 group-hover:opacity-100"
            }`}>
              <button
                onClick={(e) => { e.stopPropagation(); onToggleQuickMenu(); }}
                className="flex h-4 w-4 items-center justify-center rounded hover:bg-[#f5f5f5]"
                title="快捷操作"
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#a3a3a3" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="5" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="12" cy="19" r="1.5"/>
                </svg>
              </button>
              {quickMenuOpen && (
                <div onClick={(e) => e.stopPropagation()} className="absolute right-0 top-full mt-1 z-50 w-44 rounded-[10px] bg-white shadow-lg ring-1 ring-[#e5e5e5] py-1.5 animate-scale-in">
                  {idea.status !== "realized" && idea.status !== "archived" && idea.status !== "dormant" && (
                    <button
                      onClick={onAdvanceStatus}
                      className="flex w-full items-center gap-2 px-3 py-1.5 text-[12px] text-[#404040] hover:bg-[#f5f5f5] transition-colors"
                    >
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="m3 8 4-4 4 4"/><path d="M7 4v16"/><path d="m21 16-4 4-4-4"/><path d="M17 20V4"/>
                      </svg>
                      推进状态
                    </button>
                  )}
                  <div className="px-3 py-1">
                    <p className="text-[9px] font-semibold text-[#a3a3a3] uppercase tracking-[0.06em] mb-1">重要程度</p>
                    <div className="flex items-center gap-1">
                      {IMPORTANCE_CONFIG.map(c => (
                        <button
                          key={c.value}
                          onClick={() => onSetImportance(c.value)}
                          className={`flex h-5 w-5 items-center justify-center rounded-full transition-all ${
                            idea.importance === c.value ? `${c.bg} ring-1 ${c.ring}` : "bg-[#fafafa] ring-1 ring-[#f0f0f0] hover:ring-[#e5e5e5]"
                          }`}
                          title={c.label}
                        >
                          <span className={`h-1.5 w-1.5 rounded-full ${c.dot}`} />
                        </button>
                      ))}
                    </div>
                  </div>
                  {idea.status !== "archived" && (
                    <button
                      onClick={onArchive}
                      className="flex w-full items-center gap-2 px-3 py-1.5 text-[12px] text-rose-600 hover:bg-rose-50 transition-colors border-t border-[#f0f0f0] mt-1"
                    >
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 1.5-1.5-1-2.74-1.5-4.5-1.5A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/>
                      </svg>
                      归档
                    </button>
                  )}
                </div>
              )}
            </span>
            <span className="text-[11px] tabular-nums text-[#737373]">{formatRelativeTime(idea.created_at)}</span>
          </div>
          <div className="flex items-center gap-1.5">
            {isAged && (
              <span className="shrink-0 text-[11px] text-amber-600/70">{daysSinceReview}天未回看</span>
            )}
            <span className={`inline-flex items-center gap-1 rounded-full px-1.5 py-px text-[11px] font-medium ring-1 ${s.bg} ${s.text} ${s.ring}`}>
              <span className={`h-1.5 w-1.5 rounded-full ${s.dot}`} />
              {s.label}
            </span>
          </div>
          {idea.collection && (
            <span className="max-w-[120px] truncate rounded-full bg-[#f5f5f5] px-1.5 py-px text-[11px] text-[#737373] ring-1 ring-[#ebebeb]">
              {idea.collection}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
