"use client";

import { useRouter } from "next/navigation";
import { stripMarkdown, truncate } from "@spark/utils";
import type { Idea } from "@/lib/types";

// 每日一想法：随机回访 7 天前的想法。单行轻 banner 形态——次要入口，
// 视觉权重低于捕获框；无 shadow、弱边框，hover 时才显出琥珀色可点击感
export function DailyReview({ idea, onClose }: { idea: Idea; onClose: () => void }) {
  const router = useRouter();
  return (
    <div className="mb-4 animate-slide-down">
      <div
        onClick={() => { router.push(`/ideas/${idea.id}`); }}
        className="group flex w-full cursor-pointer items-center gap-2.5 rounded-[8px] bg-white px-3 py-2 ring-1 ring-[#e8e8e8] transition-colors hover:bg-amber-50/50 hover:ring-amber-200/60"
      >
        <svg className="shrink-0" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M9 18h6"/><path d="M10 22h4"/>
          <path d="M15.09 14c.18-.98.65-1.74 1.41-2.5A4.65 4.65 0 0 0 18 8 6 6 0 0 0 6 8c0 1 .23 2.23 1.5 3.5A4.61 4.61 0 0 1 8.91 14"/>
        </svg>
        <span className="shrink-0 text-[11px] font-semibold text-amber-700">今日回顾</span>
        <span className="min-w-0 shrink truncate text-[13px] font-medium text-[#171717] transition-colors group-hover:text-amber-700">
          {idea.title}
        </span>
        {idea.content && (
          <span className="hidden min-w-0 flex-1 truncate text-[12px] text-[#a3a3a3] md:block">
            {truncate(stripMarkdown(idea.content), 60)}
          </span>
        )}
        <button
          onClick={e => { e.stopPropagation(); onClose(); }}
          title="关闭"
          className="ml-auto shrink-0 rounded-md p-1 text-[#a3a3a3] hover:text-[#737373] hover:bg-[#f5f5f5] transition-colors"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 6 6 18"/><path d="m6 6 12 12"/>
          </svg>
        </button>
      </div>
    </div>
  );
}
