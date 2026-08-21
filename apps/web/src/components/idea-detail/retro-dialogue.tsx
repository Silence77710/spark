"use client";

// AI 回望对话：时间胶囊解锁后，AI 基于完整上下文引导用户与过去的自己对话
import { useState } from "react";

interface RetroMessage { role: "user" | "assistant"; content: string; }

export default function RetroDialogue({ ideaId, onActivityAdded }: { ideaId: string; onActivityAdded?: () => void }) {
  const [messages, setMessages] = useState<RetroMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [ended, setEnded] = useState(false);
  const [summary, setSummary] = useState("");

  const startRetro = async () => {
    setOpen(true);
    setMessages([]);
    setEnded(false);
    setSummary("");
    setLoading(true);
    try {
      const r = await fetch("/api/ai/retro", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idea_id: ideaId }),
      });
      if (r.ok) {
        const data = await r.json();
        if (data.reply) {
          setMessages([{ role: "assistant", content: data.reply }]);
        }
      }
    } catch { /* silent */ }
    setLoading(false);
  };

  const sendMessage = async () => {
    if (!input.trim() || loading) return;
    const userMsg = input.trim();
    setInput("");
    const newMessages = [...messages, { role: "user" as const, content: userMsg }];
    setMessages(newMessages);
    setLoading(true);
    try {
      const r = await fetch("/api/ai/retro", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          idea_id: ideaId,
          history: newMessages.map(m => ({ role: m.role, content: m.content })),
        }),
      });
      if (r.ok) {
        const data = await r.json();
        if (data.reply) {
          setMessages([...newMessages, { role: "assistant", content: data.reply }]);
        }
      }
    } catch { /* silent */ }
    setLoading(false);
  };

  const endRetro = async () => {
    if (summary.trim()) {
      try {
        const r = await fetch(`/api/ideas/${ideaId}/activities`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ type: "note", content: `回望反思：${summary.trim()}` }),
        });
        if (r.ok) onActivityAdded?.();
      } catch { /* best-effort */ }
    }
    setOpen(false);
    setMessages([]);
    setEnded(false);
    setSummary("");
  };

  if (!open) {
    return (
      <div className="border-t border-[#f0f0f0] px-6 py-5">
        <button
          onClick={startRetro}
          className="w-full rounded-[8px] bg-emerald-50/50 px-4 py-3 text-left ring-1 ring-emerald-100 hover:ring-emerald-200/60 transition-all group"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-100 ring-1 ring-emerald-200/50">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 12a9 9 0 1 0 18 0 9 9 0 0 0-18 0z"/><path d="M12 7v5l3 3"/>
              </svg>
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[14px] font-medium text-emerald-700 group-hover:text-emerald-600 transition-colors">与过去的自己对话</p>
              <p className="mt-0.5 text-[12px] text-[#a3a3a3]">这个时间胶囊已解锁，AI 可以引导你回望</p>
            </div>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#a3a3a3" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 group-hover:translate-x-0.5 group-hover:text-emerald-500 transition-all">
              <path d="m9 18 6-6-6-6"/>
            </svg>
          </div>
        </button>
      </div>
    );
  }

  return (
    <div className="border-t border-[#f0f0f0] px-6 py-5">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-100 ring-1 ring-emerald-200/50">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 12a9 9 0 1 0 18 0 9 9 0 0 0-18 0z"/><path d="M12 7v5l3 3"/>
            </svg>
          </div>
          <span className="text-[13px] font-semibold text-emerald-700">回望对话</span>
        </div>
        <button
          onClick={() => { setOpen(false); setMessages([]); }}
          className="rounded-md p-1 text-[#a3a3a3] hover:text-[#737373] hover:bg-[#f5f5f5] transition-colors"
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 6 6 18"/><path d="m6 6 12 12"/>
          </svg>
        </button>
      </div>

      <div className="space-y-2.5 mb-3 max-h-[400px] overflow-y-auto">
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
            <div className={`max-w-[85%] rounded-[8px] px-3 py-2 text-[13px] leading-relaxed ${
              msg.role === "user"
                ? "bg-emerald-500 text-white"
                : "bg-emerald-50 text-[#171717] ring-1 ring-emerald-100"
            }`}>
              {msg.content}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="rounded-[8px] bg-emerald-50 px-3 py-2.5 ring-1 ring-emerald-100">
              <div className="flex items-center gap-1.5">
                <div className="h-2 w-2 animate-bounce rounded-full bg-emerald-300" style={{ animationDelay: "0ms" }} />
                <div className="h-2 w-2 animate-bounce rounded-full bg-emerald-300" style={{ animationDelay: "150ms" }} />
                <div className="h-2 w-2 animate-bounce rounded-full bg-emerald-300" style={{ animationDelay: "300ms" }} />
              </div>
            </div>
          </div>
        )}
      </div>

      {ended ? (
        <div className="space-y-2.5">
          <textarea
            value={summary}
            onChange={e => setSummary(e.target.value)}
            placeholder="现在的我怎么看？写一句反思..."
            rows={3}
            autoFocus
            className="w-full resize-none rounded-[8px] border border-emerald-200 bg-emerald-50/30 px-3 py-2 text-[14px] text-[#171717] placeholder:text-[#a3a3a3] focus:outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-200/50"
          />
          <div className="flex justify-end gap-2">
            <button
              onClick={() => { setOpen(false); setMessages([]); setEnded(false); }}
              className="inline-flex h-7 items-center rounded-md border border-[#e5e5e5] bg-white px-3 text-[12px] font-medium text-[#737373] hover:bg-[#fafafa] transition-colors"
            >
              不记录
            </button>
            <button
              onClick={endRetro}
              disabled={!summary.trim()}
              className="inline-flex h-7 items-center rounded-md bg-emerald-500 px-3 text-[12px] font-medium text-white hover:bg-emerald-600 disabled:opacity-30 transition-colors"
            >
              记录反思
            </button>
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
            placeholder="回应..."
            disabled={loading}
            className="h-8 flex-1 rounded-md border border-emerald-200 bg-white px-2.5 text-[13px] text-[#171717] placeholder:text-[#a3a3a3] focus:outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-200/50 disabled:opacity-50"
          />
          <button
            onClick={sendMessage}
            disabled={!input.trim() || loading}
            className="inline-flex h-8 items-center rounded-md bg-emerald-500 px-3 text-[12px] font-medium text-white hover:bg-emerald-600 disabled:opacity-30 transition-colors"
          >
            发送
          </button>
          <button
            onClick={() => setEnded(true)}
            className="inline-flex h-8 items-center rounded-md border border-[#e5e5e5] bg-white px-2.5 text-[12px] font-medium text-[#737373] hover:bg-[#fafafa] transition-colors"
            title="结束对话"
          >
            结束
          </button>
        </div>
      )}
    </div>
  );
}
