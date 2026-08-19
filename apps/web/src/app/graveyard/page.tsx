"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { formatRelativeTime } from "@spark/utils";

interface Idea {
  id: string; title: string; content: string | null; status: string;
  collection: string | null; importance: number;
  is_capsule: boolean; unlock_at: string | null; epitaph: string | null;
  created_at: string; updated_at: string; last_reviewed_at: string | null;
}

const STATUS_LABELS: Record<string, { label: string; dot: string }> = {
  archived: { label: "已归档", dot: "bg-neutral-400" },
  dormant: { label: "休眠", dot: "bg-stone-400" },
};

interface CoronerReport {
  patterns: string[];
  categoryBreakdown: Record<string, number>;
  avgLifespan: string;
  narrative: string;
  recommendation: string;
}

export default function GraveyardPage() {
  const router = useRouter();
  const [ideas, setIdeas] = useState<Idea[]>([]);
  const [loading, setLoading] = useState(true);
  const [coronerReport, setCoronerReport] = useState<CoronerReport | null>(null);
  const [coronerLoading, setCoronerLoading] = useState(false);
  const [coronerMessage, setCoronerMessage] = useState("");
  const [showCoroner, setShowCoroner] = useState(false);

  useEffect(() => {
    fetch("/api/ideas?status=archived,dormant&pageSize=100&sort=updated")
      .then(r => r.ok ? r.json() : { ideas: [] })
      .then(data => { setIdeas(data.ideas ?? []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const fetchCoroner = async () => {
    setShowCoroner(true);
    setCoronerLoading(true);
    setCoronerMessage("");
    try {
      const r = await fetch("/api/ai/coroner", { method: "POST" });
      const data = await r.json();
      if (data.report) {
        setCoronerReport(data.report);
      } else if (data.message) {
        setCoronerMessage(data.message);
      } else {
        setCoronerMessage("AI 暂时不可用，稍后再试");
      }
    } catch {
      setCoronerMessage("AI 暂时不可用，稍后再试");
    }
    setCoronerLoading(false);
  };

  return (
    <div className="mx-auto max-w-[640px] px-6 py-8">
      {/* Back */}
      <button
        onClick={() => router.push("/")}
        className="group mb-6 flex items-center gap-1 text-[12px] text-[#a3a3a3] hover:text-amber-600 transition-colors"
      >
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="transition-transform group-hover:-translate-x-0.5">
          <path d="m15 18-6-6 6-6"/>
        </svg>
        返回
      </button>

      {/* Header */}
      <div className="mb-6 flex items-center gap-2.5">
        <div className="flex h-8 w-8 items-center justify-center rounded-[8px] bg-neutral-100 ring-1 ring-neutral-200/50">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#737373" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 1.5-1.5-1-2.74-1.5-4.5-1.5A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/>
          </svg>
        </div>
        <div>
          <h1 className="text-[16px] font-semibold text-[#171717]">想法墓地</h1>
          <p className="text-[11px] text-[#a3a3a3]">放手了的想法和它们的故事</p>
       </div>
     </div>

      {/* AI Coroner */}
      {!loading && ideas.length > 0 && (
        <div className="mb-6">
          {!showCoroner ? (
            <button onClick={fetchCoroner} className="w-full rounded-[10px] bg-white px-4 py-3.5 text-left shadow-sm ring-1 ring-[#e5e5e5] transition-all hover:shadow-md hover:ring-[#d4d4d4] active:scale-[0.99] group">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-neutral-100 ring-1 ring-neutral-200/50">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#525252" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M9 18h6M10 22h4M15.09 14c.18-.98.65-1.74 1.41-2.5A4.65 4.65 0 0 0 18 8 6 6 0 0 0 6 8c0 1 .23 2.23 1.5 3.5A4.61 4.61 0 0 1 8.91 14"/>
                  </svg>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] font-medium text-[#171717] group-hover:text-amber-600 transition-colors">AI 验尸分析</p>
                  <p className="mt-0.5 text-[11px] text-[#a3a3a3]">分析放弃模式，找出哪些想法更容易被放弃</p>
                </div>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#a3a3a3" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 group-hover:translate-x-0.5 transition-all"><path d="m9 18 6-6-6-6"/></svg>
              </div>
            </button>
          ) : (
            <div className="rounded-[10px] bg-white shadow-sm ring-1 ring-[#e5e5e5] overflow-hidden">
              <div className="flex items-center justify-between border-b border-[#f0f0f0] px-4 py-3">
                <div className="flex items-center gap-2">
                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-neutral-100 ring-1 ring-neutral-200/50">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#525252" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M9 18h6M10 22h4M15.09 14c.18-.98.65-1.74 1.41-2.5A4.65 4.65 0 0 0 18 8 6 6 0 0 0 6 8c0 1 .23 2.23 1.5 3.5A4.61 4.61 0 0 1 8.91 14"/>
                    </svg>
                  </div>
                  <span className="text-[12px] font-semibold text-[#404040]">验尸报告</span>
                </div>
                <button onClick={() => { setShowCoroner(false); setCoronerReport(null); }} className="rounded-md p-1 text-[#a3a3a3] hover:text-[#737373] hover:bg-[#f5f5f5] transition-colors">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
                </button>
              </div>
              <div className="px-4 py-4">
                {coronerLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-2 animate-bounce rounded-full bg-neutral-400" style={{ animationDelay: "0ms" }} />
                      <div className="h-2 w-2 animate-bounce rounded-full bg-neutral-400" style={{ animationDelay: "150ms" }} />
                      <div className="h-2 w-2 animate-bounce rounded-full bg-neutral-400" style={{ animationDelay: "300ms" }} />
                      <span className="text-[12px] text-[#a3a3a3] ml-1">AI 正在解剖放弃模式…</span>
                    </div>
                  </div>
                ) : coronerMessage ? (
                  <p className="py-4 text-center text-[12px] text-[#a3a3a3]">{coronerMessage}</p>
                ) : coronerReport ? (
                  <div className="space-y-4">
                    {/* Narrative */}
                    <p className="text-[13px] leading-relaxed text-[#404040]">{coronerReport.narrative}</p>
                    {/* Patterns */}
                    {coronerReport.patterns.length > 0 && (
                      <div>
                        <p className="text-[10px] font-semibold text-[#a3a3a3] uppercase tracking-[0.06em] mb-2">放弃模式</p>
                        <div className="flex flex-wrap gap-1.5">
                          {coronerReport.patterns.map((p, i) => (
                            <span key={i} className="rounded bg-neutral-50 px-2 py-0.5 text-[10px] text-[#737373] ring-1 ring-neutral-200/50">{p}</span>
                          ))}
                        </div>
                      </div>
                    )}
                    {/* Category Breakdown */}
                    {Object.keys(coronerReport.categoryBreakdown).length > 0 && (
                      <div>
                        <p className="text-[10px] font-semibold text-[#a3a3a3] uppercase tracking-[0.06em] mb-2">放弃原因分类</p>
                        <div className="flex flex-wrap gap-1.5">
                          {Object.entries(coronerReport.categoryBreakdown).map(([cat, n]) => (
                            <span key={cat} className="inline-flex items-center gap-1 rounded bg-[#fafafa] px-2 py-0.5 text-[10px] text-[#737373] ring-1 ring-[#f0f0f0]">{cat} <span className="font-medium tabular-nums">{n}</span></span>
                          ))}
                        </div>
                      </div>
                    )}
                    {/* Avg Lifespan */}
                    {coronerReport.avgLifespan && (
                      <div className="flex items-center gap-2 rounded-[8px] bg-[#fafafa] px-3 py-2 ring-1 ring-[#f0f0f0]">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#a3a3a3" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                        <span className="text-[11px] text-[#737373]">平均存活：<span className="font-medium text-[#404040]">{coronerReport.avgLifespan}</span></span>
                      </div>
                    )}
                    {/* Recommendation */}
                    {coronerReport.recommendation && (
                      <div className="rounded-[8px] bg-amber-50/50 px-3 py-2.5 ring-1 ring-amber-100">
                        <p className="text-[10px] font-semibold text-amber-600 mb-1">建议</p>
                        <p className="text-[12px] text-[#525252] leading-relaxed">{coronerReport.recommendation}</p>
                      </div>
                    )}
                    <button onClick={fetchCoroner} className="w-full rounded-[8px] bg-[#fafafa] py-2 text-[11px] text-[#737373] hover:bg-[#f5f5f5] transition-colors">重新分析</button>
                  </div>
                ) : null}
              </div>
            </div>
          )}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-24">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-[#e5e5e5] border-t-amber-500" />
        </div>
      ) : ideas.length === 0 ? (
        <div className="flex flex-col items-center py-20">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white shadow-sm ring-1 ring-[#e5e5e5] mb-5">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#a3a3a3" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 1.5-1.5-1-2.74-1.5-4.5-1.5A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/>
            </svg>
          </div>
          <p className="text-[14px] font-medium text-[#737373]">还没有安葬的想法</p>
          <p className="mt-1 text-[12px] text-[#a3a3a3]">归档或休眠的想法会在这里长眠</p>
        </div>
      ) : (
        <div className="space-y-2">
          {ideas.map((idea, i) => {
            const st = STATUS_LABELS[idea.status] ?? STATUS_LABELS.archived;
            return (
              <div key={idea.id} className="animate-slide-up" style={{ animationDelay: `${i * 30}ms` }}>
                <button
                  onClick={() => router.push(`/ideas/${idea.id}`)}
                  className="group relative w-full rounded-[10px] bg-white px-4 py-3.5 text-left shadow-sm ring-1 ring-[#e5e5e5] transition-all hover:shadow-md hover:ring-[#d4d4d4] active:scale-[0.99]"
                >
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-neutral-50 ring-1 ring-neutral-200/50">
                      <span className={`h-1.5 w-1.5 rounded-full ${st.dot}`} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="text-[13px] font-medium text-[#171717] leading-snug group-hover:text-amber-600 transition-colors line-through decoration-neutral-300/60">
                        {idea.title}
                      </h3>
                      {idea.epitaph ? (
                        <p className="mt-1 text-[12px] text-[#737373] leading-relaxed italic">{idea.epitaph}</p>
                      ) : (
                        <p className="mt-1 text-[11px] text-[#a3a3a3] italic">未留下墓志铭</p>
                      )}
                      <div className="mt-1.5 flex items-center gap-2 text-[11px] text-[#a3a3a3]">
                        <span className="flex items-center gap-1">
                          <span className={`h-1 w-1 rounded-full ${st.dot}`} />
                          {st.label}
                        </span>
                        <span>{formatRelativeTime(idea.updated_at)}</span>
                      </div>
                    </div>
                  </div>
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
