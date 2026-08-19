"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { formatRelativeTime, truncate, DEFAULT_IMPORTANCE_LEVELS, getImportanceLabel, type ImportanceLevel } from "@spark/utils";
import { MarkdownPreview } from "@/components/markdown";

interface Idea {
  id: string; title: string; content: string; status: string;
  collection: string;
  importance: number;
  is_capsule: boolean;
  unlock_at: string | null;
  epitaph: string | null;
  emotion: string | null;
  created_at: string; updated_at: string; last_reviewed_at: string | null;
}

interface ApiResponse {
  ideas: Idea[];
  total: number;
  page: number;
  pageSize: number;
}

const STATUS_CONFIG = [
  { value: "seed",     label: "种子",   dot: "bg-amber-400",  text: "text-amber-700", bg: "bg-amber-50", ring: "ring-amber-200/50" },
  { value: "sprout",   label: "萌芽",   dot: "bg-emerald-400",text: "text-emerald-700", bg: "bg-emerald-50", ring: "ring-emerald-200/50" },
  { value: "growing",  label: "生长中", dot: "bg-sky-400",    text: "text-sky-700", bg: "bg-sky-50", ring: "ring-sky-200/50" },
  { value: "realized", label: "已实现", dot: "bg-violet-400", text: "text-violet-700", bg: "bg-violet-50", ring: "ring-violet-200/50" },
  { value: "archived", label: "已归档", dot: "bg-neutral-400",text: "text-neutral-500", bg: "bg-neutral-50", ring: "ring-neutral-200/50" },
  { value: "dormant",  label: "休眠",   dot: "bg-stone-400",  text: "text-stone-500", bg: "bg-stone-50", ring: "ring-stone-200/50" },
];

const STATUS_MAP: Record<string, { label: string; dot: string }> = Object.fromEntries(
  STATUS_CONFIG.map(c => [c.value, { label: c.label, dot: c.dot }])
);

const IMPORTANCE_CONFIG = [
  { value: 0, label: "未评级",   dot: "bg-neutral-300",  text: "text-neutral-500",  bg: "bg-neutral-50",  ring: "ring-neutral-200/50" },
  { value: 1, label: "灵感碎片", dot: "bg-slate-400",    text: "text-slate-600",    bg: "bg-slate-50",    ring: "ring-slate-200/50" },
  { value: 2, label: "有意思",   dot: "bg-amber-400",    text: "text-amber-700",    bg: "bg-amber-50",    ring: "ring-amber-200/50" },
  { value: 3, label: "想做",     dot: "bg-orange-500",   text: "text-orange-700",   bg: "bg-orange-50",   ring: "ring-orange-200/50" },
  { value: 4, label: "必做",     dot: "bg-rose-500",     text: "text-rose-700",     bg: "bg-rose-50",     ring: "ring-rose-200/50" },
];

const EMOTION_CONFIG = [
  { value: "excited",  label: "兴奋", dot: "bg-rose-400",    text: "text-rose-700",    bg: "bg-rose-50",    ring: "ring-rose-200/50" },
  { value: "curious",  label: "好奇", dot: "bg-amber-400",   text: "text-amber-700",   bg: "bg-amber-50",   ring: "ring-amber-200/50" },
  { value: "anxious",  label: "焦虑", dot: "bg-orange-400",  text: "text-orange-700",  bg: "bg-orange-50",  ring: "ring-orange-200/50" },
  { value: "calm",     label: "平静", dot: "bg-sky-400",     text: "text-sky-700",     bg: "bg-sky-50",     ring: "ring-sky-200/50" },
  { value: "confused", label: "困惑", dot: "bg-violet-400", text: "text-violet-700",  bg: "bg-violet-50",  ring: "ring-violet-200/50" },
];

const SORT_OPTIONS = [
  { value: "important", label: "重要优先" },
  { value: "newest",  label: "最新创建" },
  { value: "oldest",  label: "最早创建" },
  { value: "updated", label: "最近更新" },
  { value: "status",  label: "按状态" },
];

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

function SparkIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2l2 7h7l-5.5 4 2 7L12 16l-5.5 4 2-7L3 9h7z"/>
    </svg>
  );
}

