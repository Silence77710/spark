"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { formatRelativeTime } from "@spark/utils";

interface Idea {
  id: string; title: string; content: string; status: string;
  collection: string; importance: number;
  emotion: string | null;
  created_at: string; updated_at: string; last_reviewed_at: string | null;
}

interface ApiResponse { ideas: Idea[]; total: number; page: number; pageSize: number; }

interface BlindSpotResult {
  topicBlindSpots: string[];
  perspectiveBlindSpots: string[];
  emotionBlindSpots: string[];
  promptSuggestions: string[];
  exploredDomains: string[];
}

const STATUS_LABELS: Record<string, string> = {
  seed: "种子", sprout: "萌芽", growing: "生长中",
  realized: "已实现", archived: "已归档", dormant: "休眠",
};

const STATUS_COLORS: Record<string, string> = {
  seed: "bg-amber-400", sprout: "bg-emerald-400", growing: "bg-sky-400",
  realized: "bg-violet-400", archived: "bg-neutral-400", dormant: "bg-stone-400",
};

const EMOTION_LABELS: Record<string, string> = {
  excited: "兴奋", curious: "好奇", anxious: "焦虑", calm: "平静", confused: "困惑", none: "未标记",
};

const EMOTION_COLORS: Record<string, string> = {
  excited: "bg-rose-400", curious: "bg-amber-400", anxious: "bg-orange-400",
  calm: "bg-sky-400", confused: "bg-violet-400", none: "bg-neutral-300",
};

const IMPORTANCE_LABELS = ["未评级", "灵感碎片", "有意思", "想做", "必做"];
const IMPORTANCE_COLORS = ["bg-neutral-300", "bg-slate-400", "bg-amber-400", "bg-orange-500", "bg-rose-500"];

const COLLECTION_PALETTE = [
  { bg: "bg-amber-50", text: "text-amber-700", dot: "bg-amber-400" },
  { bg: "bg-emerald-50", text: "text-emerald-700", dot: "bg-emerald-400" },
  { bg: "bg-sky-50", text: "text-sky-700", dot: "bg-sky-400" },
  { bg: "bg-rose-50", text: "text-rose-700", dot: "bg-rose-400" },
  { bg: "bg-violet-50", text: "text-violet-700", dot: "bg-violet-400" },
  { bg: "bg-orange-50", text: "text-orange-700", dot: "bg-orange-400" },
  { bg: "bg-teal-50", text: "text-teal-700", dot: "bg-teal-400" },
  { bg: "bg-pink-50", text: "text-pink-700", dot: "bg-pink-400" },
];

function getCollectionStyle(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = ((hash << 5) - hash) + name.charCodeAt(i);
  return COLLECTION_PALETTE[Math.abs(hash) % COLLECTION_PALETTE.length];
}

const DAY = 86400000;

