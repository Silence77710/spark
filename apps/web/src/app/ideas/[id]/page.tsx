"use client";

// 想法详情页：只做状态编排与组合，展示单元拆到 components/idea-detail/ 与 components/
import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import { formatRelativeTime, DEFAULT_IMPORTANCE_LEVELS, type ImportanceLevel } from "@spark/utils";
import { MarkdownPreview } from "@/components/markdown";
import ActivityTimeline from "@/components/activity-timeline";
import MetadataSection from "@/components/idea-detail/metadata-section";
import RelationshipsSection from "@/components/idea-detail/relationships-section";
import AnalysisPanel from "@/components/idea-detail/analysis-panel";
import DevilPanel from "@/components/idea-detail/devil-panel";
import TranslatePanel from "@/components/idea-detail/translate-panel";
import RetroDialogue from "@/components/idea-detail/retro-dialogue";
import { ConfirmDeleteDialog, EpitaphDialog } from "@/components/idea-detail/dialogs";
import type { Idea } from "@/lib/types";

export default function IdeaDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [idea, setIdea] = useState<Idea | null>(null);
  const [loading, setLoading] = useState(true);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showEpitaph, setShowEpitaph] = useState(false);
  const [epitaphIdeaId, setEpitaphIdeaId] = useState<string | null>(null);
  const [importanceLabels, setImportanceLabels] = useState<ImportanceLevel[]>(DEFAULT_IMPORTANCE_LEVELS);
  const [collections, setCollections] = useState<string[]>([]);
  const [aiEnabled, setAiEnabled] = useState(false);
  const [aiFeatures, setAiFeatures] = useState<Record<string, boolean>>({});
  // 回答追问 / 结束回望等操作写入动态后递增，驱动时间线刷新
  const [activityVersion, setActivityVersion] = useState(0);

  const refreshCollections = () => {
    fetch("/api/collections").then(r => r.ok ? r.json() : []).then((d: { name: string }[]) => setCollections(d.map(c => c.name)));
  };

  useEffect(() => {
    refreshCollections();
    fetch("/api/settings").then(r => r.ok ? r.json() : null).then(d => {
      if (d?.importance_levels) setImportanceLabels(d.importance_levels);
      if (d?.ai_enabled !== undefined) setAiEnabled(d.ai_enabled);
      if (d?.ai_features) setAiFeatures(d.ai_features);
    });
    fetch(`/api/ideas/${id}`).then(r => r.ok ? r.json() : null).then(d => {
      setIdea(d); setLoading(false);
      // 记录回访时间（fire-and-forget，不依赖 UI）
      if (d) {
        fetch(`/api/ideas/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ last_reviewed_at: new Date().toISOString() }),
        }).catch(() => {});
      }
    }).catch(() => setLoading(false));
  }, [id]);

  const handleDelete = async () => {
    setDeleting(true);
    const r = await fetch(`/api/ideas/${id}`, { method: "DELETE" });
    if (r.ok) router.push("/");
    setDeleting(false);
  };

  const submitEpitaph = async (text: string) => {
    if (epitaphIdeaId && text) {
      try {
        await fetch(`/api/ideas/${epitaphIdeaId}`, {
          method: "PATCH", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ epitaph: text }),
        });
      } catch { /* best-effort */ }
    }
    setShowEpitaph(false);
    setEpitaphIdeaId(null);
  };

  if (loading) return (
    <div className="mx-auto max-w-[1120px] px-6 py-8">
      <div className="flex items-center justify-center py-24">
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-[#e5e5e5] border-t-amber-500" />
      </div>
    </div>
  );

  if (!idea) return (
    <div className="mx-auto max-w-[1120px] px-6 py-8">
      <div className="flex flex-col items-center py-20">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white shadow-sm ring-1 ring-[#e5e5e5] mb-4">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#a3a3a3" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"/><path d="m15 9-6 6"/><path d="m9 9 6 6"/>
          </svg>
        </div>
        <p className="text-[15px] font-medium text-[#737373]">想法不存在</p>
        <button onClick={() => router.push("/")} className="mt-3 text-[13px] text-amber-600 hover:text-amber-700 transition-colors">返回首页</button>
      </div>
    </div>
  );

  const isSealed = !!idea.is_capsule && !!idea.unlock_at && new Date(idea.unlock_at) > new Date();
  const capsuleDays = isSealed && idea.unlock_at ? Math.ceil((new Date(idea.unlock_at).getTime() - Date.now()) / 86400000) : 0;
  // 归档/蛰伏的想法不再触发 AI；总开关与分功能开关在设置页控制
  const aiActive = aiEnabled && idea.status !== "archived" && idea.status !== "dormant";

  return (
    <div className="mx-auto max-w-[1120px] px-6 py-8">
      {/* Back */}
      <button
        onClick={() => router.push("/")}
        className="group mb-6 flex items-center gap-1 text-[13px] text-[#a3a3a3] hover:text-amber-600 transition-colors"
      >
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="transition-transform group-hover:-translate-x-0.5">
          <path d="m15 18-6-6 6-6"/>
        </svg>
        返回
      </button>

      {/* Header 卡片（通栏） */}
      <div className="rounded-[10px] bg-white shadow-sm ring-1 ring-[#e5e5e5]">
        <div className="px-6 py-5">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2.5 mb-2">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[8px] bg-amber-50 ring-1 ring-amber-200/50">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 2l2 7h7l-5.5 4 2 7L12 16l-5.5 4 2-7L3 9h7z"/>
                  </svg>
                </div>
                <h1 className="text-[18px] font-semibold text-[#171717] leading-snug">{idea.title}</h1>
              </div>
              <div className="flex items-center gap-3 text-[13px] text-[#a3a3a3]">
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
            <div className="flex shrink-0 gap-1.5">
              <button
                onClick={() => router.push(`/ideas/${id}/edit`)}
                className="inline-flex h-8 items-center rounded-md border border-[#e5e5e5] bg-white px-3 text-[12px] font-medium text-[#737373] hover:bg-[#fafafa] hover:text-amber-600 transition-colors"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-1">
                  <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/>
                </svg>
                编辑
              </button>
              <button
                onClick={() => setConfirmDelete(true)}
                className="inline-flex h-8 items-center rounded-md border border-[#e5e5e5] bg-white px-2.5 text-[#a3a3a3] hover:bg-red-50 hover:text-red-400 hover:border-red-200 transition-colors"
                title="删除"
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/>
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 主体：移动端纵向排列（元数据→内容→时间线），桌面端左主右栏双列 */}
      <div className="mt-5 flex flex-col gap-5 lg:grid lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start">
        {/* 元数据卡：移动端最前，桌面端右侧栏顶部（内含下拉菜单，勿加 overflow-hidden） */}
        <div className="order-1 rounded-[10px] bg-white px-5 py-4 shadow-sm ring-1 ring-[#e5e5e5] lg:col-start-2 lg:row-start-1">
          <MetadataSection
            idea={idea}
            importanceLabels={importanceLabels}
            collections={collections}
            onUpdated={setIdea}
            onArchived={(ideaId) => { setEpitaphIdeaId(ideaId); setShowEpitaph(true); }}
            onCollectionsRefresh={refreshCollections}
          />
        </div>

        {/* 主内容卡：桌面端占左列、纵跨两行 */}
        <div className="order-2 rounded-[10px] bg-white shadow-sm ring-1 ring-[#e5e5e5] overflow-hidden lg:col-start-1 lg:row-start-1 lg:row-span-2">
          <div className="px-6 py-5 space-y-5">
            {/* Content */}
            <div>
              <label className="block text-[11px] font-semibold text-[#a3a3a3] uppercase tracking-[0.06em] mb-2">内容</label>
              {isSealed ? (
                <div className="rounded-[8px] bg-violet-50/50 p-6 text-center ring-1 ring-violet-100">
                  <div className="flex h-12 w-12 mx-auto items-center justify-center rounded-full bg-violet-100 mb-3">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#8b5cf6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect width="18" height="11" x="3" y="11" rx="2" ry="2"/>
                      <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                    </svg>
                  </div>
                  <p className="text-[14px] font-medium text-violet-700">时间胶囊已密封</p>
                  <p className="mt-1 text-[12px] text-violet-400">{capsuleDays} 天后解锁</p>
                </div>
              ) : idea.content ? (
                <div className="rounded-[8px] bg-[#fafafa] p-5 text-[15px] leading-7 text-[#171717] ring-1 ring-[#f0f0f0]">
                  <MarkdownPreview content={idea.content} />
                </div>
              ) : (
                <div className="rounded-[8px] bg-[#fafafa] p-5 text-center text-[14px] text-[#a3a3a3] ring-1 ring-[#f0f0f0]">
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
                  <span className="text-[11px] font-semibold text-[#a3a3a3] uppercase tracking-[0.06em]">墓志铭</span>
                </div>
                <p className="text-[14px] text-[#737373] leading-relaxed italic">{idea.epitaph}</p>
              </div>
            )}
          </div>

          {/* Relationships + Backlinks */}
          {!isSealed && <RelationshipsSection ideaId={id} />}

          {/* AI 全方位分析 */}
          {!isSealed && aiActive && aiFeatures.analyzer !== false && (
            <AnalysisPanel idea={idea} importanceLabels={importanceLabels} />
          )}

          {/* AI 反方辩手 */}
          {!isSealed && aiActive && aiFeatures.devil !== false && (
            <DevilPanel ideaId={id} title={idea.title} content={idea.content} />
          )}

          {/* AI 跨界翻译 */}
          {!isSealed && aiActive && aiFeatures.translate !== false && (
            <TranslatePanel ideaId={id} />
          )}

          {/* AI 回望对话（时间胶囊解锁后） */}
          {!!idea.is_capsule && !isSealed && aiEnabled && aiFeatures.retro !== false && (
            <RetroDialogue ideaId={id} onActivityAdded={() => setActivityVersion(v => v + 1)} />
          )}
        </div>

        {/* 时间线卡：移动端最后，桌面端右侧栏第二张 */}
        <div className="order-3 rounded-[10px] bg-white px-5 py-4 shadow-sm ring-1 ring-[#e5e5e5] lg:col-start-2 lg:row-start-2">
          <ActivityTimeline ideaId={id} refreshKey={activityVersion} />
        </div>
      </div>

      {/* Dialogs */}
      {confirmDelete && (
        <ConfirmDeleteDialog
          title={idea.title}
          deleting={deleting}
          onCancel={() => setConfirmDelete(false)}
          onConfirm={handleDelete}
        />
      )}
      {showEpitaph && (
        <EpitaphDialog
          onSkip={() => { setShowEpitaph(false); setEpitaphIdeaId(null); }}
          onSubmit={submitEpitaph}
        />
      )}
    </div>
  );
}
