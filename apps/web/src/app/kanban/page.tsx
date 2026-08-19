"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { formatRelativeTime, truncate } from "@spark/utils";

interface Idea {
  id: string; title: string; content: string; status: string;
  collection: string; importance: number;
  is_capsule: boolean; unlock_at: string | null;
  emotion: string | null;
  created_at: string; updated_at: string; last_reviewed_at: string | null;
}

interface ApiResponse { ideas: Idea[]; total: number; page: number; pageSize: number; }

const COLUMNS = [
  { key: "seed",     label: "种子",   dot: "bg-amber-400",   header: "text-amber-700",   bg: "bg-amber-50/50",   ring: "ring-amber-200/40" },
  { key: "sprout",   label: "萌芽",   dot: "bg-emerald-400", header: "text-emerald-700", bg: "bg-emerald-50/50", ring: "ring-emerald-200/40" },
  { key: "growing",  label: "生长中", dot: "bg-sky-400",     header: "text-sky-700",    bg: "bg-sky-50/50",     ring: "ring-sky-200/40" },
  { key: "realized", label: "已实现", dot: "bg-violet-400",  header: "text-violet-700",  bg: "bg-violet-50/50",  ring: "ring-violet-200/40" },
];

const COLUMN_KEYS = COLUMNS.map(c => c.key);

const IMPORTANCE_DOTS: Record<number, string> = {
  0: "bg-neutral-300", 1: "bg-slate-400", 2: "bg-amber-400", 3: "bg-orange-500", 4: "bg-rose-500",
};

const COLLECTION_PALETTE = [
  { bg: "bg-amber-50", text: "text-amber-700", ring: "ring-amber-200/50", dot: "bg-amber-400" },
  { bg: "bg-emerald-50", text: "text-emerald-700", ring: "ring-emerald-200/50", dot: "bg-emerald-400" },
  { bg: "bg-sky-50", text: "text-sky-700", ring: "ring-sky-200/50", dot: "bg-sky-400" },
  { bg: "bg-rose-50", text: "text-rose-700", ring: "ring-rose-200/50", dot: "bg-rose-400" },
  { bg: "bg-violet-50", text: "text-violet-700", ring: "ring-violet-200/50", dot: "bg-violet-400" },
  { bg: "bg-orange-50", text: "text-orange-700", ring: "ring-orange-200/50", dot: "bg-orange-400" },
  { bg: "bg-teal-50", text: "text-teal-700", ring: "ring-teal-200/50", dot: "bg-teal-400" },
  { bg: "bg-pink-50", text: "text-pink-700", ring: "ring-pink-200/50", dot: "bg-pink-400" },
];

function getCollectionStyle(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = ((hash << 5) - hash) + name.charCodeAt(i);
  return COLLECTION_PALETTE[Math.abs(hash) % COLLECTION_PALETTE.length];
}

