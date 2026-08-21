"use client";

// AI 反方辩手：站在想法对立面提出挑战
import { useState } from "react";

interface DevilChallenge { angle: string; challenge: string; }

export default function DevilPanel({ ideaId, title, content }: { ideaId: string; title: string; content: string }) {
  const [challenges, setChallenges] = useState<DevilChallenge[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);

  const fetchDevil = async () => {
    setOpen(true);
    setLoading(true);
    try {
      const r = await fetch("/api/ai/devil", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idea_id: ideaId, title, content }),
      });
      if (r.ok) {
        const data = await r.json();
        setChallenges(data.challenges ?? []);
      }
    } catch { /* silent */ }
    setLoading(false);
  };

  if (!open) {
    return (
      <div className="border-t border-[#f0f0f0] px-6 py-5">
        <button onClick={fetchDevil} className="w-full rounded-[8px] bg-rose-50/50 px-4 py-3 text-left ring-1 ring-rose-100 hover:ring-rose-200/60 transition-all group">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-rose-100 ring-1 ring-rose-200/50">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#e11d48" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Z"/><path d="M16 10l-4 4"/><path d="M8 14l4-4"/>
              </svg>
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[14px] font-medium text-rose-700 group-hover:text-rose-600 transition-colors">让 AI 当你的反方辩手</p>
              <p className="mt-0.5 text-[12px] text-[#a3a3a3]">从对立面挑战这个想法，帮你发现盲区</p>
            </div>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#a3a3a3" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 group-hover:translate-x-0.5 group-hover:text-rose-500 transition-all"><path d="m9 18 6-6-6-6"/></svg>
          </div>
        </button>
      </div>
    );
  }

  return (
    <div className="border-t border-[#f0f0f0] px-6 py-5">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-rose-100 ring-1 ring-rose-200/50">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#e11d48" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Z"/><path d="M16 10l-4 4"/><path d="M8 14l4-4"/>
            </svg>
          </div>
          <span className="text-[13px] font-semibold text-rose-700">反方辩手</span>
        </div>
        <button onClick={() => { setOpen(false); setChallenges([]); }} className="rounded-md p-1 text-[#a3a3a3] hover:text-[#737373] hover:bg-[#f5f5f5] transition-colors">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
        </button>
      </div>
      {loading ? (
        <div className="flex items-center gap-2 py-4">
          <div className="h-2 w-2 animate-bounce rounded-full bg-rose-300" style={{ animationDelay: "0ms" }} />
          <div className="h-2 w-2 animate-bounce rounded-full bg-rose-300" style={{ animationDelay: "150ms" }} />
          <div className="h-2 w-2 animate-bounce rounded-full bg-rose-300" style={{ animationDelay: "300ms" }} />
          <span className="text-[13px] text-[#a3a3a3]">AI 正在准备反驳…</span>
        </div>
      ) : challenges.length > 0 ? (
        <div className="space-y-2">
          {challenges.map((ch, i) => (
            <div key={i} className="rounded-[8px] bg-rose-50/50 px-3 py-2.5 ring-1 ring-rose-100">
              <p className="text-[12px] font-semibold text-rose-600 mb-1">{ch.angle}</p>
              <p className="text-[13px] text-[#404040] leading-relaxed">{ch.challenge}</p>
            </div>
          ))}
          <button onClick={fetchDevil} className="w-full rounded-[8px] bg-[#fafafa] py-2 text-[12px] text-[#737373] hover:bg-[#f5f5f5] transition-colors">换个角度挑战</button>
        </div>
      ) : (
        <p className="text-[13px] text-[#a3a3a3] py-2">AI 暂时无法生成反驳，稍后再试</p>
      )}
    </div>
  );
}
