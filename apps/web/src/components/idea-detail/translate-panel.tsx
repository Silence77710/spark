"use client";

// AI 跨界翻译：把想法放进另一个领域的语境重新解读
import { useState } from "react";

interface TranslateResult { targetDomain: string; perspective: string; questions: string[]; }

export default function TranslatePanel({ ideaId }: { ideaId: string }) {
  const [result, setResult] = useState<TranslateResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);

  const fetchTranslate = async () => {
    setOpen(true);
    setLoading(true);
    try {
      const r = await fetch("/api/ai/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idea_id: ideaId }),
      });
      if (r.ok) {
        const data = await r.json();
        setResult(data.result);
      }
    } catch { /* silent */ }
    setLoading(false);
  };

  if (!open) {
    return (
      <div className="border-t border-[#f0f0f0] px-6 py-5">
        <button onClick={fetchTranslate} className="w-full rounded-[8px] bg-sky-50/50 px-4 py-3 text-left ring-1 ring-sky-100 hover:ring-sky-200/60 transition-all group">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-sky-100 ring-1 ring-sky-200/50">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#0284c7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 8l6 6"/><path d="m4 14 6-6"/><path d="M2 5h12"/><path d="M7 2h1"/><path d="M22 22l-5-10-5 10"/><path d="M14 18h6"/>
              </svg>
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[14px] font-medium text-sky-700 group-hover:text-sky-600 transition-colors">跨界翻译这个想法</p>
              <p className="mt-0.5 text-[12px] text-[#a3a3a3]">用另一个领域的视角重新解读，激发跨界灵感</p>
            </div>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#a3a3a3" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 group-hover:translate-x-0.5 group-hover:text-sky-500 transition-all"><path d="m9 18 6-6-6-6"/></svg>
          </div>
        </button>
      </div>
    );
  }

  return (
    <div className="border-t border-[#f0f0f0] px-6 py-5">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-sky-100 ring-1 ring-sky-200/50">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#0284c7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 8l6 6"/><path d="m4 14 6-6"/><path d="M2 5h12"/><path d="M7 2h1"/><path d="M22 22l-5-10-5 10"/><path d="M14 18h6"/>
            </svg>
          </div>
          <span className="text-[13px] font-semibold text-sky-700">跨界翻译</span>
        </div>
        <button onClick={() => { setOpen(false); setResult(null); }} className="rounded-md p-1 text-[#a3a3a3] hover:text-[#737373] hover:bg-[#f5f5f5] transition-colors">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
        </button>
      </div>
      {loading ? (
        <div className="flex items-center gap-2 py-4">
          <div className="h-2 w-2 animate-bounce rounded-full bg-sky-300" style={{ animationDelay: "0ms" }} />
          <div className="h-2 w-2 animate-bounce rounded-full bg-sky-300" style={{ animationDelay: "150ms" }} />
          <div className="h-2 w-2 animate-bounce rounded-full bg-sky-300" style={{ animationDelay: "300ms" }} />
          <span className="text-[13px] text-[#a3a3a3]">AI 正在跨界寻找灵感…</span>
        </div>
      ) : result ? (
        <div className="space-y-3">
          <div className="rounded-[8px] bg-sky-50/50 px-3 py-2.5 ring-1 ring-sky-100">
            <div className="flex items-center gap-1.5 mb-1">
              <span className="text-[11px] font-semibold text-sky-600">目标领域</span>
              <span className="rounded bg-sky-100 px-1.5 py-0.5 text-[11px] font-medium text-sky-700">{result.targetDomain}</span>
            </div>
            <p className="text-[13px] text-[#404040] leading-relaxed">{result.perspective}</p>
          </div>
          {result.questions.length > 0 && (
            <div>
              <p className="text-[11px] font-medium text-[#a3a3a3] mb-1.5">跨界启发问题</p>
              <div className="space-y-1.5">
                {result.questions.map((q, i) => (
                  <div key={i} className="flex gap-2 rounded-[8px] bg-[#fafafa] px-3 py-2 ring-1 ring-[#f0f0f0]">
                    <span className="text-[11px] font-medium text-sky-500 shrink-0">Q{i + 1}</span>
                    <p className="text-[13px] text-[#404040] leading-relaxed">{q}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
          <button onClick={fetchTranslate} className="w-full rounded-[8px] bg-[#fafafa] py-2 text-[12px] text-[#737373] hover:bg-[#f5f5f5] transition-colors">换个领域翻译</button>
        </div>
      ) : (
        <p className="text-[13px] text-[#a3a3a3] py-2">AI 暂时无法翻译，稍后再试</p>
      )}
    </div>
  );
}
