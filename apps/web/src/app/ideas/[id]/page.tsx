"use client";

import { useState, useEffect, use, useRef } from "react";
import { useRouter } from "next/navigation";
import { formatRelativeTime, DEFAULT_IMPORTANCE_LEVELS, type ImportanceLevel } from "@spark/utils";
import { MarkdownPreview } from "@/components/markdown";
import ActivityTimeline from "@/components/activity-timeline";
import { STATUS_CONFIG, IMPORTANCE_CONFIG, EMOTION_CONFIG, getCollectionStyle } from "@/lib/config";
import type { Idea } from "@/lib/types";

export default function IdeaDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [idea, setIdea] = useState<Idea | null>(null);
  const [loading, setLoading] = useState(true);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [statusOpen, setStatusOpen] = useState(false);
  const [importanceOpen, setImportanceOpen] = useState(false);
  const [importanceLabels, setImportanceLabels] = useState<ImportanceLevel[]>(DEFAULT_IMPORTANCE_LEVELS);
  const [collections, setCollections] = useState<string[]>([]);
  const [collectionOpen, setCollectionOpen] = useState(false);
const [newCollection, setNewCollection] = useState("");
  const [emotionOpen, setEmotionOpen] = useState(false);
  const statusRef = useRef<HTMLDivElement>(null);
  const importanceRef = useRef<HTMLDivElement>(null);
  const collectionRef = useRef<HTMLDivElement>(null);
  const emotionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (statusRef.current && !statusRef.current.contains(e.target as Node)) setStatusOpen(false);
      if (importanceRef.current && !importanceRef.current.contains(e.target as Node)) setImportanceOpen(false);
      if (collectionRef.current && !collectionRef.current.contains(e.target as Node)) setCollectionOpen(false);
      if (emotionRef.current && !emotionRef.current.contains(e.target as Node)) setEmotionOpen(false);
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

const [showEpitaph, setShowEpitaph] = useState(false);
const [epitaphText, setEpitaphText] = useState("");
const [epitaphIdeaId, setEpitaphIdeaId] = useState<string | null>(null);

// Relationships
interface Relationship { id: string; source_id: string; target_id: string; type: string; created_by: string; ai_explanation: string | null; }
interface RelIdea { id: string; title: string; status: string; importance: number; }
const [relationships, setRelationships] = useState<Relationship[]>([]);
const [relIdeas, setRelIdeas] = useState<Record<string, RelIdea>>({});
const [relSearch, setRelSearch] = useState("");
const [relResults, setRelResults] = useState<RelIdea[]>([]);
const [relType, setRelType] = useState("related");
const [showRelSearch, setShowRelSearch] = useState(false);

const RELATIONSHIP_TYPES = [
  { value: "related", label: "相关", color: "text-sky-700", dot: "bg-sky-400" },
  { value: "conflict", label: "冲突", color: "text-rose-700", dot: "bg-rose-400" },
  { value: "derived", label: "衍生", color: "text-amber-700", dot: "bg-amber-400" },
  { value: "parent_child", label: "父子", color: "text-violet-700", dot: "bg-violet-400" },
];

// Backlinks (ideas whose content contains [[this idea's title]])
const [backlinks, setBacklinks] = useState<RelIdea[]>([]);

// AI Retro dialogue (for unlocked capsules)
interface RetroMessage { role: "user" | "assistant"; content: string; }
const [retroMessages, setRetroMessages] = useState<RetroMessage[]>([]);
const [retroInput, setRetroInput] = useState("");
const [retroLoading, setRetroLoading] = useState(false);
const [showRetro, setShowRetro] = useState(false);
const [aiEnabled, setAiEnabled] = useState(false);
const [aiFeatures, setAiFeatures] = useState<Record<string, boolean>>({ retro: true });
const [retroEnded, setRetroEnded] = useState(false);
const [retroSummary, setRetroSummary] = useState("");

// AI Devil's Advocate
interface DevilChallenge { angle: string; challenge: string; }
const [devilChallenges, setDevilChallenges] = useState<DevilChallenge[]>([]);
const [devilLoading, setDevilLoading] = useState(false);
const [showDevil, setShowDevil] = useState(false);

// AI Cross-Domain Translator
interface TranslateResult { targetDomain: string; perspective: string; questions: string[]; }
const [translateResult, setTranslateResult] = useState<TranslateResult | null>(null);
const [translateLoading, setTranslateLoading] = useState(false);
const [showTranslate, setShowTranslate] = useState(false);

