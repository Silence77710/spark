"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { DEFAULT_IMPORTANCE_LEVELS, type ImportanceLevel } from "@spark/utils";

const IMPORTANCE_STYLES = [
  { value: 0, dot: "bg-neutral-300",  text: "text-neutral-500",  bg: "bg-neutral-50",  ring: "ring-neutral-200/50" },
  { value: 1, dot: "bg-amber-200",    text: "text-amber-700",    bg: "bg-amber-50",    ring: "ring-amber-200/50" },
  { value: 2, dot: "bg-amber-400",    text: "text-amber-700",    bg: "bg-amber-50",    ring: "ring-amber-200/50" },
  { value: 3, dot: "bg-amber-600",    text: "text-amber-700",    bg: "bg-amber-50",    ring: "ring-amber-200/50" },
  { value: 4, dot: "bg-amber-800",    text: "text-amber-800",    bg: "bg-amber-50",    ring: "ring-amber-300/50" },
];

interface AiFeatureConfig {
  key: string;
  label: string;
  desc: string;
  icon: string;
  color: string;
}

const AI_FEATURES: AiFeatureConfig[] = [
  { key: "socratic", label: "AI 苏格拉底", desc: "保存想法后追问一个深问题", icon: "M12 8v4 M12 16h.01", color: "violet" },
  { key: "connector", label: "AI 连接器", desc: "发现想法间隐藏的连接", icon: "M9 12l2 2 4-4 M21 12c0 5-4 9-9 9s-9-4-9-9 4-9 9-9 9 4 9 9z", color: "sky" },
  { key: "catalyst", label: "想法杂交台", desc: "AI 挑选碰撞对催化新灵感", icon: "M12 2v4 M4.93 4.93l2.83 2.83 M2 12h4 M4.93 19.07l2.83-2.83", color: "amber" },
  { key: "retro", label: "AI 回望对话", desc: "胶囊解锁后与过去的自己对话", icon: "M3 12a9 9 0 1 0 18 0 9 9 0 0 0-18 0z M12 7v5l3 3", color: "emerald" },
  { key: "mirror", label: "思考镜子", desc: "用元数据生成思考模式洞察", icon: "M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Z M12 8v4 M12 16h.01", color: "amber" },
  { key: "devil", label: "反方辩手", desc: "站在想法对立面提出挑战", icon: "M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Z M16 10l-4 4 M8 14l4-4", color: "rose" },
  { key: "coroner", label: "想法验尸官", desc: "分析放弃模式找出规律", icon: "M9 18h6 M10 22h4 M15.09 14c.18-.98.65-1.74 1.41-2.5A4.65 4.65 0 0 0 18 8 6 6 0 0 0 6 8c0 1 .23 2.23 1.5 3.5A4.61 4.61 0 0 1 8.91 14", color: "neutral" },
  { key: "translate", label: "跨界翻译", desc: "把想法翻译到另一个领域", icon: "M5 8l6 6 M4 14l6-6 M2 5h12 M7 2h1 M22 22l-5-10-5 10 M14 18h6", color: "sky" },
  { key: "analyzer", label: "全方位分析", desc: "五维解剖想法，确认后可存档", icon: "M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16Z M21 21l-4.3-4.3", color: "teal" },
];

interface AiInteraction {
  id: string;
  feature: string;
  idea_id: string | null;
  request_summary: string | null;
  response_summary: string | null;
  tokens_used: number | null;
  created_at: string;
}

