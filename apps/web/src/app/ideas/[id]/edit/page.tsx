"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import { MarkdownPreview } from "@/components/markdown";

interface Idea {
  id: string; title: string; content: string; status: string;
  created_at: string; updated_at: string; last_reviewed_at: string | null;
}

export default function IdeaEditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [preview, setPreview] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch(`/api/ideas/${id}`).then(r => r.ok ? r.json() : null).then((d: Idea | null) => {
      if (d) { setTitle(d.title); setContent(d.content || ""); }
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [id]);

  const save = async () => {
    if (!title.trim()) return;
    setSaving(true);
    const r = await fetch(`/api/ideas/${id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: title.trim(), content: content.trim() }),
    });
    if (r.ok) router.push(`/ideas/${id}`);
    setSaving(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      save();
    }
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
        onClick={() => router.back()}
        className="group mb-6 flex items-center gap-1 text-[12px] text-[#a3a3a3] hover:text-amber-600 transition-colors"
      >
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="transition-transform group-hover:-translate-x-0.5">
          <path d="m15 18-6-6 6-6"/>
        </svg>
        返回
      </button>

      {/* Form */}
      <div className="rounded-[10px] bg-white shadow-sm ring-1 ring-[#e5e5e5] overflow-hidden">
        <div className="border-b border-[#f0f0f0] px-5 py-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-7 w-7 items-center justify-center rounded-[8px] bg-amber-50 ring-1 ring-amber-200/50">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2l2 7h7l-5.5 4 2 7L12 16l-5.5 4 2-7L3 9h7z"/>
              </svg>
            </div>
            <h1 className="text-[14px] font-semibold text-[#171717]">编辑想法</h1>
          </div>
        </div>
        <div className="px-5 py-4 space-y-4">
          <div>
            <label className="block text-[10px] font-semibold text-[#a3a3a3] uppercase tracking-[0.06em] mb-1.5">标题</label>
            <input
              value={title}
              onChange={e => setTitle(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="想法标题"
              className="w-full rounded-[8px] border border-[#e5e5e5] bg-white px-3 py-2 text-[13px] text-[#171717] placeholder:text-[#a3a3a3] transition-all focus:outline-none focus:border-amber-300 focus:ring-1 focus:ring-amber-200/50"
            />
          </div>
          <div>
            <label className="block text-[10px] font-semibold text-[#a3a3a3] uppercase tracking-[0.06em] mb-1.5">内容</label>
            <div className="flex items-center justify-end gap-2 mb-1.5">
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
              <div className="min-h-[200px] rounded-[8px] bg-[#fafafa] p-4 ring-1 ring-[#f0f0f0]">
                <MarkdownPreview content={content} />
              </div>
            ) : (
            <textarea
              value={content}
              onChange={e => setContent(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="详细描述..."
              rows={12}
              className="w-full rounded-[8px] border border-[#e5e5e5] bg-white px-3 py-2 text-[13px] text-[#171717] placeholder:text-[#a3a3a3] transition-all focus:outline-none focus:border-amber-300 focus:ring-1 focus:ring-amber-200/50 resize-y leading-relaxed"
            />
            )}
          </div>
          <div className="flex items-center justify-between pt-1 border-t border-[#f0f0f0]">
            <div className="text-[11px] text-[#a3a3a3]">
              <kbd className="inline-flex h-5 w-5 items-center justify-center rounded border border-[#e5e5e5] bg-[#fafafa] text-[10px] font-medium text-[#737373]">⌘</kbd>
              <kbd className="ml-0.5 inline-flex h-5 w-5 items-center justify-center rounded border border-[#e5e5e5] bg-[#fafafa] text-[10px] font-medium text-[#737373]">↵</kbd>
              <span className="ml-1">保存</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => router.back()}
                className="inline-flex h-7 items-center rounded-md border border-[#e5e5e5] bg-white px-3 text-[11px] font-medium text-[#737373] hover:bg-[#fafafa] transition-colors"
              >
                取消
              </button>
              <button
                onClick={save}
                disabled={saving || !title.trim()}
                className="inline-flex h-7 items-center rounded-md bg-amber-500 px-3 text-[11px] font-medium text-white shadow-sm hover:bg-amber-600 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                {saving ? "保存中..." : "保存"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
