"use client";

import { useRef, useState } from "react";
import { AiEntryButtons } from "@/components/ai-entry-buttons";
import { MarkdownPreview } from "@/components/markdown";
import { useOutsideClick } from "@/hooks/use-outside-click";
import { EMOTION_CONFIG, getCollectionStyle } from "@/lib/config";
import type { CollectionInfo } from "@/lib/types";

interface CaptureBoxProps {
  collections: CollectionInfo[];
  // 保存完成后回调：成功时带上新建想法（供 AI 追问使用），失败时为 null；列表刷新由调用方负责
  onSaved: (created: { id: string; title: string; content: string } | null) => void;
  // AI 功能入口：传入且处于折叠态时，在输入行右侧渲染「发现连接 / 杂交台」
  aiEntry?: {
    features: Record<string, boolean>;
    onRunConnect: () => void;
    onRunCatalyst: () => void;
  } | null;
}

export function CaptureBox({ collections, onSaved, aiEntry }: CaptureBoxProps) {
  const [expanded, setExpanded] = useState(false);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [preview, setPreview] = useState(false);
  const [captureCollection, setCaptureCollection] = useState("");
  const [showCollectionPicker, setShowCollectionPicker] = useState(false);
  const [newCollectionName, setNewCollectionName] = useState("");
  const [captureEmotion, setCaptureEmotion] = useState("");
  const [showEmotionPicker, setShowEmotionPicker] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const collectionPickerRef = useRef<HTMLDivElement>(null);
  useOutsideClick(collectionPickerRef, () => { setShowCollectionPicker(false); setShowEmotionPicker(false); });

  const saveIdea = async () => {
    if (!title.trim()) return;
    const savedTitle = title.trim();
    const savedContent = content.trim();
    const r = await fetch("/api/ideas", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: savedTitle,
        content: savedContent,
        collection: captureCollection.trim(),
        emotion: captureEmotion || undefined,
      }),
    });
    setTitle(""); setContent(""); setCaptureCollection(""); setCaptureEmotion("");
    setExpanded(false); setShowCollectionPicker(false); setShowEmotionPicker(false);
    inputRef.current?.focus();
    const created = r.ok ? await r.json().catch(() => null) : null;
    onSaved(created?.id ? { id: created.id, title: savedTitle, content: savedContent } : null);
  };

  const collapseCapture = () => {
    setTitle(""); setContent(""); setCaptureCollection(""); setCaptureEmotion("");
    setExpanded(false); setShowCollectionPicker(false); setShowEmotionPicker(false);
    inputRef.current?.blur();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) { e.preventDefault(); saveIdea(); }
    if (e.key === "Escape") { collapseCapture(); }
  };

  return (
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

          {/* AI 入口：折叠态时吸附在输入行右侧，展开输入时让位 */}
          {!expanded && aiEntry && (
            <div className="self-center">
              <AiEntryButtons {...aiEntry} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