export default function KanbanPage() {
  const router = useRouter();
  const [ideas, setIdeas] = useState<Idea[]>([]);
  const [loading, setLoading] = useState(true);
  const [moving, setMoving] = useState<string | null>(null);

  const loadIdeas = useCallback(async () => {
    const r = await fetch("/api/ideas?pageSize=999");
    if (r.ok) {
      const data: ApiResponse = await r.json();
      setIdeas(data.ideas.filter(i => COLUMN_KEYS.includes(i.status)));
    }
    setLoading(false);
  }, []);

  useEffect(() => { loadIdeas(); }, [loadIdeas]);

  const moveIdea = async (id: string, newStatus: string) => {
    setMoving(id);
    await fetch(`/api/ideas/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });
    setIdeas(prev => prev.map(i => i.id === id ? { ...i, status: newStatus } : i));
    setMoving(null);
  };

  const getColumnIndex = (status: string) => COLUMN_KEYS.indexOf(status);

  return (
    <div className="mx-auto max-w-[1200px] px-6 py-8">
      <header className="mb-6">
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
              <h1 className="text-[15px] font-semibold tracking-tight text-[#171717]">看板</h1>
              <p className="text-[11px] text-[#a3a3a3] tracking-wide">从想到做</p>
            </div>
          </div>
          <span className="text-[12px] text-[#a3a3a3] tabular-nums">{ideas.length} 个想法</span>
        </div>
      </header>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="text-[13px] text-[#a3a3a3]">加载中…</div>
        </div>
      ) : ideas.length === 0 ? (
        <div className="flex items-center justify-center py-20">
          <div className="text-[13px] text-[#a3a3a3]">还没有想法，先去首页写几个吧</div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
          {COLUMNS.map((col, colIdx) => {
            const colIdeas = ideas.filter(i => i.status === col.key);
            const prevKey = colIdx > 0 ? COLUMN_KEYS[colIdx - 1] : null;
            const nextKey = colIdx < COLUMN_KEYS.length - 1 ? COLUMN_KEYS[colIdx + 1] : null;

            return (
              <div key={col.key} className={"rounded-[10px] p-3 ring-1 " + col.ring + " " + col.bg}>
                <div className="mb-3 flex items-center justify-between px-1">
                  <div className="flex items-center gap-1.5">
                    <span className={"h-2 w-2 rounded-full " + col.dot} />
                    <h2 className={"text-[12px] font-semibold " + col.header}>{col.label}</h2>
                  </div>
                  <span className="text-[11px] text-[#a3a3a3] tabular-nums">{colIdeas.length}</span>
                </div>

                <div className="space-y-2">
                  {colIdeas.length === 0 ? (
                    <div className="rounded-lg border border-dashed border-[#e5e5e5] px-3 py-8 text-center">
                      <span className="text-[11px] text-[#d4d4d4]">空</span>
                    </div>
                  ) : (
                    colIdeas.map(idea => {
                      const impDot = IMPORTANCE_DOTS[idea.importance] ?? IMPORTANCE_DOTS[0];
                      const colStyle = idea.collection ? getCollectionStyle(idea.collection) : null;
                      return (
                        <div
                          key={idea.id}
                          className="group rounded-[8px] bg-white px-3 py-2.5 shadow-sm ring-1 ring-[#e5e5e5] transition-all hover:shadow-md"
                        >
                          <button
                            onClick={() => router.push("/ideas/" + idea.id)}
                            className="block w-full text-left"
                          >
                            <p className="text-[13px] font-medium leading-snug text-[#171717] group-hover:text-amber-600 transition-colors line-clamp-2">
                              {idea.title}
                            </p>
                            {idea.content && (
                              <p className="mt-1 text-[11px] text-[#a3a3a3] line-clamp-1">{truncate(idea.content, 60)}</p>
                            )}
                          </button>
                          <div className="mt-2 flex items-center justify-between">
                            <div className="flex items-center gap-1.5">
                              {idea.importance > 0 && <span className={"h-1.5 w-1.5 rounded-full " + impDot} title={"重要程度 " + idea.importance} />}
                              {colStyle && idea.collection && (
                                <span className={"rounded px-1.5 py-0.5 text-[10px] font-medium " + colStyle.bg + " " + colStyle.text}>
                                  {idea.collection}
                                </span>
                              )}
                              <span className="text-[10px] text-[#a3a3a3]">{formatRelativeTime(idea.created_at)}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              {prevKey && (
                                <button
                                  onClick={() => moveIdea(idea.id, prevKey)}
                                  disabled={moving === idea.id}
                                  className="flex h-5 w-5 items-center justify-center rounded text-[#a3a3a3] hover:bg-[#f5f5f5] hover:text-[#404040] transition-colors disabled:opacity-30"
                                  title={"移至" + COLUMNS[colIdx - 1].label}
                                >
                                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M15 18l-6-6 6-6"/>
                                  </svg>
                                </button>
                              )}
                              {nextKey && (
                                <button
                                  onClick={() => moveIdea(idea.id, nextKey)}
                                  disabled={moving === idea.id}
                                  className="flex h-5 w-5 items-center justify-center rounded text-[#a3a3a3] hover:bg-[#f5f5f5] hover:text-[#404040] transition-colors disabled:opacity-30"
                                  title={"移至" + COLUMNS[colIdx + 1].label}
                                >
                                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M9 18l6-6-6-6"/>
                                  </svg>
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
