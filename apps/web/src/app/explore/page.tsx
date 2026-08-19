"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { formatRelativeTime, truncate } from "@spark/utils";

interface Idea {
  id: string; title: string; content: string; status: string;
  collection: string; importance: number;
  is_capsule: boolean; unlock_at: string | null;
  created_at: string; updated_at: string; last_reviewed_at: string | null;
}

interface ApiResponse { ideas: Idea[]; total: number; page: number; pageSize: number; }

interface SemanticResult {
  id: string;
  title: string;
  content: string;
  status: string;
  collection: string;
  importance: number;
  created_at: string;
  reason: string;
  score: number;
}

const STATUS_LABELS: Record<string, string> = {
  seed: "种子", sprout: "萌芽", growing: "生长中",
  realized: "已实现", archived: "已归档", dormant: "休眠",
};

const IMPORTANCE_DOTS: Record<number, string> = {
  0: "bg-neutral-300", 1: "bg-slate-400", 2: "bg-amber-400", 3: "bg-orange-500", 4: "bg-rose-500",
};

const COLLECTION_PALETTE = [
  { bg: "bg-amber-50", text: "text-amber-700", dot: "bg-amber-400" },
  { bg: "bg-emerald-50", text: "text-emerald-700", dot: "bg-emerald-400" },
  { bg: "bg-sky-50", text: "text-sky-700", dot: "bg-sky-400" },
  { bg: "bg-rose-50", text: "text-rose-700", dot: "bg-rose-400" },
  { bg: "bg-violet-50", text: "text-violet-700", dot: "bg-violet-400" },
  { bg: "bg-orange-50", text: "text-orange-700", dot: "bg-orange-400" },
  { bg: "bg-teal-50", text: "text-teal-700", dot: "bg-teal-400" },
  { bg: "bg-pink-50", text: "text-pink-700", dot: "bg-pink-400" },
];

function getCollectionStyle(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = ((hash << 5) - hash) + name.charCodeAt(i);
  return COLLECTION_PALETTE[Math.abs(hash) % COLLECTION_PALETTE.length];
}