useEffect(() => {
    fetch("/api/collections").then(r => r.ok ? r.json() : []).then((d: any[]) => setCollections(d.map(c => c.name)));
    loadRelationships();
    loadBacklinks();
    fetch("/api/settings").then(r => r.ok ? r.json() : null).then(d => {
      if (d?.importance_levels) setImportanceLabels(d.importance_levels);
      if (d?.ai_enabled !== undefined) setAiEnabled(d.ai_enabled);
      if (d?.ai_features) setAiFeatures(d.ai_features);
    });
    fetch(`/api/ideas/${id}`).then(r => r.ok ? r.json() : null).then(d => {
      setIdea(d); setLoading(false);
      // Record review timestamp (fire-and-forget, no UI dependency)
      if (d) {
        fetch(`/api/ideas/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ last_reviewed_at: new Date().toISOString() }),
        }).catch(() => {});
      }
    }).catch(() => setLoading(false));
  }, [id]);

 const changeStatus = async (status: string) => {
   const r = await fetch(`/api/ideas/${id}`, {
     method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status }),
   });
   if (r.ok) setIdea(await r.json());
   setStatusOpen(false);
   if (r.ok && (status === "archived" || status === "dormant")) {
     setEpitaphIdeaId(id);
     setShowEpitaph(true);
   }
 };

 const submitEpitaph = async () => {
   if (!epitaphIdeaId || !epitaphText.trim()) { setShowEpitaph(false); return; }
   try {
     await fetch(`/api/ideas/${epitaphIdeaId}`, {
       method: "PATCH", headers: { "Content-Type": "application/json" },
       body: JSON.stringify({ epitaph: epitaphText.trim() }),
     });
   } catch { /* best-effort */ }
   setShowEpitaph(false); setEpitaphText(""); setEpitaphIdeaId(null);
 };

  const changeImportance = async (importance: number) => {
    const r = await fetch(`/api/ideas/${id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ importance }),
    });
    if (r.ok) setIdea(await r.json());
    setImportanceOpen(false);
  };

  const changeCollection = async (collection: string) => {
    const r = await fetch(`/api/ideas/${id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ collection }),
    });
    if (r.ok) {
     setIdea(await r.json());
      fetch("/api/collections").then(r => r.ok ? r.json() : []).then((d: any[]) => setCollections(d.map(c => c.name)));
   }
   setCollectionOpen(false);
 };

  const changeEmotion = async (emotion: string) => {
    const r = await fetch(`/api/ideas/${id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ emotion: emotion || null }),
    });
    if (r.ok) setIdea(await r.json());
   setEmotionOpen(false);
 };

  const loadRelationships = async () => {
    if (!id) return;
    try {
      const r = await fetch(`/api/relationships?idea_id=${id}`);
      if (r.ok) {
        const relsJson = await r.json();
        const rels: Relationship[] = Array.isArray(relsJson) ? relsJson : (relsJson?.relationships ?? []);
        setRelationships(rels);
        // Fetch related idea details
        const ideaIds = new Set<string>();
        rels.forEach((rel: Relationship) => { ideaIds.add(rel.source_id); ideaIds.add(rel.target_id); });
        ideaIds.delete(id);
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
    if (!id) return;
    try {
      const r = await fetch(`/api/ideas?backlinks=${id}&pageSize=50`);
      if (r.ok) {
        const data = await r.json();
        setBacklinks(data.ideas ?? []);
      }
    } catch { /* best-effort */ }
  };

  const searchIdeasForRel = async (q: string) => {
    setRelSearch(q);
    if (!q.trim()) { setRelResults([]); return; }
    try {
      const r = await fetch(`/api/ideas?q=${encodeURIComponent(q)}&pageSize=5`);
      if (r.ok) {
        const data = await r.json();
        setRelResults(data.ideas.filter((i: Idea) => i.id !== id));
      }
    } catch { /* best-effort */ }
  };

  const createRelationship = async (targetId: string) => {
    try {
      const r = await fetch("/api/relationships", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ source_id: id, target_id: targetId, type: relType, created_by: "user" }),
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

const handleDelete = async () => {
   setDeleting(true);
   const r = await fetch(`/api/ideas/${id}`, { method: "DELETE" });
   if (r.ok) router.push("/");
   setDeleting(false);
 };

 const startRetro = async () => {
   setShowRetro(true);
   setRetroMessages([]);
   setRetroEnded(false);
   setRetroSummary("");
   setRetroLoading(true);
   try {
     const r = await fetch("/api/ai/retro", {
       method: "POST",
       headers: { "Content-Type": "application/json" },
       body: JSON.stringify({ idea_id: id }),
     });
     if (r.ok) {
       const data = await r.json();
       if (data.reply) {
         setRetroMessages([{ role: "assistant", content: data.reply }]);
       }
     }
   } catch { /* silent */ }
   setRetroLoading(false);
 };

 const sendRetroMessage = async () => {
   if (!retroInput.trim() || retroLoading) return;
   const userMsg = retroInput.trim();
   setRetroInput("");
   const newMessages = [...retroMessages, { role: "user" as const, content: userMsg }];
   setRetroMessages(newMessages);
   setRetroLoading(true);
   try {
     const r = await fetch("/api/ai/retro", {
       method: "POST",
       headers: { "Content-Type": "application/json" },
       body: JSON.stringify({
         idea_id: id,
         history: newMessages.map(m => ({ role: m.role, content: m.content })),
       }),
     });
     if (r.ok) {
       const data = await r.json();
       if (data.reply) {
         setRetroMessages([...newMessages, { role: "assistant", content: data.reply }]);
       }
     }
   } catch { /* silent */ }
   setRetroLoading(false);
 };

 const endRetro = async () => {
   if (retroSummary.trim()) {
     try {
       await fetch(`/api/ideas/${id}/activities`, {
         method: "POST",
         headers: { "Content-Type": "application/json" },
         body: JSON.stringify({ type: "note", content: `回望反思：${retroSummary.trim()}` }),
       });
     } catch { /* best-effort */ }
   }
  setShowRetro(false);
  setRetroMessages([]);
  setRetroEnded(false);
  setRetroSummary("");
};

 const fetchDevil = async () => {
   setShowDevil(true);
   setDevilLoading(true);
   try {
     const r = await fetch("/api/ai/devil", {
       method: "POST",
       headers: { "Content-Type": "application/json" },
       body: JSON.stringify({ idea_id: id, title: idea?.title, content: idea?.content }),
     });
     if (r.ok) {
       const data = await r.json();
       setDevilChallenges(data.challenges ?? []);
     }
   } catch { /* silent */ }
   setDevilLoading(false);
 };

 const fetchTranslate = async () => {
   setShowTranslate(true);
   setTranslateLoading(true);
   try {
     const r = await fetch("/api/ai/translate", {
       method: "POST",
       headers: { "Content-Type": "application/json" },
       body: JSON.stringify({ idea_id: id }),
     });
     if (r.ok) {
       const data = await r.json();
       setTranslateResult(data.result);
     }
   } catch { /* silent */ }
   setTranslateLoading(false);
 };

 if (loading) return (
    <div className="mx-auto max-w-[640px] px-6 py-8">
      <div className="flex items-center justify-center py-24">
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-[#e5e5e5] border-t-amber-500" />
      </div>
    </div>
  );

  if (!idea) return (
    <div className="mx-auto max-w-[640px] px-6 py-8">
      <div className="flex flex-col items-center py-20">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white shadow-sm ring-1 ring-[#e5e5e5] mb-4">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#a3a3a3" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"/><path d="m15 9-6 6"/><path d="m9 9 6 6"/>
          </svg>
        </div>
        <p className="text-[14px] font-medium text-[#737373]">想法不存在</p>
        <button onClick={() => router.push("/")} className="mt-3 text-[12px] text-amber-600 hover:text-amber-700 transition-colors">返回首页</button>
      </div>
    </div>
  );

 const cur = STATUS_CONFIG.find(s => s.value === idea.status) ?? STATUS_CONFIG[0];
  const curImp = IMPORTANCE_CONFIG.find(c => c.value === idea.importance) ?? IMPORTANCE_CONFIG[0];
 const curImpLabel = importanceLabels.find(l => l.value === idea.importance)?.label ?? curImp.label;

const isSealed = !!idea.is_capsule && !!idea.unlock_at && new Date(idea.unlock_at) > new Date();
 const capsuleDays = isSealed && idea.unlock_at ? Math.ceil((new Date(idea.unlock_at).getTime() - Date.now()) / 86400000) : 0;

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

      {/* Card */}
      <div className="rounded-[10px] bg-white shadow-sm ring-1 ring-[#e5e5e5] overflow-hidden">
        {/* Header */}
        <div className="border-b border-[#f0f0f0] px-5 py-4">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2.5 mb-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-[8px] bg-amber-50 ring-1 ring-amber-200/50">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 2l2 7h7l-5.5 4 2 7L12 16l-5.5 4 2-7L3 9h7z"/>
                  </svg>
                </div>
                <h1 className="text-[16px] font-semibold text-[#171717] leading-snug">{idea.title}</h1>
              </div>
              <div className="flex items-center gap-3 text-[12px] text-[#a3a3a3]">
                <span className="flex items-center gap-1.5">
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
                  </svg>
                  {formatRelativeTime(idea.created_at)}
                </span>
                {idea.updated_at !== idea.created_at && (
                  <span className="flex items-center gap-1.5">
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/>
                    </svg>
                    编辑于 {formatRelativeTime(idea.updated_at)}
                  </span>
                )}
              </div>
            </div>
            <div className="flex shrink-0 gap-1">
              <button
                onClick={() => router.push(`/ideas/${id}/edit`)}
                className="inline-flex h-7 items-center rounded-md border border-[#e5e5e5] bg-white px-2.5 text-[11px] font-medium text-[#737373] hover:bg-[#fafafa] hover:text-amber-600 transition-colors"
              >
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-1">
                  <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/>
                </svg>
                编辑
              </button>
              <button
                onClick={() => setConfirmDelete(true)}
                className="inline-flex h-7 items-center rounded-md border border-[#e5e5e5] bg-white px-2 text-[#a3a3a3] hover:bg-red-50 hover:text-red-400 hover:border-red-200 transition-colors"
                title="删除"
              >
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/>
                </svg>
              </button>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="px-5 py-4 space-y-5">
          {/* Status & Collection */}
          <div className="flex items-center gap-6">
            <div>
             <label className="block text-[10px] font-semibold text-[#a3a3a3] uppercase tracking-[0.06em] mb-1.5">状态</label>
              <div ref={statusRef} className="relative">
                <button
                  onClick={() => setStatusOpen(!statusOpen)}
                  className="flex items-center gap-2 rounded-md border border-[#e5e5e5] bg-white px-2.5 py-1.5 hover:bg-[#fafafa] transition-colors"
                >
                  <span className={`h-1.5 w-1.5 rounded-full ${cur.dot}`} />
                  <span className={`text-[12px] font-medium ${cur.text}`}>{cur.label}</span>
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#a3a3a3" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`ml-0.5 transition-transform ${statusOpen ? "rotate-180" : ""}`}>
                    <polyline points="6 9 12 15 18 9"/>
                  </svg>
                </button>
                {statusOpen && (
                  <div className="absolute top-full left-0 mt-1.5 w-36 rounded-[8px] bg-white shadow-lg ring-1 ring-[#e5e5e5] z-10 py-1 animate-scale-in">
                    {STATUS_CONFIG.map(s => (
                      <button
                        key={s.value}
                        onClick={() => changeStatus(s.value)}
                        className={`flex w-full items-center gap-2 px-3 py-1.5 text-[12px] hover:bg-[#f5f5f5] transition-colors ${s.value === idea.status ? "bg-amber-50/50" : ""}`}
                      >
                        <span className={`h-1.5 w-1.5 rounded-full ${s.dot}`} />
                        <span className={s.text}>{s.label}</span>
                        {s.value === idea.status && (
                          <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="ml-auto">
                            <polyline points="20 6 9 17 4 12"/>
                          </svg>
                        )}
                      </button>
                    ))}
                  </div>
                )}
             </div>
           </div>

            <div>
             <label className="block text-[10px] font-semibold text-[#a3a3a3] uppercase tracking-[0.06em] mb-1.5">重要程度</label>
              <div ref={importanceRef} className="relative">
                <button
                  onClick={() => setImportanceOpen(!importanceOpen)}
                  className="flex items-center gap-2 rounded-md border border-[#e5e5e5] bg-white px-2.5 py-1.5 hover:bg-[#fafafa] transition-colors"
                >
                  <span className={`h-1.5 w-1.5 rounded-full ${curImp.dot}`} />
                  <span className={`text-[12px] font-medium ${curImp.text}`}>{curImpLabel}</span>
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#a3a3a3" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`ml-0.5 transition-transform ${importanceOpen ? "rotate-180" : ""}`}>
                    <polyline points="6 9 12 15 18 9"/>
                  </svg>
                </button>
                {importanceOpen && (
                  <div className="absolute top-full left-0 mt-1.5 w-36 rounded-[8px] bg-white shadow-lg ring-1 ring-[#e5e5e5] z-10 py-1 animate-scale-in">
                    {IMPORTANCE_CONFIG.map(c => {
                      const label = importanceLabels.find(l => l.value === c.value)?.label ?? c.label;
                      return (
                        <button
                          key={c.value}
                          onClick={() => changeImportance(c.value)}
                          className={`flex w-full items-center gap-2 px-3 py-1.5 text-[12px] hover:bg-[#f5f5f5] transition-colors ${c.value === idea.importance ? "bg-amber-50/50" : ""}`}
                        >
                          <span className={`h-1.5 w-1.5 rounded-full ${c.dot}`} />
                          <span className={c.text}>{label}</span>
                          {c.value === idea.importance && (
                            <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="ml-auto">
                              <polyline points="20 6 9 17 4 12"/>
                            </svg>
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            <div>
             <label className="block text-[10px] font-semibold text-[#a3a3a3] uppercase tracking-[0.06em] mb-1.5">集合</label>
              <div ref={collectionRef} className="relative">
                <button
                  onClick={() => { setCollectionOpen(!collectionOpen); setNewCollection(""); }}
                  className="flex items-center gap-2 rounded-md border border-[#e5e5e5] bg-white px-2.5 py-1.5 hover:bg-[#fafafa] transition-colors min-h-[30px]"
                >
                  {idea.collection ? (
                    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ring-1 ${getCollectionStyle(idea.collection).bg} ${getCollectionStyle(idea.collection).text} ${getCollectionStyle(idea.collection).ring}`}>
                      <span className={`h-1 w-1 rounded-full ${getCollectionStyle(idea.collection).dot}`} />
                      {idea.collection}
                    </span>
                  ) : (
                    <span className="text-[12px] text-[#a3a3a3]">无</span>
                  )}
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#a3a3a3" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`ml-0.5 transition-transform ${collectionOpen ? "rotate-180" : ""}`}>
                    <polyline points="6 9 12 15 18 9"/>
                  </svg>
                </button>
                {collectionOpen && (
                  <div className="absolute top-full left-0 mt-1.5 w-52 rounded-[8px] bg-white shadow-lg ring-1 ring-[#e5e5e5] z-10 py-1.5 animate-scale-in">
                    <div className="px-2.5 pb-1.5">
                      <div className="flex items-center gap-1.5">
                        <input
                          placeholder="新建集合..."
                          value={newCollection}
                          onChange={e => setNewCollection(e.target.value)}
                          onKeyDown={e => {
                            if (e.key === "Enter" && newCollection.trim()) {
                              changeCollection(newCollection.trim());
                            }
                          }}
                          className="h-7 w-full rounded-md border border-[#e5e5e5] bg-[#fafafa] px-2.5 text-[12px] text-[#171717] placeholder:text-[#a3a3a3] focus:outline-none focus:border-amber-300 focus:ring-1 focus:ring-amber-200/50"
                        />
                      </div>
                    </div>
                    {collections.length > 0 && (
                      <div className="border-t border-[#f0f0f0] pt-1.5">
                        <div className="px-2.5 pb-1">
                          <p className="text-[10px] font-semibold text-[#a3a3a3] uppercase tracking-[0.06em]">已有集合</p>
                        </div>
                        {collections.map(name => (
                          <button
                            key={name}
                            onClick={() => changeCollection(name)}
                            className={`flex w-full items-center gap-2 px-3 py-1.5 text-[12px] hover:bg-[#f5f5f5] transition-colors ${name === idea.collection ? "bg-amber-50/50" : ""}`}
                          >
                            <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ring-1 ${getCollectionStyle(name).bg} ${getCollectionStyle(name).text} ${getCollectionStyle(name).ring}`}>
                              <span className={`h-1 w-1 rounded-full ${getCollectionStyle(name).dot}`} />
                              {name}
                            </span>
                            {name === idea.collection && (
                              <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="ml-auto">
                                <polyline points="20 6 9 17 4 12"/>
                              </svg>
                            )}
                          </button>
                        ))}
                      </div>
                    )}
                    {idea.collection && (
                      <div className="border-t border-[#f0f0f0] mt-1.5 pt-1.5">
                        <button
                          onClick={() => changeCollection("")}
                          className="flex w-full items-center gap-2 px-3 py-1.5 text-[12px] text-[#a3a3a3] hover:text-red-500 hover:bg-red-50 transition-colors"
                        >
                          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M18 6 6 18"/><path d="m6 6 12 12"/>
                          </svg>
                          移除集合
                        </button>
                      </div>
                    )}
                  </div>
                )}
             </div>
           </div>
            <div>
             <label className="block text-[10px] font-semibold text-[#a3a3a3] uppercase tracking-[0.06em] mb-1.5">情绪</label>
              <div ref={emotionRef} className="relative">
                <button
                  onClick={() => setEmotionOpen(!emotionOpen)}
                  className="flex items-center gap-2 rounded-md border border-[#e5e5e5] bg-white px-2.5 py-1.5 hover:bg-[#fafafa] transition-colors"
                >
                  {idea.emotion ? (
                    <>
                      <span className={`h-1.5 w-1.5 rounded-full ${EMOTION_CONFIG.find(e => e.value === idea.emotion)?.dot ?? "bg-neutral-300"}`} />
                      <span className={`text-[12px] font-medium ${EMOTION_CONFIG.find(e => e.value === idea.emotion)?.text ?? ""}`}>
                        {EMOTION_CONFIG.find(e => e.value === idea.emotion)?.label ?? idea.emotion}
                      </span>
                    </>
                  ) : (
                    <span className="text-[12px] text-[#a3a3a3]">无</span>
                  )}
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#a3a3a3" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`ml-0.5 transition-transform ${emotionOpen ? "rotate-180" : ""}`}>
                    <polyline points="6 9 12 15 18 9"/>
                  </svg>
                </button>
                {emotionOpen && (
                  <div className="absolute top-full left-0 mt-1.5 w-36 rounded-[8px] bg-white shadow-lg ring-1 ring-[#e5e5e5] z-10 py-1 animate-scale-in">
                    {EMOTION_CONFIG.map(em => (
                      <button
                        key={em.value}
                        onClick={() => changeEmotion(em.value)}
                        className={`flex w-full items-center gap-2 px-3 py-1.5 text-[12px] hover:bg-[#f5f5f5] transition-colors ${em.value === idea.emotion ? "bg-amber-50/50" : ""}`}
                      >
                        <span className={`h-1.5 w-1.5 rounded-full ${em.dot}`} />
                        <span className={em.text}>{em.label}</span>
                        {em.value === idea.emotion && (
                          <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="ml-auto">
                            <polyline points="20 6 9 17 4 12"/>
                          </svg>
                        )}
                      </button>
                    ))}
                    {idea.emotion && (
                      <button
                        onClick={() => changeEmotion("")}
                        className="flex w-full items-center gap-2 px-3 py-1.5 text-[12px] text-[#a3a3a3] hover:bg-[#f5f5f5] transition-colors border-t border-[#f0f0f0] mt-1"
                      >
                        清除
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

         {/* Content */}
         <div>
           <label className="block text-[10px] font-semibold text-[#a3a3a3] uppercase tracking-[0.06em] mb-2">内容</label>
           {isSealed ? (
             <div className="rounded-[8px] bg-violet-50/50 p-6 text-center ring-1 ring-violet-100">
               <div className="flex h-12 w-12 mx-auto items-center justify-center rounded-full bg-violet-100 mb-3">
                 <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#8b5cf6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                   <rect width="18" height="11" x="3" y="11" rx="2" ry="2"/>
                   <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                 </svg>
               </div>
               <p className="text-[13px] font-medium text-violet-700">时间胶囊已密封</p>
               <p className="mt-1 text-[11px] text-violet-400">{capsuleDays} 天后解锁</p>
             </div>
           ) : idea.content ? (
             <div className="rounded-[8px] bg-[#fafafa] p-4 text-[13px] leading-relaxed text-[#171717] ring-1 ring-[#f0f0f0]">
               <MarkdownPreview content={idea.content} />
             </div>
           ) : (
             <div className="rounded-[8px] bg-[#fafafa] p-4 text-center text-[13px] text-[#a3a3a3] ring-1 ring-[#f0f0f0]">
               暂无详细内容
             </div>
           )}
         </div>

         {/* Epitaph */}
         {idea.epitaph && (
           <div className="rounded-[8px] bg-neutral-50 p-4 ring-1 ring-neutral-200/50">
             <div className="flex items-center gap-2 mb-1.5">
               <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#737373" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                 <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 1.5-1.5-1-2.74-1.5-4.5-1.5A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/>
               </svg>
               <span className="text-[10px] font-semibold text-[#a3a3a3] uppercase tracking-[0.06em]">墓志铭</span>
             </div>
            <p className="text-[13px] text-[#737373] leading-relaxed italic">{idea.epitaph}</p>
         </div>
        )}
      </div>

       {/* Relationships */}
       {!isSealed && (
         <div className="border-t border-[#f0f0f0] px-5 py-4">
           <div className="flex items-center justify-between mb-3">
             <div className="flex items-center gap-2">
               <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#737373" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                 <path d="M9 17H7A5 5 0 0 1 7 7h2"/><path d="M15 7h2a5 5 0 0 1 0 10h-2"/><path d="M8 12h8"/>
               </svg>
               <span className="text-[12px] font-semibold text-[#404040]">关联</span>
               {relationships.length > 0 && (
                 <span className="rounded-full bg-[#f5f5f5] px-1.5 py-0.5 text-[10px] font-medium text-[#a3a3a3]">{relationships.length}</span>
               )}
             </div>
             <button
               onClick={() => { setShowRelSearch(!showRelSearch); setRelSearch(""); setRelResults([]); }}
               className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium text-[#a3a3a3] hover:text-[#737373] hover:bg-[#f5f5f5] transition-colors"
             >
               <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                 <path d="M12 5v14"/><path d="M5 12h14"/>
               </svg>
               添加关联
             </button>
           </div>

           {/* Existing relationships */}
           {relationships.length > 0 ? (
             <div className="space-y-1.5 mb-3">
               {relationships.map(rel => {
                 const otherId = rel.source_id === id ? rel.target_id : rel.source_id;
                 const otherIdea = relIdeas[otherId];
                 const relType = RELATIONSHIP_TYPES.find(t => t.value === rel.type) ?? RELATIONSHIP_TYPES[0];
                 return (
                   <div key={rel.id} className="group flex items-center gap-2 rounded-[8px] bg-[#fafafa] px-3 py-2 ring-1 ring-[#f0f0f0]">
                     <span className={`h-1.5 w-1.5 rounded-full ${relType.dot}`} />
                     <span className={`text-[10px] font-medium ${relType.color}`}>{relType.label}</span>
                     {otherIdea ? (
                       <button
                         onClick={() => router.push(`/ideas/${otherId}`)}
                         className="text-[12px] text-[#404040] hover:text-amber-600 transition-colors truncate"
                       >
                         {otherIdea.title}
                       </button>
                     ) : (
                       <span className="text-[12px] text-[#a3a3a3]">已删除的想法</span>
                     )}
                     {rel.created_by === "ai_suggested" && (
                       <span className="text-[9px] text-[#a3a3a3] bg-[#f0f0f0] rounded px-1 py-0.5">AI</span>
                     )}
                     {rel.ai_explanation && (
                       <span className="text-[11px] text-[#a3a3a3] truncate hidden sm:inline" title={rel.ai_explanation}>{rel.ai_explanation}</span>
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
             <p className="text-[12px] text-[#a3a3a3] mb-3">还没有关联，添加一个吧</p>
           )}

           {/* Search & create */}
           {showRelSearch && (
             <div className="rounded-[8px] bg-white ring-1 ring-[#e5e5e5] p-3 animate-scale-in">
               {/* Type selector */}
               <div className="flex items-center gap-1.5 mb-2.5">
                 <span className="text-[10px] font-semibold text-[#a3a3a3] uppercase tracking-[0.06em] mr-1">类型</span>
                 {RELATIONSHIP_TYPES.map(t => (
                   <button
                     key={t.value}
                     onClick={() => setRelType(t.value)}
                     className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-[10px] font-medium transition-colors ${
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
               {/* Search input */}
               <input
                 placeholder="搜索想法标题..."
                 value={relSearch}
                 onChange={e => searchIdeasForRel(e.target.value)}
                 autoFocus
                 className="w-full h-8 rounded-md border border-[#e5e5e5] bg-[#fafafa] px-2.5 text-[12px] text-[#171717] placeholder:text-[#a3a3a3] focus:outline-none focus:border-amber-300 focus:ring-1 focus:ring-amber-200/50 mb-2"
               />
               {/* Results */}
               {relResults.length > 0 && (
                 <div className="space-y-1">
                   {relResults.map(r => (
                     <button
                       key={r.id}
                       onClick={() => createRelationship(r.id)}
                       className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-[12px] hover:bg-[#f5f5f5] transition-colors text-left"
                     >
                       <span className="text-[#404040] truncate">{r.title}</span>
                       <span className="text-[10px] text-[#a3a3a3] ml-auto shrink-0">{r.status}</span>
                     </button>
                   ))}
                 </div>
               )}
               {relSearch.trim() && relResults.length === 0 && (
                 <p className="text-[11px] text-[#a3a3a3] text-center py-1">没有找到匹配的想法</p>
               )}
             </div>
           )}
       </div>
     )}

      {/* AI Devil's Advocate */}
      {!isSealed && aiEnabled && aiFeatures.devil !== false && idea.status !== "archived" && idea.status !== "dormant" && (
        <div className="border-t border-[#f0f0f0] px-5 py-4">
          {showDevil ? (
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-rose-100 ring-1 ring-rose-200/50">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#e11d48" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Z"/><path d="M16 10l-4 4"/><path d="M8 14l4-4"/>
                    </svg>
                  </div>
                  <span className="text-[12px] font-semibold text-rose-700">反方辩手</span>
                </div>
                <button onClick={() => { setShowDevil(false); setDevilChallenges([]); }} className="rounded-md p-1 text-[#a3a3a3] hover:text-[#737373] hover:bg-[#f5f5f5] transition-colors">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
                </button>
              </div>
              {devilLoading ? (
                <div className="flex items-center gap-2 py-4">
                  <div className="h-2 w-2 animate-bounce rounded-full bg-rose-300" style={{ animationDelay: "0ms" }} />
                  <div className="h-2 w-2 animate-bounce rounded-full bg-rose-300" style={{ animationDelay: "150ms" }} />
                  <div className="h-2 w-2 animate-bounce rounded-full bg-rose-300" style={{ animationDelay: "300ms" }} />
                  <span className="text-[12px] text-[#a3a3a3]">AI 正在准备反驳…</span>
                </div>
              ) : devilChallenges.length > 0 ? (
                <div className="space-y-2">
                  {devilChallenges.map((ch, i) => (
                    <div key={i} className="rounded-[8px] bg-rose-50/50 px-3 py-2.5 ring-1 ring-rose-100">
                      <p className="text-[11px] font-semibold text-rose-600 mb-1">{ch.angle}</p>
                      <p className="text-[12px] text-[#404040] leading-relaxed">{ch.challenge}</p>
                    </div>
                  ))}
                  <button onClick={fetchDevil} className="w-full rounded-[8px] bg-[#fafafa] py-2 text-[11px] text-[#737373] hover:bg-[#f5f5f5] transition-colors">换个角度挑战</button>
                </div>
              ) : (
                <p className="text-[12px] text-[#a3a3a3] py-2">AI 暂时无法生成反驳，稍后再试</p>
              )}
            </div>
          ) : (
            <button onClick={fetchDevil} className="w-full rounded-[8px] bg-rose-50/50 px-4 py-3 text-left ring-1 ring-rose-100 hover:ring-rose-200/60 transition-all group">
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-rose-100 ring-1 ring-rose-200/50">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#e11d48" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Z"/><path d="M16 10l-4 4"/><path d="M8 14l4-4"/>
                  </svg>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] font-medium text-rose-700 group-hover:text-rose-600 transition-colors">让 AI 当你的反方辩手</p>
                  <p className="mt-0.5 text-[11px] text-[#a3a3a3]">从对立面挑战这个想法，帮你发现盲区</p>
                </div>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#a3a3a3" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 group-hover:translate-x-0.5 group-hover:text-rose-500 transition-all"><path d="m9 18 6-6-6-6"/></svg>
              </div>
            </button>
          )}
        </div>
      )}

      {/* AI Cross-Domain Translator */}
      {!isSealed && aiEnabled && aiFeatures.translate !== false && idea.status !== "archived" && idea.status !== "dormant" && (
        <div className="border-t border-[#f0f0f0] px-5 py-4">
          {showTranslate ? (
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-sky-100 ring-1 ring-sky-200/50">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#0284c7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M5 8l6 6"/><path d="m4 14 6-6"/><path d="M2 5h12"/><path d="M7 2h1"/><path d="M22 22l-5-10-5 10"/><path d="M14 18h6"/>
                    </svg>
                  </div>
                  <span className="text-[12px] font-semibold text-sky-700">跨界翻译</span>
                </div>
                <button onClick={() => { setShowTranslate(false); setTranslateResult(null); }} className="rounded-md p-1 text-[#a3a3a3] hover:text-[#737373] hover:bg-[#f5f5f5] transition-colors">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
                </button>
              </div>
              {translateLoading ? (
                <div className="flex items-center gap-2 py-4">
                  <div className="h-2 w-2 animate-bounce rounded-full bg-sky-300" style={{ animationDelay: "0ms" }} />
                  <div className="h-2 w-2 animate-bounce rounded-full bg-sky-300" style={{ animationDelay: "150ms" }} />
                  <div className="h-2 w-2 animate-bounce rounded-full bg-sky-300" style={{ animationDelay: "300ms" }} />
                  <span className="text-[12px] text-[#a3a3a3]">AI 正在跨界寻找灵感…</span>
                </div>
              ) : translateResult ? (
                <div className="space-y-3">
                  <div className="rounded-[8px] bg-sky-50/50 px-3 py-2.5 ring-1 ring-sky-100">
                    <div className="flex items-center gap-1.5 mb-1">
                      <span className="text-[10px] font-semibold text-sky-600">目标领域</span>
                      <span className="rounded bg-sky-100 px-1.5 py-0.5 text-[10px] font-medium text-sky-700">{translateResult.targetDomain}</span>
                    </div>
                    <p className="text-[12px] text-[#404040] leading-relaxed">{translateResult.perspective}</p>
                  </div>
                  {translateResult.questions.length > 0 && (
                    <div>
                      <p className="text-[10px] font-medium text-[#a3a3a3] mb-1.5">跨界启发问题</p>
                      <div className="space-y-1.5">
                        {translateResult.questions.map((q, i) => (
                          <div key={i} className="flex gap-2 rounded-[8px] bg-[#fafafa] px-3 py-2 ring-1 ring-[#f0f0f0]">
                            <span className="text-[10px] font-medium text-sky-500 shrink-0">Q{i + 1}</span>
                            <p className="text-[12px] text-[#404040] leading-relaxed">{q}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  <button onClick={fetchTranslate} className="w-full rounded-[8px] bg-[#fafafa] py-2 text-[11px] text-[#737373] hover:bg-[#f5f5f5] transition-colors">换个领域翻译</button>
                </div>
              ) : (
                <p className="text-[12px] text-[#a3a3a3] py-2">AI 暂时无法翻译，稍后再试</p>
              )}
            </div>
          ) : (
            <button onClick={fetchTranslate} className="w-full rounded-[8px] bg-sky-50/50 px-4 py-3 text-left ring-1 ring-sky-100 hover:ring-sky-200/60 transition-all group">
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-sky-100 ring-1 ring-sky-200/50">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#0284c7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M5 8l6 6"/><path d="m4 14 6-6"/><path d="M2 5h12"/><path d="M7 2h1"/><path d="M22 22l-5-10-5 10"/><path d="M14 18h6"/>
                  </svg>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] font-medium text-sky-700 group-hover:text-sky-600 transition-colors">跨界翻译这个想法</p>
                  <p className="mt-0.5 text-[11px] text-[#a3a3a3]">用另一个领域的视角重新解读，激发跨界灵感</p>
                </div>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#a3a3a3" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 group-hover:translate-x-0.5 group-hover:text-sky-500 transition-all"><path d="m9 18 6-6-6-6"/></svg>
              </div>
            </button>
          )}
        </div>
      )}

      {/* Backlinks — ideas whose content contains [[this idea's title]] */}
      {!isSealed && backlinks.length > 0 && (
        <div className="border-t border-[#f0f0f0] px-5 py-4">
          <div className="flex items-center gap-2 mb-3">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#737373" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 17H7A5 5 0 0 1 7 7h2"/><path d="M15 7h2a5 5 0 0 1 0 10h-2"/><path d="M8 12h8"/>
            </svg>
            <span className="text-[12px] font-semibold text-[#404040]">被引用</span>
            {backlinks.length > 0 && (
              <span className="rounded-full bg-[#f5f5f5] px-1.5 py-0.5 text-[10px] font-medium text-[#a3a3a3]">{backlinks.length}</span>
            )}
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
                <span className="text-[12px] text-[#404040] group-hover:text-amber-600 transition-colors truncate">{bl.title}</span>
                <span className={`h-1.5 w-1.5 rounded-full shrink-0 ml-auto ${(STATUS_CONFIG.find(s => s.value === bl.status) ?? STATUS_CONFIG[0]).dot}`} />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* AI Retro Dialogue (for unlocked capsules) */}
       {!!idea.is_capsule && !isSealed && aiEnabled && aiFeatures.retro !== false && (
         <div className="border-t border-[#f0f0f0] px-5 py-4">
           {showRetro ? (
             <div>
               <div className="flex items-center justify-between mb-3">
                 <div className="flex items-center gap-2">
                   <div className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-100 ring-1 ring-emerald-200/50">
                     <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                       <path d="M3 12a9 9 0 1 0 18 0 9 9 0 0 0-18 0z"/><path d="M12 7v5l3 3"/>
                     </svg>
                   </div>
                   <span className="text-[12px] font-semibold text-emerald-700">回望对话</span>
                 </div>
                 <button
                   onClick={() => { setShowRetro(false); setRetroMessages([]); }}
                   className="rounded-md p-1 text-[#a3a3a3] hover:text-[#737373] hover:bg-[#f5f5f5] transition-colors"
                 >
                   <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                     <path d="M18 6 6 18"/><path d="m6 6 12 12"/>
                   </svg>
                 </button>
               </div>

               {/* Messages */}
               <div className="space-y-2.5 mb-3 max-h-[400px] overflow-y-auto">
                 {retroMessages.map((msg, i) => (
                   <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                     <div className={`max-w-[85%] rounded-[8px] px-3 py-2 text-[12px] leading-relaxed ${
                       msg.role === "user"
                         ? "bg-emerald-500 text-white"
                         : "bg-emerald-50 text-[#171717] ring-1 ring-emerald-100"
                     }`}>
                       {msg.content}
                     </div>
                   </div>
                 ))}
                 {retroLoading && (
                   <div className="flex justify-start">
                     <div className="rounded-[8px] bg-emerald-50 px-3 py-2.5 ring-1 ring-emerald-100">
                       <div className="flex items-center gap-1.5">
                         <div className="h-2 w-2 animate-bounce rounded-full bg-emerald-300" style={{ animationDelay: "0ms" }} />
                         <div className="h-2 w-2 animate-bounce rounded-full bg-emerald-300" style={{ animationDelay: "150ms" }} />
                         <div className="h-2 w-2 animate-bounce rounded-full bg-emerald-300" style={{ animationDelay: "300ms" }} />
                       </div>
                     </div>
                   </div>
                 )}
               </div>

               {/* End retro with summary */}
               {retroEnded ? (
                 <div className="space-y-2.5">
                   <textarea
                     value={retroSummary}
                     onChange={e => setRetroSummary(e.target.value)}
                     placeholder="现在的我怎么看？写一句反思..."
                     rows={3}
                     autoFocus
                     className="w-full resize-none rounded-[8px] border border-emerald-200 bg-emerald-50/30 px-3 py-2 text-[13px] text-[#171717] placeholder:text-[#a3a3a3] focus:outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-200/50"
                   />
                   <div className="flex justify-end gap-2">
                     <button
                       onClick={() => { setShowRetro(false); setRetroMessages([]); setRetroEnded(false); }}
                       className="inline-flex h-7 items-center rounded-md border border-[#e5e5e5] bg-white px-3 text-[11px] font-medium text-[#737373] hover:bg-[#fafafa] transition-colors"
                     >
                       不记录
                     </button>
                     <button
                       onClick={endRetro}
                       disabled={!retroSummary.trim()}
                       className="inline-flex h-7 items-center rounded-md bg-emerald-500 px-3 text-[11px] font-medium text-white hover:bg-emerald-600 disabled:opacity-30 transition-colors"
                     >
                       记录反思
                     </button>
                   </div>
                 </div>
               ) : (
                 <div className="flex items-center gap-2">
                   <input
                     value={retroInput}
                     onChange={e => setRetroInput(e.target.value)}
                     onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendRetroMessage(); } }}
                     placeholder="回应..."
                     disabled={retroLoading}
                     className="h-8 flex-1 rounded-md border border-emerald-200 bg-white px-2.5 text-[12px] text-[#171717] placeholder:text-[#a3a3a3] focus:outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-200/50 disabled:opacity-50"
                   />
                   <button
                     onClick={sendRetroMessage}
                     disabled={!retroInput.trim() || retroLoading}
                     className="inline-flex h-8 items-center rounded-md bg-emerald-500 px-3 text-[11px] font-medium text-white hover:bg-emerald-600 disabled:opacity-30 transition-colors"
                   >
                     发送
                   </button>
                   <button
                     onClick={() => setRetroEnded(true)}
                     className="inline-flex h-8 items-center rounded-md border border-[#e5e5e5] bg-white px-2.5 text-[11px] font-medium text-[#737373] hover:bg-[#fafafa] transition-colors"
                     title="结束对话"
                   >
                     结束
                   </button>
                 </div>
               )}
             </div>
           ) : (
             <button
               onClick={startRetro}
               className="w-full rounded-[8px] bg-emerald-50/50 px-4 py-3 text-left ring-1 ring-emerald-100 hover:ring-emerald-200/60 transition-all group"
             >
               <div className="flex items-center gap-3">
                 <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-100 ring-1 ring-emerald-200/50">
                   <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                     <path d="M3 12a9 9 0 1 0 18 0 9 9 0 0 0-18 0z"/><path d="M12 7v5l3 3"/>
                   </svg>
                 </div>
                 <div className="min-w-0 flex-1">
                   <p className="text-[13px] font-medium text-emerald-700 group-hover:text-emerald-600 transition-colors">与过去的自己对话</p>
                   <p className="mt-0.5 text-[11px] text-[#a3a3a3]">这个时间胶囊已解锁，AI 可以引导你回望</p>
                 </div>
                 <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#a3a3a3" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 group-hover:translate-x-0.5 group-hover:text-emerald-500 transition-all">
                   <path d="m9 18 6-6-6-6"/>
                 </svg>
               </div>
             </button>
           )}
         </div>
       )}

       {/* Activity Timeline */}
       <div className="border-t border-[#f0f0f0] px-5 py-4">
         <ActivityTimeline ideaId={id} />
       </div>
      </div>

      {/* Delete Dialog */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/15 backdrop-blur-sm animate-fade-in" onClick={() => setConfirmDelete(false)}>
          <div className="mx-4 w-full max-w-sm rounded-[10px] bg-white shadow-xl ring-1 ring-[#e5e5e5] p-5 animate-scale-in" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-red-50">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 9v4"/><path d="M12 17h.01"/><path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Z"/>
                </svg>
              </div>
              <div>
                <h3 className="text-[14px] font-semibold text-[#171717]">确认删除</h3>
                <p className="text-[12px] text-[#737373] mt-0.5">此操作不可恢复</p>
              </div>
            </div>
            <p className="text-[12px] text-[#737373] leading-relaxed mb-5">
              确定要删除「<span className="font-medium text-[#171717]">{idea.title}</span>」吗？
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setConfirmDelete(false)}
                className="inline-flex h-7 items-center rounded-md border border-[#e5e5e5] bg-white px-3 text-[11px] font-medium text-[#737373] hover:bg-[#fafafa] transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="inline-flex h-7 items-center rounded-md bg-red-500 px-3 text-[11px] font-medium text-white shadow-sm hover:bg-red-600 disabled:opacity-40 transition-colors"
              >
                {deleting ? "删除中..." : "删除"}
              </button>
            </div>
          </div>
        </div>
     )}

     {/* Epitaph Dialog */}
     {showEpitaph && (
       <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/15 backdrop-blur-sm animate-fade-in" onClick={() => setShowEpitaph(false)}>
         <div className="mx-4 w-full max-w-sm rounded-[10px] bg-white shadow-xl ring-1 ring-[#e5e5e5] p-5 animate-scale-in" onClick={e => e.stopPropagation()}>
           <div className="flex items-center gap-3 mb-3">
             <div className="flex h-8 w-8 items-center justify-center rounded-full bg-neutral-100">
               <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#737373" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                 <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 1.5-1.5-1-2.74-1.5-4.5-1.5A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/>
               </svg>
             </div>
             <div>
               <h3 className="text-[14px] font-semibold text-[#171717]">想法墓志铭</h3>
               <p className="text-[12px] text-[#737373] mt-0.5">为什么放弃这个想法？（可选）</p>
             </div>
           </div>
           <textarea
             value={epitaphText}
             onChange={e => setEpitaphText(e.target.value)}
             placeholder="一句话记录为什么放手..."
             rows={3}
             autoFocus
             className="w-full resize-none rounded-[8px] border border-[#e5e5e5] bg-[#fafafa] px-3 py-2 text-[13px] text-[#171717] placeholder:text-[#a3a3a3] focus:outline-none focus:border-amber-300 focus:ring-1 focus:ring-amber-200/50"
           />
           <div className="mt-4 flex justify-end gap-2">
             <button
               onClick={() => { setShowEpitaph(false); setEpitaphText(""); }}
               className="inline-flex h-7 items-center rounded-md border border-[#e5e5e5] bg-white px-3 text-[11px] font-medium text-[#737373] hover:bg-[#fafafa] transition-colors"
             >
               跳过
             </button>
             <button
               onClick={submitEpitaph}
               disabled={!epitaphText.trim()}
               className="inline-flex h-7 items-center rounded-md bg-[#171717] px-3 text-[11px] font-medium text-white shadow-sm hover:bg-[#404040] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
             >
               记录
             </button>
           </div>
         </div>
       </div>
     )}
   </div>
 );
}