export default function RhythmPage() {
  const router = useRouter();
  const [ideas, setIdeas] = useState<Idea[]>([]);
  const [loading, setLoading] = useState(true);
  const [blindSpot, setBlindSpot] = useState<BlindSpotResult | null>(null);
  const [blindSpotLoading, setBlindSpotLoading] = useState(false);
 const [blindSpotMessage, setBlindSpotMessage] = useState("");
 const [promptText, setPromptText] = useState("");
  const [mirrorInsights, setMirrorInsights] = useState<{ insight: string; suggestion: string }[]>([]);
  const [mirrorLoading, setMirrorLoading] = useState(false);
  const [mirrorMessage, setMirrorMessage] = useState("");
  const [showMirror, setShowMirror] = useState(false);

  const loadData = useCallback(async () => {
    const r = await fetch("/api/ideas?pageSize=999");
    if (r.ok) {
      const data: ApiResponse = await r.json();
      setIdeas(data.ideas);
    }
    setLoading(false);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  // Compute stats
  const stats = (() => {
    if (ideas.length === 0) return null;

    const captureByHour = new Array(24).fill(0);
    const captureByDay = new Array(7).fill(0);
    const byImportance = [0, 0, 0, 0, 0];
    const byStatus: Record<string, number> = {};
    const byEmotion: Record<string, number> = {};
    const byCollection: Record<string, number> = {};

    for (const idea of ideas) {
      const d = new Date(idea.created_at);
      captureByHour[d.getHours()]++;
      captureByDay[d.getDay()]++;
      byImportance[idea.importance] = (byImportance[idea.importance] || 0) + 1;
      byStatus[idea.status] = (byStatus[idea.status] || 0) + 1;
      const emo = idea.emotion || "none";
      byEmotion[emo] = (byEmotion[emo] || 0) + 1;
      const col = idea.collection || "未分类";
      byCollection[col] = (byCollection[col] || 0) + 1;
    }

    const seedCount = byStatus["seed"] || 0;
    const statusProgressRate = ideas.length > 0 ? (ideas.length - seedCount) / ideas.length : 0;

    // Activity by day (last 30 days)
    const now = Date.now();
    const activityByDay = new Array(30).fill(0);
    for (const idea of ideas) {
      const diff = Math.floor((now - new Date(idea.updated_at).getTime()) / DAY);
      if (diff >= 0 && diff < 30) activityByDay[29 - diff]++;
    }

    return {
      captureByHour, captureByDay, byImportance, byStatus, byEmotion, byCollection,
      statusProgressRate, activityByDay, total: ideas.length,
    };
  })();

  const maxHourCount = stats ? Math.max(...stats.captureByHour, 1) : 1;
  const maxDayCount = stats ? Math.max(...stats.captureByDay, 1) : 1;
  const maxActivityCount = stats ? Math.max(...stats.activityByDay, 1) : 1;

  const sortedCollections = stats
    ? Object.entries(stats.byCollection).sort((a, b) => b[1] - a[1])
    : [];

  const maxCollectionCount = sortedCollections.length > 0 ? sortedCollections[0][1] : 1;

  const detectBlindSpots = async () => {
    setBlindSpotLoading(true);
    setBlindSpotMessage("");
    try {
      const r = await fetch("/api/ai/blindspot", { method: "POST" });
      const data = await r.json();
      if (data.result) {
        setBlindSpot(data.result);
      } else if (data.message) {
        setBlindSpotMessage(data.message);
      } else {
        setBlindSpotMessage("AI 暂时不可用，稍后再试");
      }
    } catch {
      setBlindSpotMessage("AI 暂时不可用，稍后再试");
    }
   setBlindSpotLoading(false);
 };

  const fetchMirror = async () => {
    setShowMirror(true);
    setMirrorLoading(true);
    setMirrorMessage("");
    try {
      const r = await fetch("/api/ai/mirror", { method: "POST" });
      const data = await r.json();
      if (data.insights && data.insights.length > 0) {
        setMirrorInsights(data.insights);
      } else if (data.message) {
        setMirrorMessage(data.message);
      } else {
        setMirrorMessage("AI 暂时不可用，稍后再试");
      }
    } catch {
      setMirrorMessage("AI 暂时不可用，稍后再试");
    }
    setMirrorLoading(false);
  };

  const goToCapture = (prompt: string) => {
    setPromptText(prompt);
    sessionStorage.setItem("spark-prompt", prompt);
    router.push("/?prompt=" + encodeURIComponent(prompt));
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-[800px] px-6 py-8">
        <div className="flex items-center justify-center py-20">
          <div className="text-[13px] text-[#a3a3a3]">加载中…</div>
        </div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="mx-auto max-w-[800px] px-6 py-8">
        <BackButton router={router} />
        <div className="flex items-center justify-center py-20">
          <div className="text-[13px] text-[#a3a3a3]">还没有想法，先去首页写几个吧</div>
        </div>
      </div>
    );
  }

  const hourLabels = ["0", "3", "6", "9", "12", "15", "18", "21"];
  const dayLabels = ["日", "一", "二", "三", "四", "五", "六"];

  return (
    <div className="mx-auto max-w-[800px] px-6 py-8">
      <BackButton router={router} />

      <header className="mb-6">
        <h1 className="text-[15px] font-semibold tracking-tight text-[#171717]">思考节律</h1>
        <p className="text-[11px] text-[#a3a3a3] tracking-wide mt-0.5">你的思考习惯画像</p>
      </header>

      {/* Capture Heatmap */}
      <section className="mb-6">
        <h2 className="mb-3 text-[12px] font-semibold text-[#737373]">捕获时段热力图</h2>
        <div className="rounded-[10px] bg-white p-4 ring-1 ring-[#e5e5e5]">
          <div className="flex gap-1">
            {/* Hour labels column */}
            <div className="flex flex-col gap-1 pt-[18px]">
              {hourLabels.map((h, i) => (
                <div key={i} className="h-[14px] text-[9px] text-[#d4d4d4] leading-[14px]">{h}</div>
              ))}
            </div>
            {/* Heatmap grid */}
            <div className="flex-1">
              <div className="flex gap-[2px] mb-1">
                {dayLabels.map((d, i) => (
                  <div key={i} className="flex-1 text-center text-[9px] text-[#d4d4d4]">{d}</div>
                ))}
              </div>
              <div className="space-y-[2px]">
                {[0, 3, 6, 9, 12, 15, 18, 21].map((hourStart, rowIdx) => (
                  <div key={rowIdx} className="flex gap-[2px]">
                    {Array.from({ length: 7 }, (_, dayIdx) => {
                      let count = 0;
                      for (let h = hourStart; h < hourStart + 3 && h < 24; h++) {
                        const idx = dayIdx === 0 ? h : h;
                        count += stats.captureByHour[idx] || 0;
                      }
                      // Actually compute from captureByHour and captureByDay
                      const realCount = (() => {
                        let c = 0;
                        for (const idea of ideas) {
                          const d = new Date(idea.created_at);
                          if (d.getDay() === dayIdx && d.getHours() >= hourStart && d.getHours() < hourStart + 3) c++;
                        }
                        return c;
                      })();
                      const intensity = realCount / Math.max(maxHourCount, 1);
                      const bg = realCount === 0 ? "bg-[#f5f5f5]" :
                        intensity > 0.66 ? "bg-amber-500" :
                        intensity > 0.33 ? "bg-amber-300" : "bg-amber-100";
                      return (
                        <div
                          key={dayIdx}
                          className={"flex-1 h-[14px] rounded-[2px] " + bg}
                          title={`${dayLabels[dayIdx]} ${hourStart}:00 - 捕获 ${realCount} 条`}
                        />
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div className="mt-3 flex items-center justify-end gap-2">
            <span className="text-[9px] text-[#d4d4d4]">少</span>
            <div className="flex gap-[2px]">
              <div className="h-2 w-2 rounded-[2px] bg-[#f5f5f5]" />
              <div className="h-2 w-2 rounded-[2px] bg-amber-100" />
              <div className="h-2 w-2 rounded-[2px] bg-amber-300" />
              <div className="h-2 w-2 rounded-[2px] bg-amber-500" />
            </div>
            <span className="text-[9px] text-[#d4d4d4]">多</span>
          </div>
        </div>
      </section>

      {/* Stats Grid */}
      <section className="mb-6 grid grid-cols-2 gap-3">
        {/* Status Progression */}
        <div className="rounded-[10px] bg-white p-4 ring-1 ring-[#e5e5e5]">
          <h3 className="text-[11px] font-medium text-[#a3a3a3]">状态前进率</h3>
          <p className="mt-1 text-[20px] font-semibold text-[#171717] tabular-nums">
            {(stats.statusProgressRate * 100).toFixed(0)}%
          </p>
          <p className="mt-1 text-[10px] text-[#a3a3a3]">走出种子状态的想法占比</p>
        </div>

        {/* Total Ideas */}
        <div className="rounded-[10px] bg-white p-4 ring-1 ring-[#e5e5e5]">
          <h3 className="text-[11px] font-medium text-[#a3a3a3]">想法总数</h3>
          <p className="mt-1 text-[20px] font-semibold text-[#171717] tabular-nums">{stats.total}</p>
          <p className="mt-1 text-[10px] text-[#a3a3a3]">条想法被捕获</p>
        </div>
      </section>

      {/* Importance Distribution */}
      <section className="mb-6">
        <h2 className="mb-3 text-[12px] font-semibold text-[#737373]">重要程度分布</h2>
        <div className="rounded-[10px] bg-white p-4 ring-1 ring-[#e5e5e5] space-y-2">
          {IMPORTANCE_LABELS.map((label, i) => {
            const count = stats.byImportance[i] || 0;
            const pct = stats.total > 0 ? (count / stats.total) * 100 : 0;
            return (
              <div key={i} className="flex items-center gap-3">
                <div className="flex w-16 items-center gap-1.5">
                  <span className={"h-2 w-2 rounded-full " + IMPORTANCE_COLORS[i]} />
                  <span className="text-[11px] text-[#737373]">{label}</span>
                </div>
                <div className="flex-1">
                  <div className="h-4 rounded bg-[#f5f5f5] overflow-hidden">
                    <div className={"h-full rounded " + IMPORTANCE_COLORS[i]} style={{ width: pct + "%" }} />
                  </div>
                </div>
                <span className="w-8 text-right text-[11px] text-[#a3a3a3] tabular-nums">{count}</span>
              </div>
            );
          })}
        </div>
      </section>

      {/* Status Distribution */}
      <section className="mb-6">
        <h2 className="mb-3 text-[12px] font-semibold text-[#737373]">状态分布</h2>
        <div className="rounded-[10px] bg-white p-4 ring-1 ring-[#e5e5e5]">
          <div className="flex flex-wrap gap-2">
            {Object.entries(stats.byStatus).map(([status, count]) => (
              <div key={status} className="flex items-center gap-1.5 rounded-lg bg-[#fafafa] px-2.5 py-1.5 ring-1 ring-[#f0f0f0]">
                <span className={"h-2 w-2 rounded-full " + (STATUS_COLORS[status] || "bg-neutral-400")} />
                <span className="text-[11px] text-[#525252]">{STATUS_LABELS[status] || status}</span>
                <span className="text-[11px] font-medium text-[#a3a3a3] tabular-nums">{count}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Collection Distribution (Eco-niche) */}
      <section className="mb-6">
        <h2 className="mb-3 text-[12px] font-semibold text-[#737373]">灵感生态位</h2>
        <div className="rounded-[10px] bg-white p-4 ring-1 ring-[#e5e5e5] space-y-2">
          {sortedCollections.map(([name, count]) => {
            const style = name === "未分类" ? { dot: "bg-neutral-400", text: "text-neutral-500", bg: "bg-neutral-50" } : getCollectionStyle(name);
            const pct = (count / maxCollectionCount) * 100;
            return (
              <div key={name} className="flex items-center gap-3">
                <div className="flex w-24 items-center gap-1.5">
                  <span className={"h-2 w-2 rounded-full " + style.dot} />
                  <span className="text-[11px] text-[#525252] truncate">{name}</span>
                </div>
                <div className="flex-1">
                  <div className="h-4 rounded bg-[#f5f5f5] overflow-hidden">
                    <div className={"h-full rounded " + style.dot} style={{ width: pct + "%" }} />
                  </div>
                </div>
                <span className="w-8 text-right text-[11px] text-[#a3a3a3] tabular-nums">{count}</span>
              </div>
            );
          })}
        </div>
      </section>

      {/* Emotion Distribution */}
      <section className="mb-6">
        <h2 className="mb-3 text-[12px] font-semibold text-[#737373]">情绪分布</h2>
        <div className="rounded-[10px] bg-white p-4 ring-1 ring-[#e5e5e5]">
          <div className="flex flex-wrap gap-2">
            {Object.entries(stats.byEmotion).map(([emotion, count]) => (
              <div key={emotion} className="flex items-center gap-1.5 rounded-lg bg-[#fafafa] px-2.5 py-1.5 ring-1 ring-[#f0f0f0]">
                <span className={"h-2 w-2 rounded-full " + (EMOTION_COLORS[emotion] || "bg-neutral-300")} />
                <span className="text-[11px] text-[#525252]">{EMOTION_LABELS[emotion] || emotion}</span>
                <span className="text-[11px] font-medium text-[#a3a3a3] tabular-nums">{count}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Activity Frequency (last 30 days) */}
      <section className="mb-6">
        <h2 className="mb-3 text-[12px] font-semibold text-[#737373]">活动频率趋势（30 天）</h2>
        <div className="rounded-[10px] bg-white p-4 ring-1 ring-[#e5e5e5]">
          <div className="flex h-24 items-end gap-[1px]">
            {stats.activityByDay.map((count, i) => (
              <div
                key={i}
                className="flex-1 bg-amber-200 rounded-t-[2px] hover:bg-amber-400 transition-colors"
                style={{ height: count > 0 ? Math.max((count / maxActivityCount) * 100, 4) + "%" : "2px" }}
                title={`${count} 条活动`}
              />
            ))}
          </div>
          <div className="mt-2 flex justify-between text-[9px] text-[#d4d4d4]">
            <span>30 天前</span>
            <span>今天</span>
          </div>
       </div>
     </section>

      {/* Thinking Mirror (AI) */}
      <section className="mb-6">
        <h2 className="mb-3 text-[12px] font-semibold text-[#737373]">思考镜子</h2>
        <div className="rounded-[10px] bg-white p-4 ring-1 ring-[#e5e5e5]">
          {!showMirror && !mirrorLoading && !mirrorInsights.length && (
            <button onClick={fetchMirror} className="w-full rounded-lg bg-[#fafafa] py-6 text-[13px] text-[#737373] hover:bg-[#f5f5f5] transition-colors">
              AI 照见你的思考模式
            </button>
          )}
          {mirrorLoading && (
            <div className="flex items-center justify-center py-8">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 animate-bounce rounded-full bg-amber-300" style={{ animationDelay: "0ms" }} />
                <div className="h-2 w-2 animate-bounce rounded-full bg-amber-300" style={{ animationDelay: "150ms" }} />
                <div className="h-2 w-2 animate-bounce rounded-full bg-amber-300" style={{ animationDelay: "300ms" }} />
                <span className="text-[13px] text-[#a3a3a3] ml-1">AI 正在照见你的思考模式…</span>
              </div>
            </div>
          )}
          {mirrorMessage && !mirrorInsights.length && !mirrorLoading && (
            <div className="text-center py-6">
              <p className="text-[12px] text-[#a3a3a3]">{mirrorMessage}</p>
              <button onClick={fetchMirror} className="mt-3 inline-flex items-center rounded-lg bg-[#f5f5f5] px-4 py-2 text-[12px] text-[#737373] hover:bg-[#efefef] transition-colors">重试</button>
            </div>
          )}
          {mirrorInsights.length > 0 && (
            <div className="space-y-3">
              {mirrorInsights.map((ins, i) => (
                <div key={i} className="rounded-[8px] bg-amber-50/40 px-3 py-2.5 ring-1 ring-amber-100">
                  <div className="flex gap-2">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-amber-100 text-[10px] font-semibold text-amber-600">{i + 1}</span>
                    <div className="min-w-0 flex-1">
                      <p className="text-[12px] text-[#404040] leading-relaxed">{ins.insight}</p>
                      {ins.suggestion && (
                        <p className="mt-1.5 text-[11px] text-amber-600 leading-relaxed flex items-start gap-1">
                          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mt-0.5 shrink-0"><path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Z"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>
                          {ins.suggestion}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
              <button onClick={fetchMirror} className="w-full rounded-lg bg-[#fafafa] py-2 text-[11px] text-[#737373] hover:bg-[#f5f5f5] transition-colors">重新照见</button>
            </div>
          )}
        </div>
      </section>

      {/* Blind Spot Map (AI) */}
      <section className="mb-6">
        <h2 className="mb-3 text-[12px] font-semibold text-[#737373]">思维盲区地图</h2>
        <div className="rounded-[10px] bg-white p-4 ring-1 ring-[#e5e5e5]">
          {!blindSpot && !blindSpotLoading && !blindSpotMessage && (
            <button
              onClick={detectBlindSpots}
              className="w-full rounded-lg bg-[#fafafa] py-6 text-[13px] text-[#737373] hover:bg-[#f5f5f5] transition-colors"
            >
              AI 分析你从未探索的思考维度
            </button>
          )}
          {blindSpotLoading && (
            <div className="flex items-center justify-center py-8">
              <span className="text-[13px] text-[#a3a3a3]">AI 正在分析你的思考版图…</span>
            </div>
          )}
          {blindSpotMessage && !blindSpot && (
            <div className="py-6 text-center text-[12px] text-[#a3a3a3]">{blindSpotMessage}</div>
          )}
          {blindSpot && (
            <div className="space-y-4">
              {/* Explored vs Blind */}
              <div className="flex flex-wrap gap-1.5">
                {blindSpot.exploredDomains.map(d => (
                  <span key={d} className="rounded bg-emerald-50 px-2 py-0.5 text-[10px] text-emerald-700 ring-1 ring-emerald-200/50">
                    {d}
                  </span>
                ))}
                {blindSpot.topicBlindSpots.map(d => (
                  <span key={d} className="rounded bg-neutral-50 px-2 py-0.5 text-[10px] text-neutral-400 ring-1 ring-neutral-200/50">
                    {d}
                  </span>
                ))}
              </div>

              {/* Blind spot categories */}
              <div className="space-y-2">
                {blindSpot.topicBlindSpots.length > 0 && (
                  <div>
                    <p className="text-[10px] font-medium text-[#a3a3a3] mb-1">主题盲区</p>
                    <div className="flex flex-wrap gap-1.5">
                      {blindSpot.topicBlindSpots.map(s => (
                        <span key={s} className="rounded bg-neutral-100 px-2 py-0.5 text-[10px] text-[#a3a3a3]">{s}</span>
                      ))}
                    </div>
                  </div>
                )}
                {blindSpot.perspectiveBlindSpots.length > 0 && (
                  <div>
                    <p className="text-[10px] font-medium text-[#a3a3a3] mb-1">视角盲区</p>
                    <div className="flex flex-wrap gap-1.5">
                      {blindSpot.perspectiveBlindSpots.map(s => (
                        <span key={s} className="rounded bg-neutral-100 px-2 py-0.5 text-[10px] text-[#a3a3a3]">{s}</span>
                      ))}
                    </div>
                  </div>
                )}
                {blindSpot.emotionBlindSpots.length > 0 && (
                  <div>
                    <p className="text-[10px] font-medium text-[#a3a3a3] mb-1">情绪盲区</p>
                    <div className="flex flex-wrap gap-1.5">
                      {blindSpot.emotionBlindSpots.map(s => (
                        <span key={s} className="rounded bg-neutral-100 px-2 py-0.5 text-[10px] text-[#a3a3a3]">{s}</span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Prompt suggestions */}
              {blindSpot.promptSuggestions.length > 0 && (
                <div className="border-t border-[#f0f0f0] pt-3">
                  <p className="text-[10px] font-medium text-[#a3a3a3] mb-2">探索盲区</p>
                  <div className="space-y-1.5">
                    {blindSpot.promptSuggestions.map((p, i) => (
                      <button
                        key={i}
                        onClick={() => goToCapture(p)}
                        className="block w-full rounded-lg bg-amber-50/50 px-3 py-2 text-left text-[12px] text-[#525252] hover:bg-amber-50 hover:text-amber-700 transition-colors ring-1 ring-amber-100"
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

function BackButton({ router }: { router: ReturnType<typeof useRouter> }) {
  return (
    <header className="mb-4">
      <button
        onClick={() => router.push("/")}
        className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#f5f5f5] text-[#a3a3a3] hover:bg-[#efefef] transition-colors"
        title="返回首页"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M19 12H5M12 19l-7-7 7-7"/>
        </svg>
      </button>
    </header>
  );
}