export default function ExplorePage() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState<SemanticResult[]>([]);
  const [searched, setSearched] = useState(false);
  const [mode, setMode] = useState<"semantic" | "keyword">("semantic");

  const semanticSearch = useCallback(async (q: string) => {
    if (!q.trim()) return;
    setSearching(true);
    setSearched(true);
    try {
      if (mode === "keyword") {
        const r = await fetch(`/api/ideas?q=${encodeURIComponent(q)}&pageSize=50`);
        if (r.ok) {
          const data: ApiResponse = await r.json();
          setResults(data.ideas.map(i => ({
            id: i.id, title: i.title, content: i.content || "", status: i.status,
            collection: i.collection, importance: i.importance, created_at: i.created_at,
            reason: "关键词匹配", score: 1,
          })));
        }
      } else {
        // Semantic search: fetch all ideas, then use AI to rank
        const r = await fetch("/api/ideas?pageSize=200");
        if (!r.ok) { setSearching(false); return; }
        const data: ApiResponse = await r.json();
        const ideas = data.ideas.filter(i => !i.is_capsule || (i.unlock_at && new Date(i.unlock_at) < new Date()));

        if (ideas.length === 0) {
          setResults([]);
          setSearching(false);
          return;
        }

        // Use AI to rank ideas by semantic similarity
        const aiRes = await fetch("/api/ai/embedding", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query: q, ideas: ideas.slice(0, 50).map(i => ({ id: i.id, title: i.title, content: (i.content || "").slice(0, 200) })) }),
        });

        if (aiRes.ok) {
          const aiData = await aiRes.json();
          if (aiData.results && aiData.results.length > 0) {
            const resultMap = new Map(aiData.results.map((r: any) => [r.id, r]));
            setResults(ideas
              .filter(i => resultMap.has(i.id))
              .map(i => {
                const ai = resultMap.get(i.id);
                return {
                  id: i.id, title: i.title, content: i.content || "", status: i.status,
                  collection: i.collection, importance: i.importance, created_at: i.created_at,
                  reason: ai.reason || "语义相关", score: ai.score || 0,
                };
              })
              .sort((a, b) => b.score - a.score)
            );
            setSearching(false);
            return;
          }
        }

        // Fallback to keyword search if AI fails
        const kwRes = await fetch(`/api/ideas?q=${encodeURIComponent(q)}&pageSize=50`);
        if (kwRes.ok) {
          const kwData: ApiResponse = await kwRes.json();
          setResults(kwData.ideas.map(i => ({
            id: i.id, title: i.title, content: i.content || "", status: i.status,
            collection: i.collection, importance: i.importance, created_at: i.created_at,
            reason: "关键词匹配（AI 不可用）", score: 1,
          })));
        }
      }
    } catch {
      // silent degradation
    }
    setSearching(false);
  }, [mode]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    semanticSearch(query);
  };

  return (
    <div className="mx-auto max-w-[700px] px-6 py-8">
      {/* Header */}
      <header className="mb-6 flex items-center gap-3">
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
          <h1 className="text-[15px] font-semibold tracking-tight text-[#171717]">语义搜索</h1>
          <p className="text-[11px] text-[#a3a3a3] tracking-wide">按意图搜索，不只是关键词</p>
        </div>
      </header>

      {/* Search bar */}
      <form onSubmit={handleSubmit} className="mb-4">
        <div className="flex gap-2">
          <input
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="描述你想找的想法..."
            autoFocus
            className="flex-1 rounded-lg border border-[#e5e5e5] bg-white px-3 py-2 text-[13px] text-[#171717] placeholder:text-[#a3a3a3] focus:outline-none focus:border-amber-300 focus:ring-1 focus:ring-amber-200/50"
          />
          <button
            type="submit"
            disabled={!query.trim() || searching}
            className="inline-flex items-center rounded-lg bg-[#171717] px-4 text-[12px] font-medium text-white hover:bg-[#404040] disabled:opacity-30 transition-colors"
          >
            {searching ? "搜索中..." : "搜索"}
          </button>
        </div>
        {/* Mode toggle */}
        <div className="mt-2 flex items-center gap-1">
          <button
            type="button"
            onClick={() => setMode("semantic")}
            className={"rounded px-2 py-0.5 text-[10px] font-medium transition-colors " + (mode === "semantic" ? "bg-amber-100 text-amber-700" : "text-[#a3a3a3] hover:bg-[#f5f5f5]")}
          >
            语义
          </button>
          <button
            type="button"
            onClick={() => setMode("keyword")}
            className={"rounded px-2 py-0.5 text-[10px] font-medium transition-colors " + (mode === "keyword" ? "bg-amber-100 text-amber-700" : "text-[#a3a3a3] hover:bg-[#f5f5f5]")}
          >
            关键词
          </button>
        </div>
      </form>

      {/* Results */}
      {searching && (
        <div className="flex items-center justify-center py-20">
          <div className="text-[13px] text-[#a3a3a3]">
            {mode === "semantic" ? "AI 正在理解你的意图..." : "搜索中..."}
          </div>
        </div>
      )}

      {!searching && searched && results.length === 0 && (
        <div className="flex items-center justify-center py-20">
          <div className="text-[13px] text-[#a3a3a3]">没有找到匹配的想法</div>
        </div>
      )}

      {!searching && results.length > 0 && (
        <div className="space-y-2">
          <p className="mb-3 text-[11px] text-[#a3a3a3]">{results.length} 条结果</p>
          {results.map(idea => {
            const impDot = IMPORTANCE_DOTS[idea.importance] ?? IMPORTANCE_DOTS[0];
            const colStyle = idea.collection ? getCollectionStyle(idea.collection) : null;
            return (
              <button
                key={idea.id}
                onClick={() => router.push("/ideas/" + idea.id)}
                className="group block w-full rounded-[10px] bg-white p-4 text-left shadow-sm ring-1 ring-[#e5e5e5] transition-all hover:shadow-md hover:ring-amber-200/50"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-[13px] font-medium text-[#171717] group-hover:text-amber-600 transition-colors line-clamp-2">
                      {idea.title}
                    </p>
                    {idea.content && (
                      <p className="mt-1 text-[11px] text-[#a3a3a3] line-clamp-2">{truncate(idea.content, 100)}</p>
                    )}
                  </div>
                  {mode === "semantic" && idea.score > 0 && (
                    <span className="shrink-0 rounded bg-amber-50 px-1.5 py-0.5 text-[10px] font-medium text-amber-700 tabular-nums">
                      {Math.round(idea.score * 100)}%
                    </span>
                  )}
                </div>
                <div className="mt-2 flex items-center gap-2">
                  {idea.reason && mode === "semantic" && (
                    <span className="text-[10px] text-[#a3a3a3] italic">{idea.reason}</span>
                  )}
                  {idea.importance > 0 && <span className={"h-1.5 w-1.5 rounded-full " + impDot} />}
                  {colStyle && idea.collection && (
                    <span className={"rounded px-1.5 py-0.5 text-[10px] font-medium " + colStyle.bg + " " + colStyle.text}>
                      {idea.collection}
                    </span>
                  )}
                  <span className="text-[10px] text-[#a3a3a3]">{STATUS_LABELS[idea.status] || idea.status}</span>
                  <span className="text-[10px] text-[#d4d4d4]">{formatRelativeTime(idea.created_at)}</span>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {!searching && !searched && (
        <div className="flex flex-col items-center justify-center py-20">
          <div className="mb-3">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#d4d4d4" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>
            </svg>
          </div>
          <p className="text-[13px] text-[#a3a3a3]">搜索想法的意义，而不只是文字</p>
          <p className="mt-1 text-[11px] text-[#d4d4d4]">试试"怎么提高效率"或"关于人际关系的思考"</p>
        </div>
      )}
    </div>
  );
}
