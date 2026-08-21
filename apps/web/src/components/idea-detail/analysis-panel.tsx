"use client";

// AI 全方位分析：从五个维度解剖想法（核心假设 / 问题与对象 / 时机 / 最小下一步 / 生长方向）
// 生成结果不落库 —— 用户点「保存分析」确认后才写入 idea_analyses；
// 同一想法可存多份，历史记录可回看；追问的回答随分析一起存档（dimensions[].answer），不写动态时间线
import { useState, useEffect } from "react";
import { formatRelativeTime, getImportanceLabel, type ImportanceLevel } from "@spark/utils";
import { STATUS_BY_VALUE } from "@/lib/config";
import type { Idea, AnalysisDimension, SavedAnalysis } from "@/lib/types";

interface AnalysisPanelProps {
  idea: Idea;
  importanceLabels: ImportanceLevel[];
}

export default function AnalysisPanel({ idea, importanceLabels }: AnalysisPanelProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);
  const [dimensions, setDimensions] = useState<AnalysisDimension[] | null>(null);
  const [model, setModel] = useState<string | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [answerSaving, setAnswerSaving] = useState<string | null>(null);
  const [answerRecorded, setAnswerRecorded] = useState<Record<string, boolean>>({});
  const [saving, setSaving] = useState(false);
  const [savedId, setSavedId] = useState<string | null>(null);
  const [history, setHistory] = useState<SavedAnalysis[]>([]);

  // 把当前非空回答合并进维度数据（存档 / 更新存档时用）
  const withAnswers = (dims: AnalysisDimension[]): AnalysisDimension[] =>
    dims.map(d => {
      const a = answers[d.key]?.trim();
      return a ? { ...d, answer: a } : d;
    });

  useEffect(() => {
    fetch(`/api/ideas/${idea.id}/analyses`)
      .then(r => (r.ok ? r.json() : null))
      .then(d => { if (d?.analyses) setHistory(d.analyses); })
      .catch(() => {});
  }, [idea.id]);

  const generate = async () => {
    setOpen(true);
    setLoading(true);
    setFailed(false);
    setDimensions(null);
    setSavedId(null);
    setAnswers({});
    setAnswerRecorded({});
    try {
      const r = await fetch("/api/ai/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          idea_id: idea.id,
          title: idea.title,
          content: idea.content,
          status: STATUS_BY_VALUE[idea.status]?.label,
          importance_label: getImportanceLabel(importanceLabels, idea.importance),
          created_at: idea.created_at,
        }),
      });
      const data = r.ok ? await r.json() : null;
      if (data?.analysis?.dimensions?.length) {
        setDimensions(data.analysis.dimensions);
        setModel(data.analysis.model ?? null);
      } else {
        setFailed(true);
      }
    } catch {
      setFailed(true);
    }
    setLoading(false);
  };

  // 记下回答：默认只存在本地，随「保存分析」一起入库；
  // 若分析已存档，则直接 PATCH 更新那份存档（不写动态时间线）
  const recordAnswer = async (dim: AnalysisDimension) => {
    const answer = (answers[dim.key] ?? "").trim();
    if (!answer || answerSaving) return;
    setAnswerSaving(dim.key);
    setAnswerRecorded(prev => ({ ...prev, [dim.key]: true }));
    if (savedId && dimensions) {
      const payload = withAnswers(dimensions);
      try {
        const r = await fetch(`/api/ideas/${idea.id}/analyses/${savedId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ dimensions: payload }),
        });
        if (r.ok) {
          setDimensions(payload);
          setHistory(prev => prev.map(h => (h.id === savedId ? { ...h, dimensions: payload } : h)));
        }
      } catch { /* best-effort */ }
    }
    setAnswerSaving(null);
  };

  const saveAnalysis = async () => {
    if (!dimensions || saving) return;
    setSaving(true);
    const payload = withAnswers(dimensions);
    try {
      const r = await fetch(`/api/ideas/${idea.id}/analyses`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dimensions: payload, model }),
      });
      if (r.ok) {
        const saved: SavedAnalysis = await r.json();
        setSavedId(saved.id);
        setDimensions(payload);
        setHistory(prev => [saved, ...prev]);
        setAnswerRecorded(prev => {
          const next = { ...prev };
          payload.forEach(d => { if (d.answer) next[d.key] = true; });
          return next;
        });
      }
    } catch { /* best-effort */ }
    setSaving(false);
  };

  return (
    <div className="border-t border-[#f0f0f0] px-6 py-5">
      {!open ? (
        <button onClick={generate} className="w-full rounded-[8px] bg-teal-50/50 px-4 py-3 text-left ring-1 ring-teal-100 hover:ring-teal-200/60 transition-all group">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-teal-100 ring-1 ring-teal-200/50">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#0d9488" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>
              </svg>
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[14px] font-medium text-teal-700 group-hover:text-teal-600 transition-colors">全方位分析这个想法</p>
              <p className="mt-0.5 text-[12px] text-[#a3a3a3]">核心假设、问题、时机等五个维度解剖，确认后可存档对比</p>
            </div>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#a3a3a3" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 group-hover:translate-x-0.5 group-hover:text-teal-500 transition-all"><path d="m9 18 6-6-6-6"/></svg>
          </div>
        </button>
      ) : (
        <div>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-teal-100 ring-1 ring-teal-200/50">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#0d9488" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>
                </svg>
              </div>
              <span className="text-[13px] font-semibold text-teal-700">全方位分析</span>
            </div>
            <button onClick={() => { setOpen(false); setDimensions(null); setFailed(false); }} className="rounded-md p-1 text-[#a3a3a3] hover:text-[#737373] hover:bg-[#f5f5f5] transition-colors">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
            </button>
          </div>

          {loading ? (
            <div className="flex items-center gap-2 py-4">
              <div className="h-2 w-2 animate-bounce rounded-full bg-teal-300" style={{ animationDelay: "0ms" }} />
              <div className="h-2 w-2 animate-bounce rounded-full bg-teal-300" style={{ animationDelay: "150ms" }} />
              <div className="h-2 w-2 animate-bounce rounded-full bg-teal-300" style={{ animationDelay: "300ms" }} />
              <span className="text-[13px] text-[#a3a3a3]">AI 正在解剖这个想法…</span>
            </div>
          ) : failed ? (
            <div className="py-2">
              <p className="text-[13px] text-[#a3a3a3]">AI 暂时无法完成分析，稍后再试</p>
              <button onClick={generate} className="mt-2 inline-flex h-8 items-center rounded-md border border-[#e5e5e5] bg-white px-3 text-[12px] font-medium text-[#737373] hover:bg-[#fafafa] transition-colors">重试</button>
            </div>
          ) : dimensions && (
            <div className="space-y-2.5">
              {dimensions.map(dim => (
                <div key={dim.key} className="rounded-[8px] bg-teal-50/40 px-3 py-2.5 ring-1 ring-teal-100">
                  <p className="text-[12px] font-semibold text-teal-700 mb-1">{dim.title}</p>
                  <p className="text-[13px] text-[#404040] leading-relaxed whitespace-pre-wrap">{dim.analysis}</p>
                  <div className="mt-2 rounded-[6px] bg-white/70 px-2.5 py-2 ring-1 ring-teal-100">
                  <p className="text-[12px] text-teal-600 leading-relaxed">追问：{dim.question}</p>
                    {answerRecorded[dim.key] ? (
                      <div className="mt-1.5 flex items-start gap-2">
                        <p className="flex-1 text-[13px] text-[#404040] leading-relaxed">
                          <span className="font-medium text-teal-600">我的回答：</span>{answers[dim.key]}
                        </p>
                        <button
                          onClick={() => setAnswerRecorded(prev => ({ ...prev, [dim.key]: false }))}
                          className="shrink-0 text-[11px] text-[#a3a3a3] hover:text-teal-600 transition-colors"
                        >
                          修改
                        </button>
                      </div>
                    ) : (
                      <div className="mt-1.5 flex items-center gap-1.5">
                        <input
                          value={answers[dim.key] ?? ""}
                          onChange={e => setAnswers(prev => ({ ...prev, [dim.key]: e.target.value }))}
                          onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); recordAnswer(dim); } }}
                          placeholder="写下你的回答…"
                          disabled={answerSaving === dim.key}
                          className="h-8 flex-1 rounded-md border border-teal-100 bg-white px-2 text-[13px] text-[#171717] placeholder:text-[#a3a3a3] focus:outline-none focus:border-teal-300 focus:ring-1 focus:ring-teal-200/50 disabled:opacity-50"
                        />
                        <button
                          onClick={() => recordAnswer(dim)}
                          disabled={!(answers[dim.key] ?? "").trim() || answerSaving === dim.key}
                          className="inline-flex h-8 items-center rounded-md border border-teal-200/60 bg-white px-2 text-[12px] font-medium text-teal-600 hover:bg-teal-50 disabled:opacity-30 transition-colors"
                        >
                          记下回答
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}

              <div className="flex items-center gap-2 pt-1">
                {savedId ? (
                  <span className="inline-flex h-8 items-center gap-1 rounded-md bg-teal-50 px-2.5 text-[12px] font-medium text-teal-700 ring-1 ring-teal-200/50">
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                    已存入分析历史
                  </span>
                ) : (
                  <button onClick={saveAnalysis} disabled={saving} className="inline-flex h-8 items-center rounded-md bg-teal-500 px-3 text-[12px] font-medium text-white hover:bg-teal-600 disabled:opacity-40 transition-colors">
                    {saving ? "保存中..." : "保存分析"}
                  </button>
                )}
                <button onClick={generate} className="inline-flex h-8 items-center rounded-md border border-[#e5e5e5] bg-white px-3 text-[12px] font-medium text-[#737373] hover:bg-[#fafafa] transition-colors">
                  重新分析
                </button>
                {!savedId && <span className="ml-auto text-[11px] text-[#a3a3a3]">回答随分析一起存档，确认后才会写入</span>}
              </div>
            </div>
          )}
        </div>
      )}

      <HistoryBlock history={history} highlightId={savedId} />
    </div>
  );
}

// 分析历史：同一想法可存多份，点开展开只读全文
function HistoryBlock({ history, highlightId }: { history: SavedAnalysis[]; highlightId: string | null }) {
  const [open, setOpen] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  if (history.length === 0) return null;

  return (
    <div className="mt-3">
      <button onClick={() => setOpen(!open)} className="flex items-center gap-1.5 text-[12px] font-medium text-[#a3a3a3] hover:text-teal-600 transition-colors">
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`transition-transform ${open ? "rotate-90" : ""}`}>
          <path d="m9 18 6-6-6-6"/>
        </svg>
        分析历史（{history.length}）
      </button>
      {open && (
        <div className="mt-2 space-y-1.5">
          {history.map(a => (
            <div key={a.id} className={`rounded-[8px] px-3 py-2 ring-1 ${a.id === highlightId ? "bg-teal-50/50 ring-teal-200/50" : "bg-[#fafafa] ring-[#f0f0f0]"}`}>
              <button onClick={() => setExpandedId(expandedId === a.id ? null : a.id)} className="flex w-full items-center gap-2 text-left">
                <span className="text-[12px] text-[#737373]">{formatRelativeTime(a.created_at)}</span>
                <span className="text-[11px] text-[#a3a3a3]">{a.dimensions.length} 个维度</span>
                {a.model && <span className="rounded bg-[#f0f0f0] px-1 py-0.5 text-[10px] text-[#a3a3a3]">{a.model}</span>}
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#a3a3a3" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`ml-auto shrink-0 transition-transform ${expandedId === a.id ? "rotate-90" : ""}`}>
                  <path d="m9 18 6-6-6-6"/>
                </svg>
              </button>
              {expandedId === a.id && (
                <div className="mt-2 space-y-2 border-t border-[#f0f0f0] pt-2">
                  {a.dimensions.map(d => (
                    <div key={d.key}>
                      <p className="text-[11px] font-semibold text-teal-700">{d.title}</p>
                      <p className="mt-0.5 text-[12px] text-[#404040] leading-relaxed whitespace-pre-wrap">{d.analysis}</p>
                      <p className="mt-0.5 text-[12px] text-teal-600 leading-relaxed">追问：{d.question}</p>
                      {d.answer && (
                        <p className="mt-0.5 text-[12px] text-[#404040] leading-relaxed">
                          <span className="font-medium text-teal-600">我的回答：</span>{d.answer}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
