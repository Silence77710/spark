"use client";

// 详情页对话框：删除确认 + 想法墓志铭（归档/蛰伏时记录放手原因）
import { useState } from "react";

export function ConfirmDeleteDialog({ title, deleting, onCancel, onConfirm }: {
  title: string;
  deleting: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/15 backdrop-blur-sm animate-fade-in" onClick={onCancel}>
      <div className="mx-4 w-full max-w-sm rounded-[10px] bg-white shadow-xl ring-1 ring-[#e5e5e5] p-5 animate-scale-in" onClick={e => e.stopPropagation()}>
        <div className="flex items-center gap-3 mb-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-red-50">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 9v4"/><path d="M12 17h.01"/><path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Z"/>
            </svg>
          </div>
          <div>
            <h3 className="text-[15px] font-semibold text-[#171717]">确认删除</h3>
            <p className="text-[13px] text-[#737373] mt-0.5">此操作不可恢复</p>
          </div>
        </div>
        <p className="text-[13px] text-[#737373] leading-relaxed mb-5">
          确定要删除「<span className="font-medium text-[#171717]">{title}</span>」吗？
        </p>
        <div className="flex justify-end gap-2">
          <button
            onClick={onCancel}
            className="inline-flex h-7 items-center rounded-md border border-[#e5e5e5] bg-white px-3 text-[12px] font-medium text-[#737373] hover:bg-[#fafafa] transition-colors"
          >
            取消
          </button>
          <button
            onClick={onConfirm}
            disabled={deleting}
            className="inline-flex h-7 items-center rounded-md bg-red-500 px-3 text-[12px] font-medium text-white shadow-sm hover:bg-red-600 disabled:opacity-40 transition-colors"
          >
            {deleting ? "删除中..." : "删除"}
          </button>
        </div>
      </div>
    </div>
  );
}

export function EpitaphDialog({ onSkip, onSubmit }: {
  onSkip: () => void;
  onSubmit: (text: string) => void;
}) {
  const [text, setText] = useState("");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/15 backdrop-blur-sm animate-fade-in" onClick={onSkip}>
      <div className="mx-4 w-full max-w-sm rounded-[10px] bg-white shadow-xl ring-1 ring-[#e5e5e5] p-5 animate-scale-in" onClick={e => e.stopPropagation()}>
        <div className="flex items-center gap-3 mb-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-neutral-100">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#737373" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 1.5-1.5-1-2.74-1.5-4.5-1.5A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/>
            </svg>
          </div>
          <div>
            <h3 className="text-[15px] font-semibold text-[#171717]">想法墓志铭</h3>
            <p className="text-[13px] text-[#737373] mt-0.5">为什么放弃这个想法？（可选）</p>
          </div>
        </div>
        <textarea
          value={text}
          onChange={e => setText(e.target.value)}
          placeholder="一句话记录为什么放手..."
          rows={3}
          autoFocus
          className="w-full resize-none rounded-[8px] border border-[#e5e5e5] bg-[#fafafa] px-3 py-2 text-[14px] text-[#171717] placeholder:text-[#a3a3a3] focus:outline-none focus:border-amber-300 focus:ring-1 focus:ring-amber-200/50"
        />
        <div className="mt-4 flex justify-end gap-2">
          <button
            onClick={onSkip}
            className="inline-flex h-7 items-center rounded-md border border-[#e5e5e5] bg-white px-3 text-[12px] font-medium text-[#737373] hover:bg-[#fafafa] transition-colors"
          >
            跳过
          </button>
          <button
            onClick={() => onSubmit(text.trim())}
            disabled={!text.trim()}
            className="inline-flex h-7 items-center rounded-md bg-[#171717] px-3 text-[12px] font-medium text-white shadow-sm hover:bg-[#404040] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            记录
          </button>
        </div>
      </div>
    </div>
  );
}
