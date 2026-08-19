"use client";

// AI 功能入口（发现连接 / 杂交台）：紧凑 pill 形态，嵌在捕获框折叠态输入行右侧；
// 小屏只保留图标，避免挤压标题输入区
export function AiEntryButtons({ features, onRunConnect, onRunCatalyst }: {
  features: Record<string, boolean>;
  onRunConnect: () => void;
  onRunCatalyst: () => void;
}) {
  if (features.connector === false && features.catalyst === false) return null;
  return (
    <div className="flex shrink-0 items-center gap-1.5">
      {features.connector !== false && (
        <button
          onClick={onRunConnect}
          title="发现连接"
          className="inline-flex h-7 items-center gap-1.5 rounded-full bg-white px-2.5 text-[11px] font-medium text-[#737373] ring-1 ring-[#e5e5e5] hover:text-sky-600 hover:ring-sky-200 transition-colors"
        >
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
            <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
          </svg>
          <span className="hidden sm:inline">发现连接</span>
        </button>
      )}
      {features.catalyst !== false && (
        <button
          onClick={onRunCatalyst}
          title="杂交台"
          className="inline-flex h-7 items-center gap-1.5 rounded-full bg-white px-2.5 text-[11px] font-medium text-[#737373] ring-1 ring-[#e5e5e5] hover:text-amber-600 hover:ring-amber-200 transition-colors"
        >
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="9" cy="12" r="5"/><circle cx="15" cy="12" r="5"/>
          </svg>
          <span className="hidden sm:inline">杂交台</span>
        </button>
      )}
    </div>
  );
}
