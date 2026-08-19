"use client";

import { useRouter } from "next/navigation";
import { formatRelativeTime, stripMarkdown, truncate } from "@spark/utils";
import { STATUS_CONFIG, getCollectionStyle } from "@/lib/config";
import type { CollectionInfo, Idea } from "@/lib/types";

// 首页右侧栏（仅 lg+ 显示，sticky）：今日回顾 + 状态 + 集合。
// 把宽屏空白变成常驻上下文，每个条目点击即筛选主列表；窄屏回退为
// 主列内的轻 banner（DailyReview）+ FilterBar 筛选，功能不缺失
interface HomeSidebarProps {
  daily: Idea | null;
  showDaily: boolean;
  onCloseDaily: () => void;
  statusCounts: Record<string, number>;
  overviewTotal: number;
  overviewLoaded: boolean;
  activeStatuses: string[];
  onToggleStatus: (value: string) => void;
  onClearStatuses: () => void;
  collections: CollectionInfo[];
  activeCollection: string;
  onCollectionChange: (name: string) => void;
}

const rowBase = "flex w-full items-center gap-2 rounded-md px-2 py-[5px] text-[12px] transition-colors";
const rowIdle = "text-[#525252] hover:bg-[#f5f5f5]";
const rowActive = "bg-[#f5f5f5] font-medium text-[#171717]";

export function HomeSidebar({
  daily, showDaily, onCloseDaily,
  statusCounts, overviewTotal, overviewLoaded,
  activeStatuses, onToggleStatus, onClearStatuses,
  collections, activeCollection, onCollectionChange,
}: HomeSidebarProps) {
  const router = useRouter();

  return (
    <aside className="hidden w-[280px] shrink-0 lg:block">
      <div className="sticky top-8 space-y-3">
        {daily && showDaily && (
          <div className="rounded-[10px] bg-white p-2 ring-1 ring-[#e5e5e5]">
            <div className="flex items-center justify-between px-2 pb-1 pt-1.5">
              <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-amber-700">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 18h6"/><path d="M10 22h4"/>
                  <path d="M15.09 14c.18-.98.65-1.74 1.41-2.5A4.65 4.65 0 0 0 18 8 6 6 0 0 0 6 8c0 1 .23 2.23 1.5 3.5A4.61 4.61 0 0 1 8.91 14"/>
                </svg>
                今日回顾
              </span>
              <button
                onClick={onCloseDaily}
                title="关闭"
                className="rounded p-0.5 text-[#a3a3a3] transition-colors hover:bg-[#f5f5f5] hover:text-[#737373]"
              >
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 6 6 18"/><path d="m6 6 12 12"/>
                </svg>
              </button>
            </div>
            <button
              onClick={() => router.push(`/ideas/${daily.id}`)}
              className="group block w-full rounded-md px-2 py-1.5 text-left transition-colors hover:bg-amber-50/60"
            >
              <p className="truncate text-[13px] font-medium text-[#171717] transition-colors group-hover:text-amber-700">
                {daily.title}
              </p>
              {daily.content && (
                <p className="mt-0.5 line-clamp-2 text-[12px] leading-relaxed text-[#737373]">
                  {truncate(stripMarkdown(daily.content), 80)}
                </p>
              )}
              <p className="mt-1 text-[10px] tabular-nums text-[#a3a3a3]">
                捕获于{formatRelativeTime(daily.created_at)}
              </p>
            </button>
          </div>
        )}

        <div className="rounded-[10px] bg-white p-2 ring-1 ring-[#e5e5e5]">
          <p className="px-2 pb-1 pt-1.5 text-[11px] font-semibold text-[#a3a3a3]">状态</p>
          {!overviewLoaded ? (
            <div className="space-y-1.5 px-2 py-1.5 animate-pulse">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="h-3 rounded bg-[#f0f0f0]" style={{ width: `${85 - i * 12}%` }} />
              ))}
            </div>
          ) : (
            <>
              <button
                onClick={onClearStatuses}
                className={`${rowBase} ${activeStatuses.length === 0 ? rowActive : rowIdle}`}
              >
                全部
                <span className="ml-auto text-[11px] tabular-nums text-[#a3a3a3]">{overviewTotal}</span>
              </button>
              {STATUS_CONFIG.map(s => {
                const count = statusCounts[s.value] ?? 0;
                const active = activeStatuses.includes(s.value);
                return (
                  <button
                    key={s.value}
                    onClick={() => onToggleStatus(s.value)}
                    className={`${rowBase} ${active ? rowActive : rowIdle}`}
                  >
                    <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${s.dot}`} />
                    {s.label}
                    <span className={`ml-auto text-[11px] tabular-nums ${count > 0 ? "text-[#a3a3a3]" : "text-[#e5e5e5]"}`}>
                      {count}
                    </span>
                  </button>
                );
              })}
            </>
          )}
        </div>

        {collections.length > 0 && (
          <div className="rounded-[10px] bg-white p-2 ring-1 ring-[#e5e5e5]">
            <p className="px-2 pb-1 pt-1.5 text-[11px] font-semibold text-[#a3a3a3]">集合</p>
            <div className="max-h-56 overflow-y-auto">
              {collections.map(col => {
                const c = getCollectionStyle(col.name);
                const active = activeCollection === col.name;
                return (
                  <button
                    key={col.name}
                    onClick={() => onCollectionChange(active ? "" : col.name)}
                    className={`${rowBase} ${active ? rowActive : rowIdle}`}
                  >
                    <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${c.dot}`} />
                    <span className="min-w-0 flex-1 truncate text-left">{col.name}</span>
                    <span className="ml-auto shrink-0 text-[11px] tabular-nums text-[#a3a3a3]">{col.count}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}
