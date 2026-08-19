"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { DEFAULT_IMPORTANCE_LEVELS, type ImportanceLevel } from "@spark/utils";
import { SiteHeader } from "@/components/site-header";
import { DailyReview } from "@/components/daily-review";
import { CaptureBox } from "@/components/capture-box";
import { SocraticPanel, ConnectPanel, CatalystPanel } from "@/components/ai-panels";
import { FilterBar } from "@/components/filter-bar";
import { IdeaList } from "@/components/idea-list";
import { HomeSidebar } from "@/components/home-sidebar";
import { useAiCompanion } from "@/hooks/use-ai-companion";
import { groupIdeas } from "@/lib/group-ideas";
import { countByStatus, countGraveyard, pickDailyIdea } from "@/lib/derive-overview";
import type { ApiResponse, CollectionInfo, Idea } from "@/lib/types";

// 想法流主页：只做数据加载、状态编排与组件组合；
// 展示单元在 src/components/，可复用逻辑在 src/hooks/，常量与纯函数在 src/lib/
export default function HomePage() {
  const router = useRouter();
  const [ideas, setIdeas] = useState<Idea[]>([]);
  const [collections, setCollections] = useState<CollectionInfo[]>([]);
  const [activeCollection, setActiveCollection] = useState("");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  const [activeStatuses, setActiveStatuses] = useState<string[]>([]);
  const [sort, setSort] = useState("important");

  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const pageSize = 20;

  const [daily, setDaily] = useState<Idea | null>(null);
  const [showDaily, setShowDaily] = useState(true);
  const [statusCounts, setStatusCounts] = useState<Record<string, number>>({});
  const [overviewTotal, setOverviewTotal] = useState(0);
  const [overviewLoaded, setOverviewLoaded] = useState(false);

  const [importanceLabels, setImportanceLabels] = useState<ImportanceLevel[]>(DEFAULT_IMPORTANCE_LEVELS);
  const [graveyardCount, setGraveyardCount] = useState(0);
  const [quickMenuId, setQuickMenuId] = useState<string | null>(null);

  const [aiEnabled, setAiEnabled] = useState(false);
  const [aiFeatures, setAiFeatures] = useState<Record<string, boolean>>({});

  const searchTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const loadingMoreRef = useRef(false);

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

  const loadSettings = useCallback(async () => {
    const r = await fetch("/api/settings");
    if (r.ok) {
      const d = await r.json();
      if (d?.importance_levels) setImportanceLabels(d.importance_levels);
      if (d?.ai_enabled !== undefined) setAiEnabled(d.ai_enabled);
      if (d?.ai_features) setAiFeatures(d.ai_features);
    }
  }, []);

  // 侧栏总览：一次全量请求派生每日回顾 / 墓地角标 / 状态分布
  const loadOverview = useCallback(async () => {
    const r = await fetch("/api/ideas?pageSize=999");
    if (!r.ok) return;
    const data: ApiResponse = await r.json();
    const all = data.ideas;
    setDaily(pickDailyIdea(all));
    setGraveyardCount(countGraveyard(all));
    setStatusCounts(countByStatus(all));
    setOverviewTotal(data.total);
    setOverviewLoaded(true);
  }, []);

  const refreshAll = useCallback(() => {
    loadCollections(); loadIdeas(); loadOverview();
  }, [loadCollections, loadIdeas, loadOverview]);

  const ai = useAiCompanion({ enabled: aiEnabled, features: aiFeatures, onIdeasChanged: refreshAll });

  useEffect(() => {
    loadCollections();
    loadSettings();
    loadOverview();
    loadIdeas();
  }, []);

  useEffect(() => {
    loadIdeas();
  }, [search, activeCollection, activeStatuses, sort]);

  const handleSearch = (v: string) => {
    setSearch(v);
    clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => {}, 250);
  };

  const handleLoadMore = () => {
    loadIdeas({ page: page + 1, append: true });
  };

  // 捕获保存完成：无论成败都刷新列表；成功且 AI 开启时触发苏格拉底追问
  const handleCaptureSaved = (created: { id: string; title: string; content: string } | null) => {
    refreshAll();
    if (created) void ai.askSocratic(created.id, created.title, created.content);
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

  const handleRenameCollection = async (oldName: string, newName: string) => {
    await fetch("/api/collections", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ oldName, newName }),
    });
    if (activeCollection === oldName) setActiveCollection(newName);
    loadCollections(); loadIdeas();
  };

  const handleDeleteCollection = async (name: string) => {
    await fetch(`/api/collections?name=${encodeURIComponent(name)}`, { method: "DELETE" });
    if (activeCollection === name) setActiveCollection("");
    loadCollections(); loadIdeas(); loadOverview();
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
    loadOverview();
  };

  const hasMore = ideas.length < total;
  const isSearching = search.trim().length > 0;
  const groups = groupIdeas(ideas, sort, importanceLabels);

  // 无限滚动：底部哨兵进入视口时自动加载下一页。每次 observe 只触发一次，
  // 失败后不自动重试（保留手动按钮兜底），成功翻页后 effect 重建再继续
  useEffect(() => {
    loadingMoreRef.current = loadingMore;
  }, [loadingMore]);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el || !hasMore || loading) return;
    const ob = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && !loadingMoreRef.current) {
        ob.disconnect();
        loadIdeas({ page: page + 1, append: true });
      }
    }, { rootMargin: "320px" });
    ob.observe(el);
    return () => ob.disconnect();
  }, [hasMore, loading, page, loadIdeas]);

  return (
    <div className="mx-auto max-w-[1180px] px-6 py-8">
      <SiteHeader graveyardCount={graveyardCount} />

      {/* 宽屏双栏：主列（捕获 → 筛选 → 列表）+ 右侧常驻侧栏；窄屏回退单列，
          今日回顾在主列以 banner 呈现，筛选全部由 FilterBar 承担 */}
      <div className="lg:flex lg:items-start lg:gap-8">
        <div className="min-w-0 flex-1">
          {daily && showDaily && (
            <div className="lg:hidden">
              <DailyReview idea={daily} onClose={() => setShowDaily(false)} />
            </div>
          )}

          <CaptureBox
            collections={collections}
            onSaved={handleCaptureSaved}
            aiEntry={aiEnabled ? { features: aiFeatures, onRunConnect: ai.runConnect, onRunCatalyst: ai.runCatalyst } : null}
          />
          <SocraticPanel ai={ai} />
          <ConnectPanel ai={ai} />
          <CatalystPanel ai={ai} />

          <FilterBar
            search={search}
            onSearch={handleSearch}
            total={total}
            loading={loading}
            sort={sort}
            onSortChange={setSort}
            activeStatuses={activeStatuses}
            onToggleStatus={toggleStatus}
            onClearStatuses={() => setActiveStatuses([])}
            collections={collections}
            activeCollection={activeCollection}
            onCollectionChange={setActiveCollection}
            onRenameCollection={handleRenameCollection}
            onDeleteCollection={handleDeleteCollection}
            onClearAll={clearAllFilters}
          />

          <IdeaList
            loading={loading}
            ideas={ideas}
            groups={groups}
            isSearching={isSearching}
            activeCollection={activeCollection}
            total={total}
            hasMore={hasMore}
            loadingMore={loadingMore}
            onLoadMore={handleLoadMore}
            sentinelRef={sentinelRef}
            quickMenuId={quickMenuId}
            onToggleQuickMenu={(id) => setQuickMenuId(prev => prev === id ? null : id)}
            onCloseQuickMenu={() => setQuickMenuId(null)}
            onOpenIdea={(id) => { setQuickMenuId(null); router.push(`/ideas/${id}`); }}
            onAdvanceStatus={quickAdvanceStatus}
            onSetImportance={quickSetImportance}
            onArchive={quickArchive}
          />
        </div>

        <HomeSidebar
          daily={daily}
          showDaily={showDaily}
          onCloseDaily={() => setShowDaily(false)}
          statusCounts={statusCounts}
          overviewTotal={overviewTotal}
          overviewLoaded={overviewLoaded}
          activeStatuses={activeStatuses}
          onToggleStatus={toggleStatus}
          onClearStatuses={() => setActiveStatuses([])}
          collections={collections}
          activeCollection={activeCollection}
          onCollectionChange={setActiveCollection}
        />
      </div>
    </div>
  );
}
