"use client";

import { useState, useEffect, useRef } from "react";
import { formatRelativeTime } from "@spark/utils";

interface Activity {
  id: string;
  idea_id: string;
  type: string;
  content: string;
  created_at: string;
}

const ACTIVITY_CONFIG: Record<string, { label: string; color: string }> = {
  capture:       { label: "捕获",   color: "text-amber-500" },
  status_change: { label: "状态变更", color: "text-sky-500" },
  importance_change: { label: "重要程度", color: "text-orange-500" },
  note:          { label: "笔记",   color: "text-emerald-500" },
  research:      { label: "调研",   color: "text-violet-500" },
  discussion:    { label: "讨论",   color: "text-blue-500" },
  prototype:     { label: "原型",   color: "text-orange-500" },
  decision:      { label: "决策",   color: "text-rose-500" },
  reference:     { label: "参考",   color: "text-teal-500" },
  general:       { label: "一般",   color: "text-neutral-400" },
};

function ActivityIcon({ type, size = 14 }: { type: string; size?: number }) {
  const s = size;
  switch (type) {
    case "capture":
      return (
        <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 2l2 7h7l-5.5 4 2 7L12 16l-5.5 4 2-7L3 9h7z"/>
        </svg>
      );
    case "status_change":
      return (
        <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/>
        </svg>
      );
    case "importance_change":
      return (
        <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 15l4-8 4 8"/><path d="M4 15h8"/><path d="M12 15l4-8 4 8"/><path d="M12 15h8"/>
        </svg>
      );
    case "note":
      return (
        <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/>
        </svg>
      );
    case "research":
      return (
        <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>
        </svg>
      );
    case "discussion":
      return (
        <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
        </svg>
      );
    case "prototype":
      return (
        <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z"/><path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z"/><path d="M9 12H4s.55-3.03 2-4"/><path d="M3 17.5 7 13"/>
        </svg>
      );
    case "decision":
      return (
        <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="20 6 9 17 4 12"/>
        </svg>
      );
    case "reference":
      return (
        <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
        </svg>
      );
    default:
      return (
        <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="1"/>
        </svg>
      );
  }
}

