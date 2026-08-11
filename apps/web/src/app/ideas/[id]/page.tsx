"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import { formatRelativeTime } from "@spark/utils";
import { MarkdownPreview } from "@/components/markdown";
import ActivityTimeline from "@/components/activity-timeline";

interface Idea {
  id: string; title: string; content: string; status: string;
  collection: string;
  created_at: string; updated_at: string; last_reviewed_at: string | null;
}

const STATUSES = [
  { value: "seed",     label: "种子",   dot: "bg-amber-400",  text: "text-amber-700", bg: "bg-amber-50" },
  { value: "sprout",   label: "萌芽",   dot: "bg-emerald-400",text: "text-emerald-700", bg: "bg-emerald-50" },
  { value: "growing",  label: "生长中", dot: "bg-sky-400",    text: "text-sky-700", bg: "bg-sky-50" },
  { value: "realized", label: "已实现", dot: "bg-violet-400", text: "text-violet-700", bg: "bg-violet-50" },
  { value: "archived", label: "已归档", dot: "bg-neutral-400",text: "text-neutral-500", bg: "bg-neutral-50" },
  { value: "dormant",  label: "休眠",   dot: "bg-stone-400",  text: "text-stone-500", bg: "bg-stone-50" },
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

export default function IdeaDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [idea, setIdea] = useState<Idea | null>(null);
  const [loading, setLoading] = useState(true);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [statusOpen, setStatusOpen] = useState(false);
  const [collections, setCollections] = useState<string[]>([]);
  const [collectionOpen, setCollectionOpen] = useState(false);
  const [newCollection, setNewCollection] = useState("");

  useEffect(() => {
    fetch("/api/collections").then(r => r.ok ? r.json() : []).then(setCollections);
    fetch(`/api/ideas/${id}`).then(r => r.ok ? r.json() : null).then(d => {
      setIdea(d); setLoading(false);
    });
  }, [id]);

  const changeStatus = async (status: string) => {
    const r = await fetch(`/api/ideas/${id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status }),
    });
    if (r.ok) setIdea(await r.json());
    setStatusOpen(false);
  };

  const changeCollection = async (collection: string) => {
    const r = await fetch(`/api/ideas/${id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ collection }),
    });
    if (r.ok) {
      setIdea(await r.json());
      fetch("/api/collections").then(r => r.ok ? r.json() : []).then(setCollections);
    }
    setCollectionOpen(false);
  };

  const handleDelete = async () => {
    setDeleting(true);
    const r = await fetch(`/api/ideas/${id}`, { method: "DELETE" });
    if (r.ok) router.push("/");
    setDeleting(false);
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

  const cur = STATUSES.find(s => s.value === idea.status) ?? STATUSES[0];

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
              <div className="relative">
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
                    {STATUSES.map(s => (
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
              <label className="block text-[10px] font-semibold text-[#a3a3a3] uppercase tracking-[0.06em] mb-1.5">集合</label>
              <div className="relative">
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
          </div>

          {/* Content */}
          <div>
            <label className="block text-[10px] font-semibold text-[#a3a3a3] uppercase tracking-[0.06em] mb-2">内容</label>
            {idea.content ? (
              <div className="rounded-[8px] bg-[#fafafa] p-4 text-[13px] leading-relaxed text-[#171717] ring-1 ring-[#f0f0f0]">
                <MarkdownPreview content={idea.content} />
              </div>
            ) : (
              <div className="rounded-[8px] bg-[#fafafa] p-4 text-center text-[13px] text-[#a3a3a3] ring-1 ring-[#f0f0f0]">
                暂无详细内容
              </div>
            )}
          </div>
        </div>

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
    </div>
  );
}
