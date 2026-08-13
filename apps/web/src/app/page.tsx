"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { formatRelativeTime, truncate } from "@spark/utils";
import { MarkdownPreview } from "@/components/markdown";

interface Idea {
  id: string; title: string; content: string; status: string;
  collection: string;
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

const SORT_OPTIONS = [
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
  const [collections, setCollections] = useState<string[]>([]);
  const [activeCollection, setActiveCollection] = useState("");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  // Status filter (multi-select)
  const [activeStatuses, setActiveStatuses] = useState<string[]>([]);

  // Sort
  const [sort, setSort] = useState("newest");
  const [showSortMenu, setShowSortMenu] = useState(false);

  // Pagination
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const pageSize = 20;

  // Capture form state
  const [expanded, setExpanded] = useState(false);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [preview, setPreview] = useState(false);
  const [captureCollection, setCaptureCollection] = useState("");
  const [showCollectionPicker, setShowCollectionPicker] = useState(false);
  const [newCollectionName, setNewCollectionName] = useState("");

  // Daily review
  const [daily, setDaily] = useState<Idea | null>(null);
  const [showDaily, setShowDaily] = useState(true);

  const inputRef = useRef<HTMLInputElement>(null);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const sortMenuRef = useRef<HTMLDivElement>(null);

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

  useEffect(() => {
    loadCollections();
    loadDaily();
    loadIdeas();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Refresh when filters change
  useEffect(() => {
    loadIdeas();
  }, [search, activeCollection, activeStatuses, sort]); // eslint-disable-line react-hooks/exhaustive-deps

  // Close sort menu on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (sortMenuRef.current && !sortMenuRef.current.contains(e.target as Node)) {
        setShowSortMenu(false);
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
      }),
    });
    setTitle(""); setContent(""); setCaptureCollection(""); setExpanded(false); setShowCollectionPicker(false);
    loadCollections();
    loadIdeas();
    loadDaily();
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) { e.preventDefault(); saveIdea(); }
    if (e.key === "Escape") { collapseCapture(); }
  };

  const collapseCapture = () => {
    setTitle(""); setContent(""); setExpanded(false); setShowCollectionPicker(false);
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

  const hasAnyFilter = activeStatuses.length > 0 || activeCollection || search.trim().length > 0;
  const hasMore = ideas.length < total;
  const isSearching = search.trim().length > 0;

  return (
    <div className="mx-auto max-w-[640px] px-6 py-8">
      {/* ============================
          Header
          ============================ */}
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
          {!loading && total > 0 && (
            <span className="text-[12px] text-[#a3a3a3] tabular-nums">
              {total} 个想法
            </span>
          )}
        </div>
      </header>

      {/* ============================
          Daily Review
          ============================ */}
      {daily && showDaily && (
        <div className="mb-5 animate-slide-down">
          <button
            onClick={() => { router.push(`/ideas/${daily.id}`); }}
            className="group relative w-full rounded-[10px] bg-white px-4 py-3.5 text-left shadow-sm ring-1 ring-[#e5e5e5] transition-all hover:shadow-md hover:ring-amber-200/50 active:scale-[0.99]"
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
          </button>
        </div>
      )}

      {/* ============================
          Capture
          ============================ */}
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

                  {/* Collection picker */}
                  <div className="relative mb-3">
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
                        onClick={() => setShowCollectionPicker(!showCollectionPicker)}
                        className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium text-[#a3a3a3] hover:text-[#737373] hover:bg-[#f5f5f5] transition-colors"
                      >
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M4 20h16"/><path d="M4 4h16v12H4z"/>
                        </svg>
                        {captureCollection ? "更换集合" : "添加到集合"}
                      </button>
                    </div>

                    {showCollectionPicker && (
                      <div className="absolute top-full left-0 mt-1.5 w-56 rounded-[8px] bg-white shadow-lg ring-1 ring-[#e5e5e5] z-50 py-1.5 animate-scale-in">
                        {collections.length > 0 && (
                          <div>
                            <div className="px-3 pb-1">
                              <p className="text-[10px] font-semibold text-[#a3a3a3] uppercase tracking-[0.06em]">已有集合</p>
                            </div>
                            {collections.map(name => (
                              <button
                                key={name}
                                onClick={() => { setCaptureCollection(name); setShowCollectionPicker(false); }}
                                className={`flex w-full items-center gap-2 px-3 py-1.5 text-[13px] hover:bg-[#f5f5f5] transition-colors ${name === captureCollection ? "bg-amber-50/50" : ""}`}
                              >
                                <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ring-1 ${getCollectionStyle(name).bg} ${getCollectionStyle(name).text} ${getCollectionStyle(name).ring}`}>
                                  <span className={`h-1 w-1 rounded-full ${getCollectionStyle(name).dot}`} />
                                  {name}
                                </span>
                                {name === captureCollection && (
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
                  </div>

                  {/* Actions */}
                  <div className="flex items-center justify-between border-t border-[#f0f0f0] pt-3">
                    <div className="flex items-center gap-2 text-[11px] text-[#a3a3a3]">
                      <kbd className="inline-flex h-5 w-5 items-center justify-center rounded border border-[#e5e5e5] bg-[#fafafa] text-[10px] font-medium text-[#737373]">⌘</kbd>
                      <kbd className="inline-flex h-5 w-5 items-center justify-center rounded border border-[#e5e5e5] bg-[#fafafa] text-[10px] font-medium text-[#737373]">↵</kbd>
                      <span>发送</span>
                      <kbd className="inline-flex h-5 w-5 items-center justify-center rounded border border-[#e5e5e5] bg-[#fafafa] text-[10px] font-medium text-[#737373]">↵</kbd>
                      <span>换行</span>
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

      {/* ============================
          Search + Sort
          ============================ */}
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

        {/* Sort dropdown */}
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

      {/* ============================
          Status filters
          ============================ */}
      <div className="mb-3 flex flex-wrap gap-1.5">
        <button
          onClick={() => setActiveStatuses([])}
          className={`inline-flex items-center rounded-full px-3 py-1.5 text-[11px] font-medium transition-colors ${
            activeStatuses.length === 0
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
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-medium transition-colors ${
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
      </div>

      {/* ============================
          Collection filters
          ============================ */}
      {collections.length > 0 && (
        <div className="mb-5 flex flex-wrap gap-1.5">
          <button
            onClick={() => setActiveCollection("")}
            className={`inline-flex items-center rounded-full px-3 py-1.5 text-[11px] font-medium transition-colors ${
              !activeCollection
                ? "bg-[#171717] text-white"
                : "bg-white text-[#737373] ring-1 ring-[#e5e5e5] hover:ring-[#d4d4d4]"
            }`}
          >
            全部
          </button>
          {collections.map(name => {
            const c = getCollectionStyle(name);
            return (
              <button
                key={name}
                onClick={() => toggleCollection(name)}
                className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-medium transition-colors ${
                  activeCollection === name
                    ? `${c.bg} ${c.text} ring-1 ${c.ring}`
                    : "bg-white text-[#737373] ring-1 ring-[#e5e5e5] hover:ring-[#d4d4d4]"
                }`}
              >
                <span className={`h-1.5 w-1.5 rounded-full ${c.dot}`} />
                {name}
              </button>
            );
          })}
        </div>
      )}

      {/* ============================
          Active filters bar
          ============================ */}
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

      {/* ============================
          Content area
          ============================ */}
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
              return (
                <div key={idea.id} className="animate-slide-up" style={{ animationDelay: `${i * 25}ms` }}>
                  <button
                    onClick={() => router.push(`/ideas/${idea.id}`)}
                    className="group relative w-full rounded-[10px] bg-white px-4 py-3.5 text-left shadow-sm ring-1 ring-[#e5e5e5] transition-all hover:shadow-md hover:ring-[#d4d4d4] active:scale-[0.99]"
                  >
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
                        </div>
                        {idea.content && (
                          <p className="mt-1 text-[12px] text-[#737373] leading-relaxed line-clamp-2">{truncate(idea.content, 120)}</p>
                        )}
                        <div className="mt-1.5 flex items-center gap-1.5 text-[11px] text-[#a3a3a3]">
                          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
                          </svg>
                          {formatRelativeTime(idea.created_at)}
                        </div>
                      </div>
                      <div className="flex shrink-0 items-center gap-1.5 rounded-full ring-1 ring-[#e5e5e5] px-2.5 py-1">
                        <span className={`h-1.5 w-1.5 rounded-full ${s.dot}`} />
                        <span className="text-[10px] font-medium text-[#737373]">{s.label}</span>
                      </div>
                    </div>
                  </button>
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
