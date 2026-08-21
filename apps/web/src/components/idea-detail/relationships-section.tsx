"use client";

// 详情页关联区：手动/AI 关联管理 + 被引用（backlinks）
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { STATUS_CONFIG } from "@/lib/config";
import type { Idea } from "@/lib/types";

interface Relationship { id: string; source_id: string; target_id: string; type: string; created_by: string; ai_explanation: string | null; }
interface RelIdea { id: string; title: string; status: string; importance: number; }

const RELATIONSHIP_TYPES = [
  { value: "related", label: "相关", color: "text-sky-700", dot: "bg-sky-400" },
  { value: "conflict", label: "冲突", color: "text-rose-700", dot: "bg-rose-400" },
  { value: "derived", label: "衍生", color: "text-amber-700", dot: "bg-amber-400" },
  { value: "parent_child", label: "父子", color: "text-violet-700", dot: "bg-violet-400" },
];

export default function RelationshipsSection({ ideaId }: { ideaId: string }) {
  const router = useRouter();
  const [relationships, setRelationships] = useState<Relationship[]>([]);
  const [relIdeas, setRelIdeas] = useState<Record<string, RelIdea>>({});
  const [relSearch, setRelSearch] = useState("");
  const [relResults, setRelResults] = useState<RelIdea[]>([]);
  const [relType, setRelType] = useState("related");
  const [showRelSearch, setShowRelSearch] = useState(false);
  const [backlinks, setBacklinks] = useState<RelIdea[]>([]);

  const loadRelationships = async () => {
    try {
      const r = await fetch(`/api/relationships?idea_id=${ideaId}`);
      if (r.ok) {
        const relsJson = await r.json();
        const rels: Relationship[] = Array.isArray(relsJson) ? relsJson : (relsJson?.relationships ?? []);
        setRelationships(rels);
        const ideaIds = new Set<string>();
        rels.forEach((rel: Relationship) => { ideaIds.add(rel.source_id); ideaIds.add(rel.target_id); });
        ideaIds.delete(ideaId);
        const ideasMap: Record<string, RelIdea> = {};
        await Promise.all(Array.from(ideaIds).map(async (iid) => {
          const ir = await fetch(`/api/ideas/${iid}`);
          if (ir.ok) {
            const data = await ir.json();
            ideasMap[iid] = { id: data.id, title: data.title, status: data.status, importance: data.importance };
          }
        }));
        setRelIdeas(ideasMap);
      }
    } catch { /* best-effort */ }
  };

  const loadBacklinks = async () => {
    try {
      const r = await fetch(`/api/ideas?backlinks=${ideaId}&pageSize=50`);
      if (r.ok) {
        const data = await r.json();
        setBacklinks(data.ideas ?? []);
      }
    } catch { /* best-effort */ }
  };

  useEffect(() => {
    loadRelationships();
    loadBacklinks();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ideaId]);

  const searchIdeasForRel = async (q: string) => {
    setRelSearch(q);
    if (!q.trim()) { setRelResults([]); return; }
    try {
      const r = await fetch(`/api/ideas?q=${encodeURIComponent(q)}&pageSize=5`);
      if (r.ok) {
        const data = await r.json();
        setRelResults(data.ideas.filter((i: Idea) => i.id !== ideaId));
      }
    } catch { /* best-effort */ }
  };

  const createRelationship = async (targetId: string) => {
    try {
      const r = await fetch("/api/relationships", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ source_id: ideaId, target_id: targetId, type: relType, created_by: "user" }),
      });
      if (r.ok) {
        setRelSearch(""); setRelResults([]); setShowRelSearch(false);
        loadRelationships();
      }
    } catch { /* best-effort */ }
  };

  const deleteRelationship = async (relId: string) => {
    try {
      await fetch(`/api/relationships/${relId}`, { method: "DELETE" });
      loadRelationships();
    } catch { /* best-effort */ }
  };

  return (
    <>
      {/* Relationships */}
      <div className="border-t border-[#f0f0f0] px-6 py-5">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#737373" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 17H7A5 5 0 0 1 7 7h2"/><path d="M15 7h2a5 5 0 0 1 0 10h-2"/><path d="M8 12h8"/>
            </svg>
            <span className="text-[13px] font-semibold text-[#404040]">关联</span>
            {relationships.length > 0 && (
              <span className="rounded-full bg-[#f5f5f5] px-1.5 py-0.5 text-[11px] font-medium text-[#a3a3a3]">{relationships.length}</span>
            )}
          </div>
          <button
            onClick={() => { setShowRelSearch(!showRelSearch); setRelSearch(""); setRelResults([]); }}
            className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[12px] font-medium text-[#a3a3a3] hover:text-[#737373] hover:bg-[#f5f5f5] transition-colors"
          >
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 5v14"/><path d="M5 12h14"/>
            </svg>
            添加关联
          </button>
        </div>

        {relationships.length > 0 ? (
          <div className="space-y-1.5 mb-3">
            {relationships.map(rel => {
              const otherId = rel.source_id === ideaId ? rel.target_id : rel.source_id;
              const otherIdea = relIdeas[otherId];
              const relTypeConfig = RELATIONSHIP_TYPES.find(t => t.value === rel.type) ?? RELATIONSHIP_TYPES[0];
              return (
                <div key={rel.id} className="group flex items-center gap-2 rounded-[8px] bg-[#fafafa] px-3 py-2 ring-1 ring-[#f0f0f0]">
                  <span className={`h-1.5 w-1.5 rounded-full ${relTypeConfig.dot}`} />
                  <span className={`text-[11px] font-medium ${relTypeConfig.color}`}>{relTypeConfig.label}</span>
                  {otherIdea ? (
                    <button
                      onClick={() => router.push(`/ideas/${otherId}`)}
                      className="text-[13px] text-[#404040] hover:text-amber-600 transition-colors truncate"
                    >
                      {otherIdea.title}
                    </button>
                  ) : (
                    <span className="text-[13px] text-[#a3a3a3]">已删除的想法</span>
                  )}
                  {rel.created_by === "ai_suggested" && (
                    <span className="text-[10px] text-[#a3a3a3] bg-[#f0f0f0] rounded px-1 py-0.5">AI</span>
                  )}
                  {rel.ai_explanation && (
                    <span className="text-[12px] text-[#a3a3a3] truncate hidden sm:inline" title={rel.ai_explanation}>{rel.ai_explanation}</span>
                  )}
                  <button
                    onClick={() => deleteRelationship(rel.id)}
                    className="ml-auto opacity-0 group-hover:opacity-100 text-[#a3a3a3] hover:text-rose-500 transition-all"
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M18 6 6 18"/><path d="m6 6 12 12"/>
                    </svg>
                  </button>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-[13px] text-[#a3a3a3] mb-3">还没有关联，添加一个吧</p>
        )}

        {showRelSearch && (
          <div className="rounded-[8px] bg-white ring-1 ring-[#e5e5e5] p-3 animate-scale-in">
            <div className="flex items-center gap-1.5 mb-2.5">
              <span className="text-[11px] font-semibold text-[#a3a3a3] uppercase tracking-[0.06em] mr-1">类型</span>
              {RELATIONSHIP_TYPES.map(t => (
                <button
                  key={t.value}
                  onClick={() => setRelType(t.value)}
                  className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-[11px] font-medium transition-colors ${
                    relType === t.value
                      ? "bg-amber-50 text-amber-700 ring-1 ring-amber-200/50"
                      : "bg-[#fafafa] text-[#a3a3a3] ring-1 ring-[#f0f0f0] hover:ring-[#e5e5e5]"
                  }`}
                >
                  <span className={`h-1 w-1 rounded-full ${t.dot}`} />
                  {t.label}
                </button>
              ))}
            </div>
            <input
              placeholder="搜索想法标题..."
              value={relSearch}
              onChange={e => searchIdeasForRel(e.target.value)}
              autoFocus
              className="w-full h-8 rounded-md border border-[#e5e5e5] bg-[#fafafa] px-2.5 text-[13px] text-[#171717] placeholder:text-[#a3a3a3] focus:outline-none focus:border-amber-300 focus:ring-1 focus:ring-amber-200/50 mb-2"
            />
            {relResults.length > 0 && (
              <div className="space-y-1">
                {relResults.map(r => (
                  <button
                    key={r.id}
                    onClick={() => createRelationship(r.id)}
                    className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-[13px] hover:bg-[#f5f5f5] transition-colors text-left"
                  >
                    <span className="text-[#404040] truncate">{r.title}</span>
                    <span className="text-[11px] text-[#a3a3a3] ml-auto shrink-0">{r.status}</span>
                  </button>
                ))}
              </div>
            )}
            {relSearch.trim() && relResults.length === 0 && (
              <p className="text-[12px] text-[#a3a3a3] text-center py-1">没有找到匹配的想法</p>
            )}
          </div>
        )}
      </div>

      {/* Backlinks — 内容里包含 [[本想法标题]] 的想法 */}
      {backlinks.length > 0 && (
        <div className="border-t border-[#f0f0f0] px-6 py-5">
          <div className="flex items-center gap-2 mb-3">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#737373" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 17H7A5 5 0 0 1 7 7h2"/><path d="M15 7h2a5 5 0 0 1 0 10h-2"/><path d="M8 12h8"/>
            </svg>
            <span className="text-[13px] font-semibold text-[#404040]">被引用</span>
            <span className="rounded-full bg-[#f5f5f5] px-1.5 py-0.5 text-[11px] font-medium text-[#a3a3a3]">{backlinks.length}</span>
          </div>
          <div className="space-y-1.5">
            {backlinks.map(bl => (
              <button
                key={bl.id}
                onClick={() => router.push(`/ideas/${bl.id}`)}
                className="group flex w-full items-center gap-2 rounded-[8px] bg-[#fafafa] px-3 py-2 ring-1 ring-[#f0f0f0] hover:ring-[#e5e5e5] transition-colors text-left"
              >
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#a3a3a3" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
                  <path d="M5 12h14"/><path d="M12 5l7 7-7 7"/>
                </svg>
                <span className="text-[13px] text-[#404040] group-hover:text-amber-600 transition-colors truncate">{bl.title}</span>
                <span className={`h-1.5 w-1.5 rounded-full shrink-0 ml-auto ${(STATUS_CONFIG.find(s => s.value === bl.status) ?? STATUS_CONFIG[0]).dot}`} />
              </button>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
