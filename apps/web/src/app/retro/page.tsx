"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { formatRelativeTime } from "@spark/utils";
import { MarkdownPreview } from "@/components/markdown";

interface Idea {
  id: string; title: string; content: string; status: string;
  collection: string; importance: number;
  is_capsule: boolean; unlock_at: string | null;
  epitaph: string | null; emotion: string | null;
  created_at: string; updated_at: string; last_reviewed_at: string | null;
}

interface Relationship {
  id: string; source_id: string; target_id: string; type: string;
  created_by: string; created_at: string; ai_explanation: string | null;
}

interface ApiResponse { ideas: Idea[]; total: number; page: number; pageSize: number; }

const STATUS_CONFIG: Record<string, { label: string; dot: string; text: string; bg: string }> = {
  seed:     { label: "种子",   dot: "bg-amber-400",   text: "text-amber-700",   bg: "bg-amber-50" },
  sprout:   { label: "萌芽",   dot: "bg-emerald-400", text: "text-emerald-700", bg: "bg-emerald-50" },
  growing:  { label: "生长中", dot: "bg-sky-400",     text: "text-sky-700",     bg: "bg-sky-50" },
  realized: { label: "已实现", dot: "bg-violet-400",  text: "text-violet-700",  bg: "bg-violet-50" },
  archived: { label: "已归档", dot: "bg-neutral-400", text: "text-neutral-500", bg: "bg-neutral-50" },
  dormant:  { label: "休眠",   dot: "bg-stone-400",   text: "text-stone-500",   bg: "bg-stone-50" },
};

const IMPORTANCE_CONFIG: Record<number, { label: string; dot: string; text: string }> = {
  0: { label: "未评级",   dot: "bg-neutral-300", text: "text-neutral-500" },
  1: { label: "灵感碎片", dot: "bg-slate-400",   text: "text-slate-600" },
  2: { label: "有意思",   dot: "bg-amber-400",   text: "text-amber-700" },
  3: { label: "想做",     dot: "bg-orange-500",  text: "text-orange-700" },
  4: { label: "必做",     dot: "bg-rose-500",    text: "text-rose-700" },
};

const DAY = 86400000;

function daysSince(dateStr: string | null): number {
  if (!dateStr) return Infinity;
  return (Date.now() - new Date(dateStr).getTime()) / DAY;
}

function startOfWeek(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - d.getDay());
  return d;
}

