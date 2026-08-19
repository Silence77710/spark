"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useOutsideClick } from "@/hooks/use-outside-click";

function SparkIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2l2 7h7l-5.5 4 2 7L12 16l-5.5 4 2-7L3 9h7z"/>
    </svg>
  );
}

const NAV_ITEMS: { href: string; label: string; icon: React.ReactNode }[] = [
  { href: "/graph", label: "图谱", icon: (<><circle cx="12" cy="5" r="2"/><circle cx="5" cy="19" r="2"/><circle cx="19" cy="19" r="2"/><path d="M12 7v3M12 12l-5 5M12 12l5 5"/></>) },
  { href: "/kanban", label: "看板", icon: (<><path d="M5 4v16"/><path d="M12 4v10"/><path d="M19 4v13"/></>) },
  { href: "/explore", label: "探索", icon: (<><circle cx="12" cy="12" r="10"/><polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"/></>) },
  { href: "/retro", label: "回顾", icon: (<><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></>) },
  { href: "/rhythm", label: "节律", icon: (<polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>) },
  { href: "/profile", label: "画像", icon: (<><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></>) },
  { href: "/graveyard", label: "墓地", icon: (<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>) },
  { href: "/settings", label: "设置", icon: (<><line x1="4" y1="21" x2="4" y2="14"/><line x1="4" y1="10" x2="4" y2="3"/><line x1="12" y1="21" x2="12" y2="12"/><line x1="12" y1="8" x2="12" y2="3"/><line x1="20" y1="21" x2="20" y2="16"/><line x1="20" y1="12" x2="20" y2="3"/><line x1="1" y1="14" x2="7" y2="14"/><line x1="9" y1="8" x2="9" y2="16"/><line x1="17" y1="16" x2="23" y2="16"/></>) },
];

// 导航分两层：高频页常驻，低频页收进「更多」下拉，减少列表页顶部视觉噪音
const NAV_PRIMARY = NAV_ITEMS.slice(0, 4);
const NAV_OVERFLOW = NAV_ITEMS.slice(4);

export function SiteHeader({ graveyardCount }: { graveyardCount: number }) {
  const router = useRouter();
  const [showMoreNav, setShowMoreNav] = useState(false);
  const moreNavRef = useRef<HTMLDivElement>(null);
  useOutsideClick(moreNavRef, () => setShowMoreNav(false));

  return (
    <header className="mb-8">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-50 ring-1 ring-amber-200/50">
            <span className="text-amber-500"><SparkIcon size={18} /></span>
          </div>
          <div>
            <h1 className="text-[15px] font-semibold tracking-tight text-[#171717]">Spark</h1>
            <p className="text-[11px] text-[#a3a3a3] tracking-wide">想法操作系统</p>
          </div>
        </div>
        <nav className="flex items-center gap-0.5">
          {NAV_PRIMARY.map(item => (
            <button
              key={item.href}
              onClick={() => router.push(item.href)}
              title={item.label}
              className="relative inline-flex items-center gap-1 rounded-md px-1.5 py-1 text-[11px] font-medium text-[#a3a3a3] hover:bg-[#f5f5f5] hover:text-[#737373] transition-colors"
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                {item.icon}
              </svg>
              <span className="hidden md:inline">{item.label}</span>
            </button>
          ))}
          <div className="relative" ref={moreNavRef}>
            <button
              onClick={() => setShowMoreNav(v => !v)}
              title="更多"
              aria-haspopup="true"
              aria-expanded={showMoreNav}
              className="relative inline-flex items-center gap-1 rounded-md px-1.5 py-1 text-[11px] font-medium text-[#a3a3a3] hover:bg-[#f5f5f5] hover:text-[#737373] transition-colors"
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="5" cy="12" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="19" cy="12" r="1.5"/>
              </svg>
              <span className="hidden md:inline">更多</span>
              {graveyardCount > 0 && (
                <span className="absolute -top-1 -right-1 flex h-[14px] min-w-[14px] items-center justify-center rounded-full bg-amber-500 px-0.5 text-[8px] font-semibold text-white tabular-nums">
                  {graveyardCount}
                </span>
              )}
            </button>
            {showMoreNav && (
              <div className="absolute right-0 top-full mt-1.5 w-36 rounded-[8px] bg-white shadow-lg ring-1 ring-[#e5e5e5] z-50 py-1 animate-scale-in">
                {NAV_OVERFLOW.map(item => (
                  <button
                    key={item.href}
                    onClick={() => { setShowMoreNav(false); router.push(item.href); }}
                    className="flex w-full items-center gap-2 px-3 py-1.5 text-[12px] text-[#737373] hover:bg-[#f5f5f5] transition-colors"
                  >
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 text-[#a3a3a3]">
                      {item.icon}
                    </svg>
                    <span className="flex-1 text-left">{item.label}</span>
                    {item.href === "/graveyard" && graveyardCount > 0 && (
                      <span className="flex h-[16px] min-w-[16px] items-center justify-center rounded-full bg-amber-500 px-1 text-[9px] font-semibold text-white tabular-nums">
                        {graveyardCount}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        </nav>
      </div>
    </header>
  );
}