export default function ActivityTimeline({ ideaId, refreshKey }: { ideaId: string; refreshKey?: number }) {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [input, setInput] = useState("");
  const [selectedType, setSelectedType] = useState("general");
  const [showTypePicker, setShowTypePicker] = useState(false);
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const typePickerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (typePickerRef.current && !typePickerRef.current.contains(e.target as Node)) {
        setShowTypePicker(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const loadActivities = async () => {
    try {
      const r = await fetch(`/api/ideas/${ideaId}/activities`);
      if (r.ok) setActivities(await r.json());
    } catch {
      // network error, show empty timeline
    }
    setLoading(false);
  };

  useEffect(() => { loadActivities(); }, [ideaId, refreshKey]);

  const saveActivity = async () => {
    if (!input.trim()) return;
    setSaving(true);
    try {
      await fetch(`/api/ideas/${ideaId}/activities`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: selectedType, content: input.trim() }),
      });
      setInput("");
      setSelectedType("general");
      setShowTypePicker(false);
      loadActivities();
    } catch {
      // network error, keep input so user can retry
    }
    setSaving(false);
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      saveActivity();
    }
    if (e.key === "Escape") {
      setInput("");
      setShowTypePicker(false);
      inputRef.current?.blur();
    }
  };

  const typeOptions = Object.entries(ACTIVITY_CONFIG).filter(([k]) => k !== "capture" && k !== "status_change" && k !== "importance_change");

  return (
    <div>
      {/* Section header */}
      <div className="flex items-center gap-2 mb-3">
        <div className="h-px flex-1 bg-[#f0f0f0]" />
        <span className="text-[11px] font-semibold text-[#a3a3a3] uppercase tracking-[0.06em]">活动时间线</span>
        <div className="h-px flex-1 bg-[#f0f0f0]" />
      </div>

      {/* Timeline */}
      {loading ? (
        <div className="space-y-3 py-2">
          {[1, 2].map(i => (
            <div key={i} className="flex items-start gap-3 animate-pulse">
              <div className="h-6 w-6 rounded-full bg-[#f0f0f0] shrink-0" />
              <div className="flex-1 space-y-1.5">
                <div className="h-3 w-3/4 rounded bg-[#f0f0f0]" />
                <div className="h-2.5 w-1/4 rounded bg-[#f0f0f0]" />
              </div>
            </div>
          ))}
        </div>
      ) : activities.length === 0 ? (
        <div className="py-6 text-center">
          <p className="text-[13px] text-[#a3a3a3]">暂无活动记录</p>
          <p className="text-[12px] text-[#d4d4d4] mt-1">写下你对此想法做了什么</p>
        </div>
      ) : (
        <div className="relative">
          {/* Timeline vertical line */}
          <div className="absolute left-[11px] top-2 bottom-2 w-px bg-[#e5e5e5]" />
          <div className="space-y-0">
            {activities.map((a, i) => {
              const cfg = ACTIVITY_CONFIG[a.type] ?? ACTIVITY_CONFIG.general;
              return (
                <div key={a.id} className="relative flex items-start gap-3 py-2.5 animate-slide-up" style={{ animationDelay: `${i * 30}ms` }}>
                  {/* Timeline dot */}
                  <div className={`relative z-10 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white ring-1 ring-[#e5e5e5] ${cfg.color}`}>
                    <ActivityIcon type={a.type} size={12} />
                  </div>
                  {/* Content */}
                  <div className="min-w-0 flex-1 pt-0.5">
                    <p className="text-[13px] text-[#171717] leading-relaxed">{a.content}</p>
                    <div className="mt-0.5 flex items-center gap-2">
                      <span className="text-[11px] text-[#a3a3a3]">{formatRelativeTime(a.created_at)}</span>
                      <span className={`text-[11px] font-medium ${cfg.color}`}>{cfg.label}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Input form */}
      <div className="mt-4 pt-3 border-t border-[#f0f0f0]">
        <div className="flex items-start gap-2">
          {/* Type selector */}
          <div ref={typePickerRef} className="relative shrink-0">
            <button
              onClick={() => setShowTypePicker(!showTypePicker)}
              className="flex h-8 w-8 items-center justify-center rounded-md border border-[#e5e5e5] bg-white hover:bg-[#fafafa] transition-colors"
              title={ACTIVITY_CONFIG[selectedType]?.label ?? "一般"}
            >
              <span className={ACTIVITY_CONFIG[selectedType]?.color ?? "text-neutral-400"}>
                <ActivityIcon type={selectedType} size={12} />
              </span>
            </button>
            {showTypePicker && (
              <div className="absolute bottom-full left-0 mb-1.5 w-36 rounded-[8px] bg-white shadow-lg ring-1 ring-[#e5e5e5] z-10 py-1 animate-scale-in">
                {typeOptions.map(([key, cfg]) => (
                  <button
                    key={key}
                    onClick={() => { setSelectedType(key); setShowTypePicker(false); }}
                    className={`flex w-full items-center gap-2 px-3 py-1.5 text-[12px] hover:bg-[#f5f5f5] transition-colors ${key === selectedType ? "bg-amber-50/50" : ""}`}
                  >
                    <span className={cfg.color}><ActivityIcon type={key} size={11} /></span>
                    <span className="text-[#171717]">{cfg.label}</span>
                    {key === selectedType && (
                      <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="ml-auto">
                        <polyline points="20 6 9 17 4 12"/>
                      </svg>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Input */}
          <div className="flex-1 flex items-center gap-1.5">
            <input
              ref={inputRef}
              placeholder="记录你对此想法做了什么..."
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              className="h-8 flex-1 rounded-md border border-[#e5e5e5] bg-white px-2.5 text-[13px] text-[#171717] placeholder:text-[#a3a3a3] transition-all focus:outline-none focus:border-amber-300 focus:ring-1 focus:ring-amber-200/50"
            />
            <button
              onClick={saveActivity}
              disabled={saving || !input.trim()}
              className="inline-flex h-8 w-8 items-center justify-center rounded-md bg-amber-500 text-white shadow-sm hover:bg-amber-600 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              title="记录活动"
            >
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 2 11 13"/><path d="m22 2-7 20-4-9-9-4Z"/>
              </svg>
            </button>
          </div>
        </div>
        <div className="mt-1.5 text-[11px] text-[#a3a3a3]">
          <kbd className="inline-flex h-4 w-4 items-center justify-center rounded border border-[#e5e5e5] bg-[#fafafa] text-[10px] font-medium text-[#737373]">⌘</kbd>
          <kbd className="ml-0.5 inline-flex h-4 w-4 items-center justify-center rounded border border-[#e5e5e5] bg-[#fafafa] text-[10px] font-medium text-[#737373]">↵</kbd>
          <span className="ml-1">发送</span>
        </div>
      </div>
    </div>
  );
}