export default function RetroPage() {
  const router = useRouter();
  const [ideas, setIdeas] = useState<Idea[]>([]);
  const [relationships, setRelationships] = useState<Relationship[]>([]);
  const [loading, setLoading] = useState(true);
  const [flashcards, setFlashcards] = useState<Idea[]>([]);
  const [flipped, setFlipped] = useState<Set<string>>(new Set());
  const [skipped, setSkipped] = useState<Set<string>>(new Set());
  const [archived, setArchived] = useState<Set<string>>(new Set());
  const [showEpitaph, setShowEpitaph] = useState<string | null>(null);
  const [epitaphText, setEpitaphText] = useState("");

  const loadData = useCallback(async () => {
    const [ideasRes, relsRes] = await Promise.all([
      fetch("/api/ideas?pageSize=999"),
      fetch("/api/relationships"),
    ]);
    const ideasData: ApiResponse = ideasRes.ok ? await ideasRes.json() : { ideas: [], total: 0, page: 0, pageSize: 0 };
    const relsRaw = relsRes.ok ? await relsRes.json() : [];
    const relsData: Relationship[] = Array.isArray(relsRaw) ? relsRaw : (relsRaw?.relationships ?? []);
    setIdeas(ideasData.ideas);
    setRelationships(relsData);
    // Pick 1-3 random ideas from 7+ days ago, not archived, not capsule-locked
    const candidates = ideasData.ideas.filter(i =>
      !i.is_capsule &&
      i.status !== "archived" &&
      daysSince(i.created_at) >= 7
    );
    const shuffled = [...candidates].sort(() => Math.random() - 0.5);
    setFlashcards(shuffled.slice(0, 3));
    setLoading(false);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const toggleFlip = (id: string) => {
    setFlipped(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const skipCard = (id: string) => {
    setSkipped(prev => new Set(prev).add(id));
  };

  const archiveCard = async (id: string) => {
    await fetch(`/api/ideas/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "archived", epitaph: epitaphText || null }),
    });
    setArchived(prev => new Set(prev).add(id));
    setShowEpitaph(null);
    setEpitaphText("");
  };

  // Weekly summary
  const weekStart = startOfWeek();
  const newThisWeek = ideas.filter(i => new Date(i.created_at) >= weekStart);
  const newRelsThisWeek = relationships.filter(r => new Date(r.created_at) >= weekStart);
  const statusChangesThisWeek = ideas.filter(i => {
    const u = new Date(i.updated_at);
    const c = new Date(i.created_at);
    return u >= weekStart && u > c && i.status !== "seed";
  });

  // Forgetting warning: >30 days unreviewed
  const forgotten = ideas.filter(i =>
    i.status !== "archived" &&
    daysSince(i.last_reviewed_at) > 30
  ).sort((a, b) => daysSince(b.last_reviewed_at) - daysSince(a.last_reviewed_at));

  const visibleFlashcards = flashcards.filter(i => !skipped.has(i.id) && !archived.has(i.id));
  const isSunday = new Date().getDay() === 0;
  const hasWeekData = newThisWeek.length > 0 || newRelsThisWeek.length > 0 || statusChangesThisWeek.length > 0;

  return (
    <div className="mx-auto max-w-[640px] px-6 py-8">
      <header className="mb-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push("/")}
              className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#f5f5f5] text-[#a3a3a3] hover:bg-[#efefef] transition-colors"
              title="返回首页"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M19 12H5M12 19l-7-7 7-7"/>
              </svg>
            </button>
            <div>
              <h1 className="text-[15px] font-semibold tracking-tight text-[#171717]">回顾中心</h1>
              <p className="text-[11px] text-[#a3a3a3] tracking-wide">让想法被持续看见</p>
            </div>
          </div>
        </div>
      </header>

      {loading && (
        <div className="flex items-center justify-center py-20">
          <div className="text-[13px] text-[#a3a3a3]">加载中…</div>
        </div>
      )}

      {!loading && (
        <>
          {/* Daily Flashcards */}
          <section className="mb-10">
            <div className="mb-4 flex items-center gap-2">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
              </svg>
              <h2 className="text-[13px] font-semibold text-[#404040]">每日闪卡</h2>
              <span className="text-[11px] text-[#a3a3a3]">翻转回看旧想法</span>
            </div>

            {visibleFlashcards.length === 0 ? (
              <div className="rounded-[10px] bg-[#fafaf9] px-4 py-8 text-center ring-1 ring-[#e5e5e5]">
                <p className="text-[13px] text-[#a3a3a3]">
                  {ideas.length < 7 ? "想法还不够多，攒到 7 条以上再来回看吧" : "今天的闪卡都看完了，明天再来"}
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {visibleFlashcards.map(idea => {
                  const isFlipped = flipped.has(idea.id);
                  const stCfg = STATUS_CONFIG[idea.status] ?? STATUS_CONFIG.seed;
                  const impCfg = IMPORTANCE_CONFIG[idea.importance] ?? IMPORTANCE_CONFIG[0];
                  const ageDays = Math.floor(daysSince(idea.created_at));

                  return (
                    <div key={idea.id} className="relative h-[200px]" style={{ perspective: "1000px" }}>
                      {/* Front: title */}
                      <button
                        onClick={() => toggleFlip(idea.id)}
                        className={"absolute inset-0 w-full rounded-[10px] bg-white px-4 py-4 text-left shadow-sm ring-1 ring-[#e5e5e5] transition-all duration-300 hover:shadow-md hover:ring-amber-200/50 active:scale-[0.99]" + (isFlipped ? " opacity-0 pointer-events-none [transform:rotateY(180deg)]" : "")}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5">
                            <span className={"h-1.5 w-1.5 rounded-full " + stCfg.dot} />
                            {idea.importance > 0 && <span className={"h-1.5 w-1.5 rounded-full " + impCfg.dot} />}
                            <span className="text-[11px] text-[#a3a3a3]">{stCfg.label}</span>
                          </div>
                          <span className="text-[11px] text-[#a3a3a3]">{ageDays} 天前</span>
                        </div>
                        <div className="mt-6 flex items-center gap-1.5">
                          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M9 18h6M10 22h4M15.09 14c.18-.98.65-1.74 1.41-2.5A4.65 4.65 0 0 0 18 8 6 6 0 0 0 6 8c0 1 .23 2.23 1.5 3.5A4.61 4.61 0 0 1 8.91 14"/>
                          </svg>
                          <span className="text-[11px] font-medium text-[#a3a3a3]">点击翻转</span>
                        </div>
                        <h3 className="mt-2 text-[15px] font-semibold leading-snug text-[#171717]">{idea.title}</h3>
                        {idea.collection && <span className="mt-2 inline-block text-[11px] text-[#a3a3a3]">{idea.collection}</span>}
                      </button>

                      {/* Back: content + actions */}
                      <div className={"absolute inset-0 w-full overflow-hidden rounded-[10px] bg-white px-4 py-4 shadow-sm ring-1 ring-[#e5e5e5] transition-all duration-300 [backface-visibility:hidden]" + (isFlipped ? " [transform:rotateY(0deg)]" : " [transform:rotateY(180deg)] opacity-0 pointer-events-none")}>
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] text-[#a3a3a3]">{formatRelativeTime(idea.created_at)}创建</span>
                          <button onClick={() => toggleFlip(idea.id)} className="text-[11px] text-[#a3a3a3] hover:text-[#404040] transition-colors">翻回</button>
                        </div>
                        <div className="mt-2 max-h-[110px] overflow-hidden text-[13px] leading-relaxed text-[#404040]">
                          {idea.content ? <MarkdownPreview content={idea.content} /> : <span className="text-[#a3a3a3]">（无内容）</span>}
                        </div>
                        <div className="absolute bottom-3 left-4 right-4 flex items-center gap-2">
                          <button
                            onClick={() => router.push("/ideas/" + idea.id)}
                            className="flex-1 rounded-md bg-amber-50 px-3 py-1.5 text-[12px] font-medium text-amber-700 ring-1 ring-amber-200/50 hover:bg-amber-100/60 transition-colors"
                          >
                            查看详情
                          </button>
                          <button
                            onClick={() => skipCard(idea.id)}
                            className="rounded-md px-3 py-1.5 text-[12px] font-medium text-[#a3a3a3] hover:bg-[#f5f5f5] transition-colors"
                          >
                            跳过
                          </button>
                          <button
                            onClick={() => { setShowEpitaph(idea.id); setEpitaphText(""); }}
                            className="rounded-md px-3 py-1.5 text-[12px] font-medium text-neutral-400 hover:bg-[#f5f5f5] transition-colors"
                            title="归档"
                          >
                            归档
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          {/* Epitaph modal */}
          {showEpitaph && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30" onClick={() => setShowEpitaph(null)}>
              <div className="mx-4 w-full max-w-sm rounded-[10px] bg-white p-5 shadow-xl ring-1 ring-[#e5e5e5]" onClick={e => e.stopPropagation()}>
                <h3 className="text-[14px] font-semibold text-[#171717]">写下放弃原因</h3>
                <p className="mt-1 text-[12px] text-[#a3a3a3]">这会成为想法的墓志铭，帮助日后回看决策模式</p>
                <textarea
                  value={epitaphText}
                  onChange={e => setEpitaphText(e.target.value)}
                  placeholder="为什么放弃这个想法？"
                  rows={3}
                  className="mt-3 w-full resize-none rounded-md border border-[#e5e5e5] px-3 py-2 text-[13px] text-[#404040] outline-none focus:border-amber-300 focus:ring-1 focus:ring-amber-200/50"
                  autoFocus
                />
                <div className="mt-3 flex justify-end gap-2">
                  <button onClick={() => setShowEpitaph(null)} className="rounded-md px-3 py-1.5 text-[12px] font-medium text-[#a3a3a3] hover:bg-[#f5f5f5] transition-colors">取消</button>
                  <button
                    onClick={() => archiveCard(showEpitaph)}
                    className="rounded-md bg-neutral-700 px-3 py-1.5 text-[12px] font-medium text-white hover:bg-neutral-800 transition-colors"
                  >
                    确认归档
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Weekly Summary */}
          <section className="mb-10">
            <div className="mb-4 flex items-center gap-2">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#0ea5e9" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>
              </svg>
              <h2 className="text-[13px] font-semibold text-[#404040]">本周摘要</h2>
              {isSunday && <span className="text-[11px] text-sky-500">今天是周日</span>}
            </div>

            {!hasWeekData ? (
              <div className="rounded-[10px] bg-[#fafaf9] px-4 py-6 text-center ring-1 ring-[#e5e5e5]">
                <p className="text-[13px] text-[#a3a3a3]">本周还没有新动态</p>
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-3">
                <div className="rounded-[10px] bg-white px-3 py-4 text-center shadow-sm ring-1 ring-[#e5e5e5]">
                  <p className="text-[22px] font-semibold tabular-nums text-[#171717]">{newThisWeek.length}</p>
                  <p className="mt-0.5 text-[11px] text-[#a3a3a3]">新增想法</p>
                </div>
                <div className="rounded-[10px] bg-white px-3 py-4 text-center shadow-sm ring-1 ring-[#e5e5e5]">
                  <p className="text-[22px] font-semibold tabular-nums text-[#171717]">{statusChangesThisWeek.length}</p>
                  <p className="mt-0.5 text-[11px] text-[#a3a3a3]">状态推进</p>
                </div>
                <div className="rounded-[10px] bg-white px-3 py-4 text-center shadow-sm ring-1 ring-[#e5e5e5]">
                  <p className="text-[22px] font-semibold tabular-nums text-[#171717]">{newRelsThisWeek.length}</p>
                  <p className="mt-0.5 text-[11px] text-[#a3a3a3]">新建关联</p>
                </div>
              </div>
            )}
          </section>

          {/* Forgetting Warning */}
          <section className="mb-10">
            <div className="mb-4 flex items-center gap-2">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                <path d="M12 9v4M12 17h.01"/>
              </svg>
              <h2 className="text-[13px] font-semibold text-[#404040]">遗忘预警</h2>
              <span className="text-[11px] text-[#a3a3a3]">超过 30 天未回看</span>
            </div>

            {forgotten.length === 0 ? (
              <div className="rounded-[10px] bg-[#fafaf9] px-4 py-6 text-center ring-1 ring-[#e5e5e5]">
                <p className="text-[13px] text-[#a3a3a3]">所有想法都在近期回看过，很好</p>
              </div>
            ) : (
              <div className="space-y-2">
                {forgotten.slice(0, 10).map(idea => {
                  const stCfg = STATUS_CONFIG[idea.status] ?? STATUS_CONFIG.seed;
                  const days = Math.floor(daysSince(idea.last_reviewed_at));
                  return (
                    <button
                      key={idea.id}
                      onClick={() => router.push("/ideas/" + idea.id)}
                      className="group flex w-full items-center gap-3 rounded-[10px] bg-white px-4 py-3 text-left shadow-sm ring-1 ring-[#e5e5e5] transition-all hover:shadow-md hover:ring-amber-200/50 active:scale-[0.99]"
                    >
                      <span className={"h-1.5 w-1.5 shrink-0 rounded-full " + stCfg.dot} />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[13px] font-medium text-[#171717] group-hover:text-amber-600 transition-colors">{idea.title}</p>
                        <p className="text-[11px] text-[#a3a3a3]">
                          {idea.last_reviewed_at ? days + " 天未回看" : "从未回看，创建于 " + formatRelativeTime(idea.created_at)}
                        </p>
                      </div>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#a3a3a3" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 group-hover:text-amber-500 transition-colors">
                        <path d="M9 18l6-6-6-6"/>
                      </svg>
                    </button>
                  );
                })}
                {forgotten.length > 10 && (
                  <p className="text-center text-[11px] text-[#a3a3a3]">还有 {forgotten.length - 10} 个想法等待回看</p>
                )}
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}
