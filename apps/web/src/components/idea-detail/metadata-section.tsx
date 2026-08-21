"use client";

// 详情页元数据区：状态 / 重要程度 / 集合 / 情绪 四个下拉
import { useState, useRef } from "react";
import { STATUS_CONFIG, IMPORTANCE_CONFIG, EMOTION_CONFIG, getCollectionStyle } from "@/lib/config";
import { useOutsideClick } from "@/hooks/use-outside-click";
import type { ImportanceLevel } from "@spark/utils";
import type { Idea } from "@/lib/types";

interface MetadataSectionProps {
  idea: Idea;
  importanceLabels: ImportanceLevel[];
  collections: string[];
  onUpdated: (idea: Idea) => void;
  // 状态切到 archived/dormant 时触发（父级弹墓志铭对话框）
  onArchived: (ideaId: string) => void;
  onCollectionsRefresh: () => void;
}

export default function MetadataSection({
  idea, importanceLabels, collections, onUpdated, onArchived, onCollectionsRefresh,
}: MetadataSectionProps) {
  const id = idea.id;
  const [statusOpen, setStatusOpen] = useState(false);
  const [importanceOpen, setImportanceOpen] = useState(false);
  const [collectionOpen, setCollectionOpen] = useState(false);
  const [newCollection, setNewCollection] = useState("");
  const [emotionOpen, setEmotionOpen] = useState(false);
  const statusRef = useRef<HTMLDivElement>(null);
  const importanceRef = useRef<HTMLDivElement>(null);
  const collectionRef = useRef<HTMLDivElement>(null);
  const emotionRef = useRef<HTMLDivElement>(null);

  useOutsideClick(statusRef, () => setStatusOpen(false), statusOpen);
  useOutsideClick(importanceRef, () => setImportanceOpen(false), importanceOpen);
  useOutsideClick(collectionRef, () => setCollectionOpen(false), collectionOpen);
  useOutsideClick(emotionRef, () => setEmotionOpen(false), emotionOpen);

  const patchIdea = async (patch: Record<string, unknown>) => {
    const r = await fetch(`/api/ideas/${id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(patch),
    });
    if (r.ok) onUpdated(await r.json());
    return r.ok;
  };

  const changeStatus = async (status: string) => {
    const ok = await patchIdea({ status });
    setStatusOpen(false);
    if (ok && (status === "archived" || status === "dormant")) onArchived(id);
  };

  const changeImportance = async (importance: number) => {
    await patchIdea({ importance });
    setImportanceOpen(false);
  };

  const changeCollection = async (collection: string) => {
    const ok = await patchIdea({ collection });
    if (ok) onCollectionsRefresh();
    setCollectionOpen(false);
  };

  const changeEmotion = async (emotion: string) => {
    await patchIdea({ emotion: emotion || null });
    setEmotionOpen(false);
  };

  const cur = STATUS_CONFIG.find(s => s.value === idea.status) ?? STATUS_CONFIG[0];
  const curImp = IMPORTANCE_CONFIG.find(c => c.value === idea.importance) ?? IMPORTANCE_CONFIG[0];
  const curImpLabel = importanceLabels.find(l => l.value === idea.importance)?.label ?? curImp.label;

  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-1">
      <div>
        <label className="block text-[11px] font-semibold text-[#a3a3a3] uppercase tracking-[0.06em] mb-1.5">状态</label>
        <div ref={statusRef} className="relative">
          <button
            onClick={() => setStatusOpen(!statusOpen)}
            className="flex items-center gap-2 rounded-md border border-[#e5e5e5] bg-white px-2.5 py-1.5 hover:bg-[#fafafa] transition-colors"
          >
            <span className={`h-1.5 w-1.5 rounded-full ${cur.dot}`} />
            <span className={`text-[13px] font-medium ${cur.text}`}>{cur.label}</span>
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
                  className={`flex w-full items-center gap-2 px-3 py-1.5 text-[13px] hover:bg-[#f5f5f5] transition-colors ${s.value === idea.status ? "bg-amber-50/50" : ""}`}
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
        <label className="block text-[11px] font-semibold text-[#a3a3a3] uppercase tracking-[0.06em] mb-1.5">重要程度</label>
        <div ref={importanceRef} className="relative">
          <button
            onClick={() => setImportanceOpen(!importanceOpen)}
            className="flex items-center gap-2 rounded-md border border-[#e5e5e5] bg-white px-2.5 py-1.5 hover:bg-[#fafafa] transition-colors"
          >
            <span className={`h-1.5 w-1.5 rounded-full ${curImp.dot}`} />
            <span className={`text-[13px] font-medium ${curImp.text}`}>{curImpLabel}</span>
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
                    className={`flex w-full items-center gap-2 px-3 py-1.5 text-[13px] hover:bg-[#f5f5f5] transition-colors ${c.value === idea.importance ? "bg-amber-50/50" : ""}`}
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
        <label className="block text-[11px] font-semibold text-[#a3a3a3] uppercase tracking-[0.06em] mb-1.5">集合</label>
        <div ref={collectionRef} className="relative">
          <button
            onClick={() => { setCollectionOpen(!collectionOpen); setNewCollection(""); }}
            className="flex items-center gap-2 rounded-md border border-[#e5e5e5] bg-white px-2.5 py-1.5 hover:bg-[#fafafa] transition-colors min-h-[30px]"
          >
            {idea.collection ? (
              <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ${getCollectionStyle(idea.collection).bg} ${getCollectionStyle(idea.collection).text} ${getCollectionStyle(idea.collection).ring}`}>
                <span className={`h-1 w-1 rounded-full ${getCollectionStyle(idea.collection).dot}`} />
                {idea.collection}
              </span>
            ) : (
              <span className="text-[13px] text-[#a3a3a3]">无</span>
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
                    className="h-7 w-full rounded-md border border-[#e5e5e5] bg-[#fafafa] px-2.5 text-[13px] text-[#171717] placeholder:text-[#a3a3a3] focus:outline-none focus:border-amber-300 focus:ring-1 focus:ring-amber-200/50"
                  />
                </div>
              </div>
              {collections.length > 0 && (
                <div className="border-t border-[#f0f0f0] pt-1.5">
                  <div className="px-2.5 pb-1">
                    <p className="text-[11px] font-semibold text-[#a3a3a3] uppercase tracking-[0.06em]">已有集合</p>
                  </div>
                  {collections.map(name => (
                    <button
                      key={name}
                      onClick={() => changeCollection(name)}
                      className={`flex w-full items-center gap-2 px-3 py-1.5 text-[13px] hover:bg-[#f5f5f5] transition-colors ${name === idea.collection ? "bg-amber-50/50" : ""}`}
                    >
                      <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ${getCollectionStyle(name).bg} ${getCollectionStyle(name).text} ${getCollectionStyle(name).ring}`}>
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
                    className="flex w-full items-center gap-2 px-3 py-1.5 text-[13px] text-[#a3a3a3] hover:text-red-500 hover:bg-red-50 transition-colors"
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
        <label className="block text-[11px] font-semibold text-[#a3a3a3] uppercase tracking-[0.06em] mb-1.5">情绪</label>
        <div ref={emotionRef} className="relative">
          <button
            onClick={() => setEmotionOpen(!emotionOpen)}
            className="flex items-center gap-2 rounded-md border border-[#e5e5e5] bg-white px-2.5 py-1.5 hover:bg-[#fafafa] transition-colors"
          >
            {idea.emotion ? (
              <>
                <span className={`h-1.5 w-1.5 rounded-full ${EMOTION_CONFIG.find(e => e.value === idea.emotion)?.dot ?? "bg-neutral-300"}`} />
                <span className={`text-[13px] font-medium ${EMOTION_CONFIG.find(e => e.value === idea.emotion)?.text ?? ""}`}>
                  {EMOTION_CONFIG.find(e => e.value === idea.emotion)?.label ?? idea.emotion}
                </span>
              </>
            ) : (
              <span className="text-[13px] text-[#a3a3a3]">无</span>
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
                  className={`flex w-full items-center gap-2 px-3 py-1.5 text-[13px] hover:bg-[#f5f5f5] transition-colors ${em.value === idea.emotion ? "bg-amber-50/50" : ""}`}
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
                  className="flex w-full items-center gap-2 px-3 py-1.5 text-[13px] text-[#a3a3a3] hover:bg-[#f5f5f5] transition-colors border-t border-[#f0f0f0] mt-1"
                >
                  清除
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