export default function HomePage() {
  const router = useRouter();
  const [ideas, setIdeas] = useState<Idea[]>([]);
  interface CollectionInfo { name: string; count: number; }
  const [collections, setCollections] = useState<CollectionInfo[]>([]);
  const [activeCollection, setActiveCollection] = useState("");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  const [activeStatuses, setActiveStatuses] = useState<string[]>([]);
  const [sort, setSort] = useState("important");
  const [showSortMenu, setShowSortMenu] = useState(false);

  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const pageSize = 20;

  const [expanded, setExpanded] = useState(false);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [preview, setPreview] = useState(false);
  const [captureCollection, setCaptureCollection] = useState("");
  const [showCollectionPicker, setShowCollectionPicker] = useState(false);
  const [newCollectionName, setNewCollectionName] = useState("");
  const [captureEmotion, setCaptureEmotion] = useState("");
  const [showEmotionPicker, setShowEmotionPicker] = useState(false);

  const [daily, setDaily] = useState<Idea | null>(null);
  const [showDaily, setShowDaily] = useState(true);

  const [importanceLabels, setImportanceLabels] = useState<ImportanceLevel[]>(DEFAULT_IMPORTANCE_LEVELS);
  const [graveyardCount, setGraveyardCount] = useState(0);
  const [quickMenuId, setQuickMenuId] = useState<string | null>(null);
  const [showCollectionMgr, setShowCollectionMgr] = useState(false);
  const [renamingCol, setRenamingCol] = useState<string | null>(null);
  const [renameColVal, setRenameColVal] = useState("");
  const [deletingCol, setDeletingCol] = useState<string | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const sortMenuRef = useRef<HTMLDivElement>(null);
  const quickMenuRef = useRef<HTMLDivElement>(null);
  const collectionPickerRef = useRef<HTMLDivElement>(null);

  const buildParams = useCallback((overrides?: { page?: number; append?: boolean }) => {
    const p = new URLSearchParams();
    if (search.trim()) p.set("q", search.trim());
    if (activeCollection) p.set("collection", activeCollection);
    if (activeStatuses.length > 0) p.set("status", activeStatuses.join(","));
    p.set("sort", sort);
    p.set("page", String(overrides?.page ?? 1));
    p.set("pageSize", String(pageSize));
    return p;
  }, [search, activeCollection, activeStatuses, sort]);

  const loadIdeas = useCallback(async (overrides?: { page?: number; append?: boolean }) => {
    const p = buildParams(overrides);
    const targetPage = overrides?.page ?? 1;
    const isAppend = overrides?.append ?? false;

    if (isAppend) {
      setLoadingMore(true);
    } else {
      setLoading(true);
    }

    const r = await fetch(`/api/ideas?${p.toString()}`);
    if (r.ok) {
      const data: ApiResponse = await r.json();
      if (isAppend) {
        setIdeas(prev => [...prev, ...data.ideas]);
      } else {
        setIdeas(data.ideas);
      }
      setTotal(data.total);
      setPage(targetPage);
    }
    setLoading(false);
    setLoadingMore(false);
  }, [buildParams]);

  const loadCollections = useCallback(async () => {
    const r = await fetch("/api/collections");
    if (r.ok) setCollections(await r.json());
  }, []);

  const loadDaily = useCallback(async () => {
    const r = await fetch("/api/ideas?pageSize=999");
    if (!r.ok) return;
    const data: ApiResponse = await r.json();
    const all = data.ideas;
    const old = all.filter(i => (Date.now() - new Date(i.created_at).getTime()) / 86400000 >= 7);
    if (old.length) setDaily(old[Math.floor(Math.random() * old.length)]);
  }, []);

  const loadSettings = useCallback(async () => {
    const r = await fetch("/api/settings");
    if (r.ok) {
      const d = await r.json();
      if (d?.importance_levels) setImportanceLabels(d.importance_levels);
    }
  }, []);

  const loadGraveyardCount = useCallback(async () => {
    const r = await fetch("/api/ideas?pageSize=999");
    if (!r.ok) return;
    const data: ApiResponse = await r.json();
    const cutoff = Date.now() - 90 * 86400000;
    const count = data.ideas.filter(i =>
      i.importance <= 1 &&
      new Date(i.last_reviewed_at || i.updated_at).getTime() < cutoff
    ).length;
    setGraveyardCount(count);
  }, []);

  useEffect(() => {
    loadCollections();
    loadDaily();
    loadSettings();
    loadGraveyardCount();
    loadIdeas();
  }, []);

  useEffect(() => {
    loadIdeas();
  }, [search, activeCollection, activeStatuses, sort]);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (sortMenuRef.current && !sortMenuRef.current.contains(e.target as Node)) {
        setShowSortMenu(false);
      }
      if (quickMenuRef.current && !quickMenuRef.current.contains(e.target as Node)) {
        setQuickMenuId(null);
      }
      if (collectionPickerRef.current && !collectionPickerRef.current.contains(e.target as Node)) {
        setShowCollectionPicker(false);
        setShowEmotionPicker(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const handleSearch = (v: string) => {
    setSearch(v);
    clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => {}, 250);
  };

  const handleLoadMore = () => {
    loadIdeas({ page: page + 1, append: true });
  };

  const saveIdea = async () => {
    if (!title.trim()) return;
    await fetch("/api/ideas", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: title.trim(),
        content: content.trim(),
        collection: captureCollection.trim(),
        emotion: captureEmotion || undefined,
      }),
    });
    setTitle(""); setContent(""); setCaptureCollection(""); setCaptureEmotion("");
    setExpanded(false); setShowCollectionPicker(false); setShowEmotionPicker(false);
    loadCollections();
    loadIdeas();
    loadDaily();
    loadGraveyardCount();
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) { e.preventDefault(); saveIdea(); }
    if (e.key === "Escape") { collapseCapture(); }
  };

  const collapseCapture = () => {
    setTitle(""); setContent(""); setCaptureCollection(""); setCaptureEmotion("");
    setExpanded(false); setShowCollectionPicker(false); setShowEmotionPicker(false);
    inputRef.current?.blur();
  };

  const toggleCollection = (name: string) => {
    setActiveCollection(activeCollection === name ? "" : name);
  };

  const toggleStatus = (value: string) => {
    setActiveStatuses(prev =>
      prev.includes(value) ? prev.filter(v => v !== value) : [...prev, value]
    );
  };

  const clearAllFilters = () => {
    setActiveStatuses([]);
    setActiveCollection("");
    setSearch("");
  };

  const quickAdvanceStatus = async (idea: Idea) => {
    const order = ["seed", "sprout", "growing", "realized"];
    const idx = order.indexOf(idea.status);
    const next = idx >= 0 && idx < order.length - 1 ? order[idx + 1] : idea.status;
    if (next === idea.status) return;
    setIdeas(prev => prev.map(i => i.id === idea.id ? { ...i, status: next } : i));
    setQuickMenuId(null);
    await fetch(`/api/ideas/${idea.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: next }),
    });
  };

  const quickSetImportance = async (id: string, value: number) => {
    setIdeas(prev => prev.map(i => i.id === id ? { ...i, importance: value } : i));
    await fetch(`/api/ideas/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ importance: value }),
    });
  };

  const quickArchive = async (idea: Idea) => {
    setIdeas(prev => prev.filter(i => i.id !== idea.id));
    setQuickMenuId(null);
    setTotal(t => t - 1);
    await fetch(`/api/ideas/${idea.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "archived" }),
    });
    loadGraveyardCount();
  };

  const hasAnyFilter = activeStatuses.length > 0 || activeCollection || search.trim().length > 0;
  const doRenameCollection = async (oldName: string, newName: string) => {
    if (!newName.trim() || newName.trim() === oldName) { setRenamingCol(null); return; }
    await fetch("/api/collections", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ oldName, newName: newName.trim() }),
    });
    if (activeCollection === oldName) setActiveCollection(newName.trim());
    setRenamingCol(null); setRenameColVal("");
    loadCollections(); loadIdeas();
  };
  const doDeleteCollection = async (name: string) => {
    await fetch(`/api/collections?name=${encodeURIComponent(name)}`, { method: "DELETE" });
    if (activeCollection === name) setActiveCollection("");
    setDeletingCol(null);
    loadCollections(); loadIdeas(); loadGraveyardCount();
  };
  const hasMore = ideas.length < total;
  const isSearching = search.trim().length > 0;

  return (
    <div className="mx-auto max-w-[640px] px-6 py-8">
      {/* Header */}
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
         <div className="flex items-center gap-3">
            <button
              onClick={() => router.push("/graph")}
              className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-medium text-[#a3a3a3] hover:bg-[#f5f5f5] transition-colors"
              title="想法图谱"
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="5" r="2"/><circle cx="5" cy="19" r="2"/><circle cx="19" cy="19" r="2"/>
                <path d="M12 7v3M12 12l-5 5M12 12l5 5"/>
              </svg>
              <span>图谱</span>
            </button>
            <button
              onClick={() => router.push("/retro")}
              className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-medium text-[#a3a3a3] hover:bg-[#f5f5f5] transition-colors"
              title="回顾中心"
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/>
                <path d="M3 3v5h5"/>
              </svg>
              <span>回顾</span>
            </button>
           {graveyardCount > 0 && (
              <button
                onClick={() => router.push("/graveyard")}
                className="relative inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-medium text-[#a3a3a3] hover:bg-[#f5f5f5] transition-colors"
                title="想法墓地"
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
                </svg>
                <span className="tabular-nums">{graveyardCount}</span>
              </button>
            )}
            {!loading && total > 0 && (
              <span className="text-[12px] text-[#a3a3a3] tabular-nums">
                {total} 个想法
              </span>
            )}
          </div>
        </div>
      </header>

      {/* Daily Review */}
      {daily && showDaily && (
       <div className="mb-5 animate-slide-down">
          <div
            onClick={() => { router.push(`/ideas/${daily.id}`); }}
            className="group relative w-full rounded-[10px] bg-white px-4 py-3.5 text-left shadow-sm ring-1 ring-[#e5e5e5] transition-all hover:shadow-md hover:ring-amber-200/50 active:scale-[0.99] cursor-pointer"
          >
            <div className="flex items-start gap-3">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-amber-50 ring-1 ring-amber-200/50">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 18h6"/><path d="M10 22h4"/>
                  <path d="M15.09 14c.18-.98.65-1.74 1.41-2.5A4.65 4.65 0 0 0 18 8 6 6 0 0 0 6 8c0 1 .23 2.23 1.5 3.5A4.61 4.61 0 0 1 8.91 14"/>
                </svg>
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-semibold text-[#a3a3a3] uppercase tracking-[0.06em]">今日回顾</p>
                <p className="mt-0.5 text-[13px] font-medium text-[#171717] group-hover:text-amber-600 transition-colors">
                  {daily.title}
                </p>
                {daily.content && (
                  <p className="mt-0.5 text-[12px] text-[#737373] leading-relaxed line-clamp-1">{truncate(daily.content, 80)}</p>
                )}
              </div>
              <button
                onClick={e => { e.stopPropagation(); setShowDaily(false); }}
                className="shrink-0 rounded-md p-1 text-[#a3a3a3] hover:text-[#737373] hover:bg-[#f5f5f5] transition-colors"
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 6 6 18"/><path d="m6 6 12 12"/>
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Capture */}
      <div className={`mb-6 rounded-[10px] bg-white shadow-sm ring-1 transition-all duration-200 relative z-40 ${
        expanded ? "ring-amber-200/50 shadow-md" : "ring-[#e5e5e5] hover:ring-[#d4d4d4]"
      }`}>
        <div className="px-4 py-3.5">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center">
              {expanded ? (
                <span className="h-2 w-2 rounded-full bg-amber-400 animate-pulse" />
              ) : (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#a3a3a3" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 5v14"/><path d="M5 12h14"/>
                </svg>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <input
                ref={inputRef}
                placeholder="写下你的想法..."
                value={title}
                onChange={e => setTitle(e.target.value)}
                onFocus={() => setExpanded(true)}
                onKeyDown={handleKeyDown}
                className="w-full border-0 bg-transparent p-0 text-[14px] text-[#171717] placeholder:text-[#a3a3a3] focus:outline-none focus:ring-0"
              />

              {expanded && (
                <div className="mt-3 animate-slide-down">
                  {/* Content */}
                  <div className="mb-3">
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-[10px] font-semibold text-[#a3a3a3] uppercase tracking-[0.06em]">内容</label>
                      <button
                        onClick={() => setPreview(!preview)}
                        className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-medium text-[#a3a3a3] hover:text-[#737373] hover:bg-[#f5f5f5] transition-colors"
                      >
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          {preview ? (
                            <>
                              <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/>
                              <circle cx="12" cy="12" r="3"/>
                            </>
                          ) : (
                            <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/>
                          )}
                        </svg>
                        {preview ? "预览" : "编辑"}
                      </button>
                    </div>
                    {preview ? (
                      <div className="min-h-[72px] rounded-[8px] bg-[#fafafa] p-3 ring-1 ring-[#f0f0f0]">
                        <MarkdownPreview content={content} />
                      </div>
                    ) : (
                    <textarea
                      placeholder="补充细节..."
                      value={content}
                      onChange={e => setContent(e.target.value)}
                      onKeyDown={handleKeyDown}
                      rows={3}
                      className="w-full resize-none border-0 bg-transparent p-0 text-[13px] text-[#171717] placeholder:text-[#a3a3a3] focus:outline-none focus:ring-0 leading-relaxed"
                    />
                    )}
                  </div>

                  {/* Collection + Emotion row */}
                  <div ref={collectionPickerRef} className="relative mb-3 flex flex-wrap items-center gap-2">
                    {/* Collection picker */}
                    <div className="flex items-center gap-2">
                      {captureCollection ? (
                        <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium ring-1 ${getCollectionStyle(captureCollection).bg} ${getCollectionStyle(captureCollection).text} ${getCollectionStyle(captureCollection).ring}`}>
                          <span className={`h-1.5 w-1.5 rounded-full ${getCollectionStyle(captureCollection).dot}`} />
                          {captureCollection}
                          <button
                            onClick={() => { setCaptureCollection(""); setShowCollectionPicker(false); }}
                            className="ml-0.5 hover:opacity-60"
                          >
                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M18 6 6 18"/><path d="m6 6 12 12"/>
                            </svg>
                          </button>
                        </span>
                      ) : null}
                      <button
                        onClick={() => { setShowCollectionPicker(!showCollectionPicker); setShowEmotionPicker(false); }}
                        className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium text-[#a3a3a3] hover:text-[#737373] hover:bg-[#f5f5f5] transition-colors"
                      >
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M4 20h16"/><path d="M4 4h16v12H4z"/>
                        </svg>
                        {captureCollection ? "更换" : "集合"}
                      </button>
                    </div>

                    {/* Emotion picker */}
                    <div className="flex items-center gap-2">
                      {captureEmotion ? (
                        <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium ring-1 ${EMOTION_CONFIG.find(e => e.value === captureEmotion)?.bg} ${EMOTION_CONFIG.find(e => e.value === captureEmotion)?.text} ${EMOTION_CONFIG.find(e => e.value === captureEmotion)?.ring}`}>
                          <span className={`h-1.5 w-1.5 rounded-full ${EMOTION_CONFIG.find(e => e.value === captureEmotion)?.dot}`} />
                          {EMOTION_CONFIG.find(e => e.value === captureEmotion)?.label}
                          <button
                            onClick={() => { setCaptureEmotion(""); setShowEmotionPicker(false); }}
                            className="ml-0.5 hover:opacity-60"
                          >
                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M18 6 6 18"/><path d="m6 6 12 12"/>
                            </svg>
                          </button>
                        </span>
                      ) : null}
                      <button
                        onClick={() => { setShowEmotionPicker(!showEmotionPicker); setShowCollectionPicker(false); }}
                        className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium text-[#a3a3a3] hover:text-[#737373] hover:bg-[#f5f5f5] transition-colors"
                      >
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 1.5-1.5-1-2.74-1.5-4.5-1.5A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/>
                        </svg>
                        {captureEmotion ? "更换" : "情绪"}
                      </button>
                    </div>

                    {/* Collection dropdown */}
                    {showCollectionPicker && (
                      <div className="absolute top-full left-0 mt-1.5 w-56 rounded-[8px] bg-white shadow-lg ring-1 ring-[#e5e5e5] z-50 py-1.5 animate-scale-in">
                        {collections.length > 0 && (
                          <div>
                            <div className="px-3 pb-1">
                              <p className="text-[10px] font-semibold text-[#a3a3a3] uppercase tracking-[0.06em]">已有集合</p>
                            </div>
                            {collections.map(c => (
                              <button
                                key={c.name}
                               onClick={() => { setCaptureCollection(c.name); setShowCollectionPicker(false); }}
                                className={`flex w-full items-center gap-2 px-3 py-1.5 text-[13px] hover:bg-[#f5f5f5] transition-colors ${c.name === captureCollection ? "bg-amber-50/50" : ""}`}
                             >
                                <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ring-1 ${getCollectionStyle(c.name).bg} ${getCollectionStyle(c.name).text} ${getCollectionStyle(c.name).ring}`}>
                                  <span className={`h-1 w-1 rounded-full ${getCollectionStyle(c.name).dot}`} />
                                 {c.name}
                                </span>
                                <span className="ml-auto text-[10px] text-[#a3a3a3] tabular-nums">{c.count}</span>
                                {c.name === captureCollection && (
                                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="ml-auto">
                                    <polyline points="20 6 9 17 4 12"/>
                                  </svg>
                                )}
                              </button>
                            ))}
                          </div>
                        )}
                        <div className={`${collections.length > 0 ? "border-t border-[#f0f0f0] mt-1 pt-1.5" : ""} px-3`}>
                          <div className="flex items-center gap-1.5">
                            <input
                              placeholder="新建集合..."
                              value={newCollectionName}
                              onChange={e => setNewCollectionName(e.target.value)}
                              onKeyDown={e => {
                                if (e.key === "Enter" && newCollectionName.trim()) {
                                  setCaptureCollection(newCollectionName.trim());
                                  setNewCollectionName("");
                                  setShowCollectionPicker(false);
                                }
                              }}
                              className="h-7 w-full rounded-md border border-[#e5e5e5] bg-[#fafafa] px-2.5 text-[12px] text-[#171717] placeholder:text-[#a3a3a3] focus:outline-none focus:border-amber-300 focus:ring-1 focus:ring-amber-200/50"
                            />
                            {newCollectionName.trim() && (
                              <button
                                onClick={() => {
                                  setCaptureCollection(newCollectionName.trim());
                                  setNewCollectionName("");
                                  setShowCollectionPicker(false);
                                }}
                                className="shrink-0 rounded-md bg-amber-500 px-2 py-1 text-[10px] font-medium text-white hover:bg-amber-600 transition-colors"
                              >
                                创建
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Emotion dropdown */}
                    {showEmotionPicker && (
                      <div className="absolute top-full mt-1.5 w-40 rounded-[8px] bg-white shadow-lg ring-1 ring-[#e5e5e5] z-50 py-1.5 animate-scale-in" style={{ left: "8rem" }}>
                        {EMOTION_CONFIG.map(e => (
                          <button
                            key={e.value}
                            onClick={() => { setCaptureEmotion(e.value); setShowEmotionPicker(false); }}
                            className={`flex w-full items-center gap-2 px-3 py-1.5 text-[13px] hover:bg-[#f5f5f5] transition-colors ${captureEmotion === e.value ? "bg-amber-50/50" : ""}`}
                          >
                            <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ring-1 ${e.bg} ${e.text} ${e.ring}`}>
                              <span className={`h-1 w-1 rounded-full ${e.dot}`} />
                              {e.label}
                            </span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center justify-between border-t border-[#f0f0f0] pt-3">
                    <div className="flex items-center gap-2 text-[11px] text-[#a3a3a3]">
                      <kbd className="inline-flex h-5 w-5 items-center justify-center rounded border border-[#e5e5e5] bg-[#fafafa] text-[10px] font-medium text-[#737373]">⌘</kbd>
                      <kbd className="inline-flex h-5 w-5 items-center justify-center rounded border border-[#e5e5e5] bg-[#fafafa] text-[10px] font-medium text-[#737373]">↵</kbd>
                      <span>发送</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={collapseCapture}
                        className="inline-flex h-7 items-center rounded-md px-3 text-[11px] font-medium text-[#737373] hover:bg-[#f5f5f5] transition-colors"
                      >
                        取消
                      </button>
                      <button
                        onClick={saveIdea}
                        disabled={!title.trim()}
                        className="inline-flex h-7 items-center rounded-md bg-amber-500 px-3 text-[11px] font-medium text-white shadow-sm hover:bg-amber-600 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                      >
                        保存
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Search + Sort */}
      <div className="mb-4 flex items-center gap-2">
        <div className="relative flex-1">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#a3a3a3] pointer-events-none" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>
          </svg>
          <input
            type="text"
            placeholder="搜索想法..."
            value={search}
            onChange={e => handleSearch(e.target.value)}
            className="h-9 w-full rounded-[8px] bg-white pl-8 pr-8 text-[13px] text-[#171717] shadow-sm ring-1 ring-[#e5e5e5] placeholder:text-[#a3a3a3] transition-all focus:outline-none focus:ring-1 focus:ring-amber-300/50"
          />
          {isSearching && (
            <button
              onClick={() => handleSearch("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded p-0.5 text-[#a3a3a3] hover:text-[#737373] transition-colors"
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 6 6 18"/><path d="m6 6 12 12"/>
              </svg>
            </button>
          )}
        </div>

        <div className="relative shrink-0" ref={sortMenuRef}>
          <button
            onClick={() => setShowSortMenu(!showSortMenu)}
            className="flex h-9 items-center gap-1.5 rounded-[8px] bg-white px-2.5 text-[11px] font-medium text-[#737373] shadow-sm ring-1 ring-[#e5e5e5] hover:bg-[#fafafa] transition-colors"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 7h6"/><path d="M3 12h12"/><path d="M3 17h18"/>
            </svg>
            <span className="hidden sm:inline">{SORT_OPTIONS.find(o => o.value === sort)?.label}</span>
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`transition-transform ${showSortMenu ? "rotate-180" : ""}`}>
              <polyline points="6 9 12 15 18 9"/>
            </svg>
          </button>
          {showSortMenu && (
            <div className="absolute right-0 top-full mt-1.5 w-32 rounded-[8px] bg-white shadow-lg ring-1 ring-[#e5e5e5] z-10 py-1 animate-scale-in">
              {SORT_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => { setSort(opt.value); setShowSortMenu(false); }}
                  className={`flex w-full items-center gap-2 px-3 py-1.5 text-[12px] hover:bg-[#f5f5f5] transition-colors ${opt.value === sort ? "text-amber-600 font-medium" : "text-[#737373]"}`}
                >
                  {opt.value === sort && (
                    <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12"/>
                    </svg>
                  )}
                  <span className={opt.value === sort ? "" : "ml-4"}>{opt.label}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Compact filter bar */}
      <div className="mb-4 flex items-center gap-1.5 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
        <button
          onClick={() => setActiveStatuses([])}
          className={`inline-flex shrink-0 items-center rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors ${
            activeStatuses.length === 0 && !activeCollection
              ? "bg-[#171717] text-white"
              : "bg-white text-[#737373] ring-1 ring-[#e5e5e5] hover:ring-[#d4d4d4]"
          }`}
        >
          全部
        </button>
        {STATUS_CONFIG.map(s => {
          const isActive = activeStatuses.includes(s.value);
          return (
            <button
              key={s.value}
              onClick={() => toggleStatus(s.value)}
              className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors ${
                isActive
                  ? `${s.bg} ${s.text} ring-1 ${s.ring}`
                  : "bg-white text-[#737373] ring-1 ring-[#e5e5e5] hover:ring-[#d4d4d4]"
              }`}
            >
              <span className={`h-1.5 w-1.5 rounded-full ${s.dot}`} />
              {s.label}
            </button>
          );
        })}
        {collections.length > 0 && (
          <>
            <div className="shrink-0 h-4 w-px bg-[#e5e5e5]" />
            {collections.map(col => {
              const c = getCollectionStyle(col.name);
              return (
                <button
                  key={col.name}
                  onClick={() => toggleCollection(col.name)}
                  className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors ${
                    activeCollection === col.name
                      ? `${c.bg} ${c.text} ring-1 ${c.ring}`
                      : "bg-white text-[#737373] ring-1 ring-[#e5e5e5] hover:ring-[#d4d4d4]"
                  }`}
                >
                  <span className={`h-1.5 w-1.5 rounded-full ${c.dot}`} />
                  {col.name}
                  <span className="text-[9px] text-[#a3a3a3] tabular-nums">{col.count}</span>
                </button>
              );
            })}
         </>
       )}
        {collections.length > 0 && (
          <button
            onClick={() => { setShowCollectionMgr(!showCollectionMgr); }}
            className="inline-flex shrink-0 items-center justify-center h-6 w-6 rounded-full text-[#a3a3a3] hover:bg-[#f5f5f5] hover:text-[#737373] transition-colors"
            title="管理集合"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/>
              <circle cx="12" cy="12" r="3"/>
            </svg>
          </button>
        )}
        {showCollectionMgr && collections.length > 0 && (
          <div className="fixed inset-0 z-40" onClick={() => setShowCollectionMgr(false)}>
            <div className="absolute right-6 top-32 w-72 rounded-[10px] bg-white shadow-lg ring-1 ring-[#e5e5e5] py-2 animate-scale-in" onClick={(e) => e.stopPropagation()}>
              <p className="px-3 pb-2 text-[10px] font-semibold text-[#a3a3a3] uppercase tracking-[0.06em]">集合管理</p>
              {collections.map(col => (
                <div key={col.name} className="px-3 py-1.5 hover:bg-[#f5f5f5] transition-colors">
                  {renamingCol === col.name ? (
                    <div className="flex items-center gap-1.5">
                      <input
                        autoFocus
                        value={renameColVal}
                        onChange={e => setRenameColVal(e.target.value)}
                        onKeyDown={e => { if (e.key === "Enter") doRenameCollection(col.name, renameColVal); if (e.key === "Escape") { setRenamingCol(null); setRenameColVal(""); } }}
                        className="h-6 flex-1 rounded-md border border-[#e5e5e5] bg-[#fafafa] px-2 text-[12px] text-[#171717] focus:outline-none focus:border-amber-300 focus:ring-1 focus:ring-amber-200/50"
                      />
                      <button onClick={() => doRenameCollection(col.name, renameColVal)} className="shrink-0 rounded-md bg-amber-500 px-2 py-0.5 text-[10px] font-medium text-white hover:bg-amber-600">确定</button>
                    </div>
                  ) : deletingCol === col.name ? (
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[11px] text-[#525252]">{col.count} 条想法将变为未分类</span>
                      <div className="flex items-center gap-1">
                        <button onClick={() => doDeleteCollection(col.name)} className="rounded-md bg-rose-500 px-2 py-0.5 text-[10px] font-medium text-white hover:bg-rose-600">删除</button>
                        <button onClick={() => setDeletingCol(null)} className="rounded-md px-2 py-0.5 text-[10px] font-medium text-[#737373] hover:bg-[#f5f5f5]">取消</button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${getCollectionStyle(col.name).dot}`} />
                        <span className="text-[12px] text-[#404040] truncate">{col.name}</span>
                        <span className="text-[10px] text-[#a3a3a3] tabular-nums shrink-0">{col.count}</span>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button onClick={() => { setRenamingCol(col.name); setRenameColVal(col.name); }} className="rounded p-1 text-[#a3a3a3] hover:text-[#737373] hover:bg-[#f5f5f5]" title="重命名">
                          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/></svg>
                        </button>
                        <button onClick={() => setDeletingCol(col.name)} className="rounded p-1 text-[#a3a3a3] hover:text-rose-600 hover:bg-rose-50" title="删除">
                          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
     </div>

      {/* Active filters bar */}
      {hasAnyFilter && (
        <div className="mb-4 flex items-center gap-2">
          <div className="flex flex-wrap items-center gap-1.5">
            {activeStatuses.map(v => {
              const s = STATUS_CONFIG.find(c => c.value === v);
              if (!s) return null;
              return (
                <span key={v} className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ring-1 ${s.bg} ${s.text} ${s.ring}`}>
                  <span className={`h-1 w-1 rounded-full ${s.dot}`} />
                  {s.label}
                  <button onClick={() => toggleStatus(v)} className="ml-0.5 hover:opacity-60">
                    <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M18 6 6 18"/><path d="m6 6 12 12"/>
                    </svg>
                  </button>
                </span>
              );
            })}
            {activeCollection && (
              <span className="inline-flex items-center gap-1 rounded-full bg-[#f5f5f5] px-2 py-0.5 text-[10px] font-medium text-[#737373] ring-1 ring-[#e5e5e5]">
                {activeCollection}
               <button onClick={() => setActiveCollection("")} className="ml-0.5 hover:opacity-60">
                 <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                   <path d="M18 6 6 18"/><path d="m6 6 12 12"/>
                 </svg>
                </button>
              </span>
            )}
          </div>
          <button
            onClick={clearAllFilters}
            className="text-[10px] font-medium text-[#a3a3a3] hover:text-[#737373] transition-colors shrink-0"
          >
            清除筛选
          </button>
        </div>
      )}

      {/* Content area */}
      {loading ? (
        <div className="space-y-2">
          {[1,2,3].map(i => (
            <div key={i} className="rounded-[10px] bg-white px-4 py-3.5 shadow-sm ring-1 ring-[#e5e5e5] animate-pulse">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-3/5 rounded bg-[#f0f0f0]" />
                  <div className="h-3 w-4/5 rounded bg-[#f0f0f0]" />
                  <div className="h-2.5 w-1/4 rounded bg-[#f0f0f0]" />
                </div>
                <div className="h-5 w-14 rounded-full bg-[#f0f0f0]" />
              </div>
            </div>
          ))}
        </div>
      ) : ideas.length === 0 ? (
        <div className="flex flex-col items-center py-20">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white shadow-sm ring-1 ring-[#e5e5e5] mb-5">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#a3a3a3" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2l2 7h7l-5.5 4 2 7L12 16l-5.5 4 2-7L3 9h7z"/>
            </svg>
          </div>
          <p className="text-[14px] font-medium text-[#737373]">
            {isSearching ? "没有找到匹配的想法" : activeCollection ? `「${activeCollection}」还是空的` : "还没有想法"}
          </p>
          <p className="mt-1 text-[12px] text-[#a3a3a3]">
            {isSearching ? "试试其他关键词" : activeCollection ? "换个集合看看" : "在上面写下第一个想法吧"}
          </p>
        </div>
      ) : (
        <div>
          <div className="space-y-2">
            {ideas.map((idea, i) => {
              const s = STATUS_MAP[idea.status] ?? STATUS_MAP.seed;
              const isSealed = idea.is_capsule && !!idea.unlock_at && new Date(idea.unlock_at) > new Date();
              const capsuleDays = isSealed && idea.unlock_at ? Math.ceil((new Date(idea.unlock_at).getTime() - Date.now()) / 86400000) : 0;
              const lastActivity = idea.last_reviewed_at || idea.updated_at;
              const daysSinceReview = lastActivity ? Math.floor((Date.now() - new Date(lastActivity).getTime()) / 86400000) : 0;
              const isAged = daysSinceReview > 30;
              const emotionInfo = idea.emotion ? EMOTION_CONFIG.find(e => e.value === idea.emotion) : null;
              const ic = IMPORTANCE_CONFIG.find(c => c.value === idea.importance);
              const impLabel = importanceLabels.find(l => l.value === idea.importance)?.label ?? ic?.label ?? "";
              return (
                <div key={idea.id} className="animate-slide-up" style={{ animationDelay: `${i * 25}ms` }}>
                  <div
                    onClick={() => { setQuickMenuId(null); router.push(`/ideas/${idea.id}`); }}
                    className={`group relative w-full cursor-pointer rounded-[10px] bg-white px-4 py-3.5 text-left shadow-sm ring-1 transition-all hover:shadow-md active:scale-[0.99] ${
                      isAged ? "ring-neutral-200/60 opacity-75 hover:opacity-100 hover:ring-[#d4d4d4]" : "ring-[#e5e5e5] hover:ring-[#d4d4d4]"
                    }`}
                    title={isAged ? `${daysSinceReview}天未回看` : undefined}
                  >
                    {/* Quick action menu trigger */}
                    <button
                      onClick={(e) => { e.stopPropagation(); setQuickMenuId(quickMenuId === idea.id ? null : idea.id); }}
                      className={`absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-md transition-all ${
                        quickMenuId === idea.id ? "bg-[#f5f5f5] opacity-100" : "opacity-0 group-hover:opacity-100 hover:bg-[#f5f5f5]"
                      }`}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#a3a3a3" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="5" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="12" cy="19" r="1.5"/>
                      </svg>
                    </button>
                    {/* Quick action dropdown */}
                    {quickMenuId === idea.id && (
                      <div ref={quickMenuRef} onClick={(e) => e.stopPropagation()} className="absolute right-2 top-9 z-50 w-44 rounded-[10px] bg-white shadow-lg ring-1 ring-[#e5e5e5] py-1.5 animate-scale-in">
                        {idea.status !== "realized" && idea.status !== "archived" && idea.status !== "dormant" && (
                          <button
                            onClick={() => quickAdvanceStatus(idea)}
                            className="flex w-full items-center gap-2 px-3 py-1.5 text-[12px] text-[#404040] hover:bg-[#f5f5f5] transition-colors"
                          >
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="m3 8 4-4 4 4"/><path d="M7 4v16"/><path d="m21 16-4 4-4-4"/><path d="M17 20V4"/>
                            </svg>
                            推进状态
                          </button>
                        )}
                        <div className="px-3 py-1">
                          <p className="text-[9px] font-semibold text-[#a3a3a3] uppercase tracking-[0.06em] mb-1">重要程度</p>
                          <div className="flex items-center gap-1">
                            {IMPORTANCE_CONFIG.map(c => (
                              <button
                                key={c.value}
                                onClick={() => quickSetImportance(idea.id, c.value)}
                                className={`flex h-5 w-5 items-center justify-center rounded-full transition-all ${
                                  idea.importance === c.value ? `${c.bg} ring-1 ${c.ring}` : "bg-[#fafafa] ring-1 ring-[#f0f0f0] hover:ring-[#e5e5e5]"
                                }`}
                                title={c.label}
                              >
                                <span className={`h-1.5 w-1.5 rounded-full ${c.dot}`} />
                              </button>
                            ))}
                          </div>
                        </div>
                        {idea.status !== "archived" && (
                          <button
                            onClick={() => quickArchive(idea)}
                            className="flex w-full items-center gap-2 px-3 py-1.5 text-[12px] text-rose-600 hover:bg-rose-50 transition-colors border-t border-[#f0f0f0] mt-1"
                          >
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 1.5-1.5-1-2.74-1.5-4.5-1.5A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/>
                            </svg>
                            归档
                          </button>
                        )}
                      </div>
                    )}
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className="text-[13px] font-medium text-[#171717] leading-snug group-hover:text-amber-600 transition-colors">
                            {idea.title}
                          </h3>
                          {idea.collection && (
                            <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[9px] font-medium ring-1 shrink-0 ${getCollectionStyle(idea.collection).bg} ${getCollectionStyle(idea.collection).text} ${getCollectionStyle(idea.collection).ring}`}>
                              <span className={`h-1 w-1 rounded-full ${getCollectionStyle(idea.collection).dot}`} />
                              {idea.collection}
                            </span>
                          )}
                          {emotionInfo && (
                            <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[9px] font-medium ring-1 shrink-0 ${emotionInfo.bg} ${emotionInfo.text} ${emotionInfo.ring}`}>
                              <span className={`h-1 w-1 rounded-full ${emotionInfo.dot}`} />
                              {emotionInfo.label}
                            </span>
                          )}
                        </div>
                        {isSealed ? (
                          <p className="mt-1 inline-flex items-center gap-1 text-[11px] text-violet-500 font-medium">
                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <rect width="18" height="11" x="3" y="11" rx="2" ry="2"/>
                              <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                            </svg>
                            {capsuleDays} 天后解锁
                          </p>
                        ) : idea.content && (
                          <p className="mt-1 text-[12px] text-[#737373] leading-relaxed line-clamp-2">{truncate(idea.content, 120)}</p>
                        )}
                        <div className="mt-1.5 flex items-center gap-1.5 text-[11px] text-[#a3a3a3]">
                          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
                          </svg>
                          {formatRelativeTime(idea.created_at)}
                        </div>
                      </div>
                      <div className="flex shrink-0 flex-col items-end gap-1.5">
                        {idea.importance > 0 && (
                          <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[9px] font-medium ring-1 ${ic?.bg} ${ic?.text} ${ic?.ring}`}>
                            <span className={`h-1 w-1 rounded-full ${ic?.dot}`} />
                            {impLabel}
                          </span>
                        )}
                        <div className="flex items-center gap-1.5 rounded-full ring-1 ring-[#e5e5e5] px-2.5 py-1">
                          <span className={`h-1.5 w-1.5 rounded-full ${s.dot}`} />
                          <span className="text-[10px] font-medium text-[#737373]">{s.label}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Pagination */}
          <div className="mt-6 flex flex-col items-center gap-2">
            <p className="text-[11px] text-[#a3a3a3] tabular-nums">
              显示 {ideas.length} 条，共 {total} 条
            </p>
            {hasMore && (
              <button
                onClick={handleLoadMore}
                disabled={loadingMore}
                className="inline-flex h-8 items-center gap-1.5 rounded-[8px] border border-[#e5e5e5] bg-white px-4 text-[12px] font-medium text-[#737373] shadow-sm hover:bg-[#fafafa] hover:text-[#171717] disabled:opacity-40 transition-colors"
              >
                {loadingMore ? (
                  <>
                    <div className="h-3 w-3 animate-spin rounded-full border-2 border-[#e5e5e5] border-t-amber-500" />
                    加载中...
                  </>
                ) : (
                  <>
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 5v14"/><path d="M5 12h14"/>
                    </svg>
                    加载更多
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
