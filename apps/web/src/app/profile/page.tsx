"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface ThinkingProfile {
  narrative: string;
  styleTags: string[];
  captureRhythm: string;
  topicPreference: string;
  emotionPattern: string;
  decisionStyle: string;
  connectionHabit: string;
}

const TAG_COLORS = [
  "bg-amber-50 text-amber-700 ring-amber-200/50",
  "bg-emerald-50 text-emerald-700 ring-emerald-200/50",
  "bg-sky-50 text-sky-700 ring-sky-200/50",
  "bg-rose-50 text-rose-700 ring-rose-200/50",
  "bg-violet-50 text-violet-700 ring-violet-200/50",
  "bg-orange-50 text-orange-700 ring-orange-200/50",
  "bg-teal-50 text-teal-700 ring-teal-200/50",
  "bg-pink-50 text-pink-700 ring-pink-200/50",
];

function getTagStyle(tag: string) {
  let hash = 0;
  for (let i = 0; i < tag.length; i++) hash = ((hash << 5) - hash) + tag.charCodeAt(i);
  return TAG_COLORS[Math.abs(hash) % TAG_COLORS.length];
}

const DIMENSIONS = [
  { key: "captureRhythm", label: "捕获节律", icon: "M12 2v6M12 22v-6M4.93 4.93l4.24 4.24M14.83 14.83l4.24 4.24M2 12h6M22 12h-6" },
  { key: "topicPreference", label: "主题偏好", icon: "M3 3h7v7H3zM14 3h7v7h-7zM14 14h7v7h-7zM3 14h7v7H3z" },
  { key: "emotionPattern", label: "情绪模式", icon: "M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 1.5-1.5-1-2.74-1.5-4.5-1.5A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" },
  { key: "decisionStyle", label: "决策风格", icon: "M9 18h6M10 22h4M15.09 14c.18-.98.65-1.74 1.41-2.5A4.65 4.65 0 0 0 18 8 6 6 0 0 0 6 8c0 1 .23 2.23 1.5 3.5A4.61 4.61 0 0 1 8.91 14" },
  { key: "connectionHabit", label: "连接习惯", icon: "M9 17H7A5 5 0 0 1 7 7h2M15 7h2a5 5 0 0 1 0 10h-2M8 12h8" },
] as const;

export default function ProfilePage() {
  const router = useRouter();
  const [profile, setProfile] = useState<ThinkingProfile | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const generate = async () => {
    setLoading(true);
    setMessage("");
    try {
      const r = await fetch("/api/ai/profile", { method: "POST" });
      const data = await r.json();
      if (data.profile) {
        setProfile(data.profile);
      } else if (data.message) {
        setMessage(data.message);
      } else {
        setMessage("AI 暂时不可用，稍后再试");
      }
    } catch {
      setMessage("AI 暂时不可用，稍后再试");
    }
    setLoading(false);
  };

  return (
    <div className="mx-auto max-w-[700px] px-6 py-8">
      {/* Header */}
      <header className="mb-6 flex items-center gap-3">
        <button
          onClick={() => router.push("/")}
          className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#f5f5f5] text-[#a3a3a3] hover:bg-[#efefef] transition-colors"
          title="返回首页"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5M12 19l-7-7 7-7"/>
          </svg>
        </button>
        <div>
          <h1 className="text-[15px] font-semibold tracking-tight text-[#171717]">思考风格画像</h1>
          <p className="text-[11px] text-[#a3a3a3] tracking-wide">AI 用你的数据画一幅思考自画像</p>
        </div>
      </header>

      {/* Generate button */}
      {!profile && !loading && !message && (
        <div className="flex flex-col items-center justify-center py-16">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-amber-50 ring-1 ring-amber-200/50">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 18h6M10 22h4"/>
              <path d="M15.09 14c.18-.98.65-1.74 1.41-2.5A4.65 4.65 0 0 0 18 8 6 6 0 0 0 6 8c0 1 .23 2.23 1.5 3.5A4.61 4.61 0 0 1 8.91 14"/>
              <path d="M12 2v2"/>
            </svg>
          </div>
          <p className="mb-2 text-[13px] text-[#737373]">生成你的思考风格画像</p>
          <p className="mb-5 text-center text-[11px] text-[#a3a3a3]">需要至少 20 条想法和 30 天使用数据</p>
          <button
            onClick={generate}
            className="inline-flex items-center rounded-lg bg-[#171717] px-5 py-2 text-[12px] font-medium text-white hover:bg-[#404040] transition-colors"
          >
            生成画像
          </button>
        </div>
      )}

      {loading && (
        <div className="flex flex-col items-center justify-center py-16">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-amber-50 ring-1 ring-amber-200/50 animate-pulse">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 18h6M10 22h4"/>
              <path d="M15.09 14c.18-.98.65-1.74 1.41-2.5A4.65 4.65 0 0 0 18 8 6 6 0 0 0 6 8c0 1 .23 2.23 1.5 3.5A4.61 4.61 0 0 1 8.91 14"/>
            </svg>
          </div>
          <p className="text-[13px] text-[#a3a3a3]">AI 正在阅读你的思考轨迹…</p>
        </div>
      )}

      {message && !profile && !loading && (
        <div className="flex flex-col items-center justify-center py-16">
          <p className="text-[13px] text-[#a3a3a3]">{message}</p>
          <button
            onClick={generate}
            className="mt-4 inline-flex items-center rounded-lg bg-[#f5f5f5] px-4 py-2 text-[12px] text-[#737373] hover:bg-[#efefef] transition-colors"
          >
            重试
          </button>
        </div>
      )}

      {profile && (
        <div className="space-y-4">
          {/* Narrative */}
          <div className="rounded-[10px] bg-white p-5 ring-1 ring-[#e5e5e5]">
            <p className="text-[13px] leading-relaxed text-[#404040]">{profile.narrative}</p>
          </div>

          {/* Style Tags */}
          {profile.styleTags.length > 0 && (
            <div className="rounded-[10px] bg-white p-5 ring-1 ring-[#e5e5e5]">
              <h2 className="mb-3 text-[11px] font-semibold text-[#a3a3a3]">风格标签</h2>
              <div className="flex flex-wrap gap-2">
                {profile.styleTags.map((tag, i) => (
                  <span key={i} className={"rounded-full px-3 py-1 text-[12px] font-medium ring-1 " + getTagStyle(tag)}>
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Dimensions */}
          <div className="grid grid-cols-1 gap-3">
            {DIMENSIONS.map(dim => {
              const value = profile[dim.key as keyof ThinkingProfile] as string;
              if (!value) return null;
              return (
                <div key={dim.key} className="rounded-[10px] bg-white p-4 ring-1 ring-[#e5e5e5]">
                  <div className="mb-2 flex items-center gap-2">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#a3a3a3" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d={dim.icon} />
                    </svg>
                    <h3 className="text-[12px] font-semibold text-[#525252]">{dim.label}</h3>
                  </div>
                  <p className="text-[12px] leading-relaxed text-[#737373]">{value}</p>
                </div>
              );
            })}
          </div>

          {/* Regenerate */}
          <button
            onClick={generate}
            className="w-full rounded-lg bg-[#f5f5f5] py-2.5 text-[12px] text-[#737373] hover:bg-[#efefef] transition-colors"
          >
            重新生成
          </button>
        </div>
      )}
    </div>
  );
}