function formatTime(ts: string) {
  const diff = Date.now() - new Date(ts).getTime();
  if (diff < 60000) return "刚刚";
  if (diff < 3600000) return `${Math.floor(diff / 60000)}分钟前`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}小时前`;
  return new Date(ts).toLocaleDateString("zh-CN");
}

export default function SettingsPage() {
  const router = useRouter();
  const [levels, setLevels] = useState<ImportanceLevel[]>(DEFAULT_IMPORTANCE_LEVELS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [aiEnabled, setAiEnabled] = useState(false);
 const [aiFeatures, setAiFeatures] = useState<Record<string, boolean>>({ socratic: true, connector: true, catalyst: true, retro: true });
  // mirror/devil/coroner/translate default to true once AI is enabled
  const [interactions, setInteractions] = useState<AiInteraction[]>([]);

  useEffect(() => {
    fetch("/api/settings")
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        if (d?.importance_levels) setLevels(d.importance_levels);
        if (d?.ai_enabled !== undefined) setAiEnabled(d.ai_enabled);
        if (d?.ai_features) setAiFeatures(d.ai_features);
        setLoading(false);
      })
      .catch(() => setLoading(false));
    fetch("/api/ai/interactions?limit=20")
      .then(r => r.ok ? r.json() : { interactions: [] })
      .then(d => setInteractions(d.interactions ?? []))
      .catch(() => {});
  }, []);

  const updateLevel = (value: number, field: "label" | "description", v: string) => {
    setLevels(prev => prev.map(l => l.value === value ? { ...l, [field]: v } : l));
    setSaved(false);
  };

  const save = async () => {
    setSaving(true);
    try {
      await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ importance_levels: levels }),
      });
      setSaved(true);
    } catch { /* network error */ }
    setSaving(false);
  };

  const toggleAi = async () => {
    const next = !aiEnabled;
    setAiEnabled(next);
    try {
      await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ai_enabled: next }),
      });
    } catch {
      setAiEnabled(!next);
    }
  };

  const toggleFeature = async (key: string) => {
    const next = { ...aiFeatures, [key]: !aiFeatures[key] };
    setAiFeatures(next);
    try {
      await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ai_features: next }),
      });
    } catch { /* revert on error */ }
  };

  if (loading) return (
    <div className="mx-auto max-w-[640px] px-6 py-8">
      <div className="flex items-center justify-center py-24">
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-[#e5e5e5] border-t-amber-500" />
      </div>
    </div>
  );

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

      {/* Settings Card */}
      <div className="rounded-[10px] bg-white shadow-sm ring-1 ring-[#e5e5e5] overflow-hidden">
        {/* Header */}
        <div className="border-b border-[#f0f0f0] px-5 py-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-7 w-7 items-center justify-center rounded-[8px] bg-amber-50 ring-1 ring-amber-200/50">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/>
                <circle cx="12" cy="12" r="3"/>
              </svg>
            </div>
            <h1 className="text-[16px] font-semibold text-[#171717]">设置</h1>
          </div>
        </div>

        {/* Body */}
        <div className="px-5 py-4 space-y-5">
          {/* Importance levels */}
          <div>
            <div className="mb-3">
              <label className="block text-[10px] font-semibold text-[#a3a3a3] uppercase tracking-[0.06em] mb-0.5">重要程度</label>
              <p className="text-[11px] text-[#a3a3a3]">自定义每个等级的名称和描述</p>
            </div>
            <div className="space-y-2">
              {levels.map(level => {
                const style = IMPORTANCE_STYLES.find(s => s.value === level.value) ?? IMPORTANCE_STYLES[0];
                return (
                  <div key={level.value} className="flex items-start gap-3 rounded-[8px] bg-[#fafafa] p-3 ring-1 ring-[#f0f0f0]">
                    <div className="flex items-center gap-2 shrink-0 pt-1">
                      <span className={`h-2 w-2 rounded-full ${style.dot}`} />
                      <span className="text-[10px] font-medium text-[#a3a3a3] tabular-nums">L{level.value}</span>
                    </div>
                    <div className="min-w-0 flex-1 space-y-1.5">
                      <input
                        value={level.label}
                        onChange={e => updateLevel(level.value, "label", e.target.value)}
                        placeholder={`等级 ${level.value} 名称`}
                        className="w-full rounded-md border border-[#e5e5e5] bg-white px-2.5 py-1.5 text-[13px] text-[#171717] placeholder:text-[#a3a3a3] transition-all focus:outline-none focus:border-amber-300 focus:ring-1 focus:ring-amber-200/50"
                      />
                      <input
                        value={level.description}
                        onChange={e => updateLevel(level.value, "description", e.target.value)}
                        placeholder="描述（可选）"
                        className="w-full rounded-md border border-[#e5e5e5] bg-white px-2.5 py-1 text-[11px] text-[#737373] placeholder:text-[#a3a3a3] transition-all focus:outline-none focus:border-amber-300 focus:ring-1 focus:ring-amber-200/50"
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* AI Companion */}
          <div>
            <div className="mb-3">
              <label className="block text-[10px] font-semibold text-[#a3a3a3] uppercase tracking-[0.06em] mb-0.5">AI 思考伙伴</label>
              <p className="text-[11px] text-[#a3a3a3]">AI 是按需邀请的，默认关闭，开启后可分功能控制</p>
            </div>

            {/* Master toggle */}
            <div className="flex items-center justify-between rounded-[8px] bg-[#fafafa] p-3 ring-1 ring-[#f0f0f0]">
              <div className="flex items-center gap-2.5">
                <div className="flex h-7 w-7 items-center justify-center rounded-[8px] bg-violet-50 ring-1 ring-violet-200/50">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#8b5cf6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Z"/>
                    <path d="M12 8v4"/>
                    <path d="M12 16h.01"/>
                  </svg>
                </div>
                <div>
                  <p className="text-[13px] font-medium text-[#171717]">总开关</p>
                  <p className="text-[11px] text-[#a3a3a3]">{aiEnabled ? "已开启" : "默认关闭"}</p>
                </div>
              </div>
              <button
                onClick={toggleAi}
                className={`relative h-6 w-11 rounded-full transition-colors ${aiEnabled ? "bg-violet-500" : "bg-[#d4d4d4]"}`}
              >
                <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${aiEnabled ? "translate-x-5" : "translate-x-0.5"}`} />
              </button>
            </div>

            {/* Per-feature toggles */}
            {aiEnabled && (
              <div className="mt-2 space-y-1.5">
                {AI_FEATURES.map(feat => {
                  const enabled = aiFeatures[feat.key] !== false;
                  return (
                    <div key={feat.key} className="flex items-center justify-between rounded-[8px] bg-[#fafafa] px-3 py-2.5 ring-1 ring-[#f0f0f0]">
                      <div className="flex items-center gap-2.5">
                        <div className={`flex h-6 w-6 items-center justify-center rounded-[7px] ${enabled ? `bg-${feat.color}-50 ring-1 ring-${feat.color}-200/50` : "bg-neutral-50 ring-1 ring-neutral-200/50"}`}>
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={enabled ? `var(--${feat.color}, #6366f1)` : "#a3a3a3"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d={feat.icon}/>
                          </svg>
                        </div>
                        <div>
                          <p className="text-[12px] font-medium text-[#171717]">{feat.label}</p>
                          <p className="text-[10px] text-[#a3a3a3]">{feat.desc}</p>
                        </div>
                      </div>
                      <button
                        onClick={() => toggleFeature(feat.key)}
                        className={`relative h-5 w-9 rounded-full transition-colors ${enabled ? `bg-${feat.color}-500` : "bg-[#d4d4d4]"}`}
                      >
                        <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow-sm transition-transform ${enabled ? "translate-x-4" : "translate-x-0.5"}`} />
                      </button>
                    </div>
                  );
                })}

                {/* Privacy notice */}
                <div className="mt-2 rounded-[8px] bg-violet-50/50 p-3 ring-1 ring-violet-100">
                  <p className="text-[11px] text-violet-700 leading-relaxed">
                    开启的 AI 功能会在你主动触发时，将相关想法的标题和内容发送到外部 AI 服务（{process.env.NEXT_PUBLIC_AI_PROVIDER || "deepseek"}）。不会自动扫描或批量发送。可随时关闭。
                  </p>
                </div>

                {/* Data sending log */}
                <div className="mt-3">
                  <div className="mb-2 flex items-center gap-1.5">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#a3a3a3" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                      <path d="M14 2v6h6"/>
                      <path d="M16 13H8"/>
                      <path d="M16 17H8"/>
                    </svg>
                    <span className="text-[10px] font-semibold text-[#a3a3a3] uppercase tracking-[0.06em]">数据发送日志</span>
                  </div>
                  {interactions.length === 0 ? (
                    <p className="text-[11px] text-[#a3a3a3] py-3 text-center">暂无 AI 交互记录</p>
                  ) : (
                    <div className="space-y-1 max-h-[200px] overflow-y-auto">
                      {interactions.map(i => (
                        <div key={i.id} className="flex items-center gap-2 rounded-md bg-[#fafafa] px-2.5 py-1.5 ring-1 ring-[#f0f0f0]">
                          <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${
                           i.feature === "socratic" ? "bg-violet-400" :
                           i.feature === "connector" ? "bg-sky-400" :
                           i.feature === "catalyst" ? "bg-amber-400" :
                           i.feature === "retro" ? "bg-emerald-400" :
                           i.feature === "mirror" ? "bg-amber-400" :
                           i.feature === "devil" ? "bg-rose-400" :
                           i.feature === "coroner" ? "bg-neutral-400" :
                           i.feature === "translate" ? "bg-sky-400" : "bg-neutral-400"
                          }`} />
                          <span className="text-[11px] font-medium text-[#737373] shrink-0">{i.feature}</span>
                          <span className="text-[10px] text-[#a3a3a3] truncate flex-1">{i.request_summary || "—"}</span>
                          <span className="text-[10px] text-[#a3a3a3] shrink-0 tabular-nums">{formatTime(i.created_at)}</span>
                          {i.tokens_used != null && <span className="text-[9px] text-[#d4d4d4] shrink-0 tabular-nums">{i.tokens_used}t</span>}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-[#f0f0f0] px-5 py-3 flex items-center justify-between">
          <div className="text-[11px] text-[#a3a3a3]">
            {saved && <span className="text-emerald-600">已保存</span>}
          </div>
          <button
            onClick={save}
            disabled={saving}
            className="inline-flex h-7 items-center rounded-md bg-amber-500 px-3 text-[11px] font-medium text-white shadow-sm hover:bg-amber-600 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            {saving ? "保存中..." : "保存设置"}
          </button>
        </div>
      </div>
    </div>
  );
}
