"use client";

import { pairKey, type AiCompanion } from "@/hooks/use-ai-companion";
import { getCollectionStyle } from "@/lib/config";

// AI 思考伙伴的展示层：三个面板（苏格拉底追问 / 发现连接 / 杂交台），
// 状态逻辑全部在 use-ai-companion；入口按钮见 ai-entry-buttons.tsx（嵌入捕获框）

export function SocraticPanel({ ai }: { ai: AiCompanion }) {
  if (!ai.socratic) return null;
  return (
    <div className="mb-4 rounded-[10px] bg-white px-4 py-3.5 shadow-sm ring-1 ring-violet-200/60 animate-slide-down">
      <div className="flex items-start gap-3">
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-violet-50 ring-1 ring-violet-200/50">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#7c3aed" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><path d="M12 17h.01"/>
          </svg>
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-semibold text-violet-600 uppercase tracking-[0.06em]">苏格拉底追问</p>
          {ai.socratic.loading ? (
            <p className="mt-1.5 text-[13px] text-[#a3a3a3]">正在思考一个问题…</p>
          ) : (
            <>
              <p className="mt-1 text-[13px] font-medium text-[#171717] leading-relaxed">{ai.socratic.question}</p>
              <textarea
                value={ai.socraticAnswer}
                onChange={e => ai.setSocraticAnswer(e.target.value)}
                rows={2}
                placeholder="写下你的回答..."
                className="mt-2 w-full resize-none rounded-[8px] bg-[#fafafa] p-2.5 text-[13px] text-[#171717] ring-1 ring-[#f0f0f0] placeholder:text-[#a3a3a3] focus:outline-none focus:ring-violet-300/50"
              />
              <div className="mt-2 flex items-center justify-end gap-1.5">
                <button
                  onClick={ai.dismissSocratic}
                  className="inline-flex h-7 items-center rounded-md px-3 text-[11px] font-medium text-[#737373] hover:bg-[#f5f5f5] transition-colors"
                >
                  下次再说
                </button>
                <button
                  onClick={ai.answerSocratic}
                  disabled={!ai.socraticAnswer.trim() || ai.socraticSaving}
                  className="inline-flex h-7 items-center rounded-md bg-violet-500 px-3 text-[11px] font-medium text-white shadow-sm hover:bg-violet-600 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  记下回答
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export function ConnectPanel({ ai }: { ai: AiCompanion }) {
  if (!ai.connectOpen) return null;
  return (
    <div className="mb-4 rounded-[10px] bg-white px-4 py-3.5 shadow-sm ring-1 ring-[#e5e5e5] animate-slide-down">
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-semibold text-sky-600 uppercase tracking-[0.06em]">发现连接</p>
        <div className="flex items-center gap-1">
          {!ai.connectLoading && (
            <button
              onClick={ai.runConnect}
              className="rounded-md px-2 py-1 text-[11px] font-medium text-[#a3a3a3] hover:text-sky-600 hover:bg-[#f5f5f5] transition-colors"
            >
              重新发现
            </button>
          )}
          <button
            onClick={ai.closeConnect}
            className="rounded-md p-1 text-[#a3a3a3] hover:text-[#737373] hover:bg-[#f5f5f5] transition-colors"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 6 6 18"/><path d="m6 6 12 12"/>
            </svg>
          </button>
        </div>
      </div>
      {ai.connectLoading ? (
        <p className="py-3 text-[13px] text-[#a3a3a3]">正在寻找想法之间隐藏的连接…</p>
      ) : ai.connectPairs.length === 0 ? (
        <p className="py-3 text-[13px] text-[#a3a3a3]">{ai.connectMessage || "这次没有发现新的连接"}</p>
      ) : (
        <div className="mt-2 space-y-2">
          {ai.connectPairs.map(p => (
            <div key={pairKey(p)} className="rounded-[8px] bg-[#fafafa] p-3 ring-1 ring-[#f0f0f0]">
              <div className="flex items-center gap-2 text-[13px] font-medium text-[#171717]">
                <span className="min-w-0 truncate">{p.sourceTitle}</span>
                <svg className="shrink-0 text-sky-500" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
                  <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
                </svg>
                <span className="min-w-0 truncate">{p.targetTitle}</span>
              </div>
              <p className="mt-1 text-[12px] text-[#737373] leading-relaxed">{p.explanation}</p>
              <div className="mt-2 flex items-center justify-end gap-1.5">
                <button
                  onClick={() => ai.ignorePair(p)}
                  className="inline-flex h-7 items-center rounded-md px-3 text-[11px] font-medium text-[#737373] hover:bg-[#f5f5f5] transition-colors"
                >
                  忽略
                </button>
                <button
                  onClick={() => ai.confirmPair(p)}
                  disabled={ai.confirmingKey === pairKey(p)}
                  className="inline-flex h-7 items-center rounded-md bg-sky-500 px-3 text-[11px] font-medium text-white shadow-sm hover:bg-sky-600 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  确认关联
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function CatalystPanel({ ai }: { ai: AiCompanion }) {
  if (!ai.catalystOpen) return null;
  return (
    <div className="mb-4 rounded-[10px] bg-white px-4 py-3.5 shadow-sm ring-1 ring-[#e5e5e5] animate-slide-down">
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-semibold text-amber-600 uppercase tracking-[0.06em]">想法杂交台</p>
        <button
          onClick={ai.closeCatalyst}
          className="rounded-md p-1 text-[#a3a3a3] hover:text-[#737373] hover:bg-[#f5f5f5] transition-colors"
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 6 6 18"/><path d="m6 6 12 12"/>
          </svg>
        </button>
      </div>
      {ai.catalystLoading ? (
        <p className="py-3 text-[13px] text-[#a3a3a3]">正在挑选一对值得碰撞的想法…</p>
      ) : !ai.catalystPair ? (
        <p className="py-3 text-[13px] text-[#a3a3a3]">{ai.catalystMessage || "暂时没有合适的配对"}</p>
      ) : (
        <>
          <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-2">
            {[ai.catalystPair.ideaA, ai.catalystPair.ideaB].map(idea => (
              <div key={idea.id} className="rounded-[8px] bg-[#fafafa] p-3 ring-1 ring-[#f0f0f0]">
                <p className="text-[13px] font-medium text-[#171717] line-clamp-1">{idea.title}</p>
                {idea.content && (
                  <p className="mt-0.5 text-[12px] text-[#737373] leading-relaxed line-clamp-2">{idea.content}</p>
                )}
                {idea.collection && (
                  <span className={`mt-1.5 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ring-1 ${getCollectionStyle(idea.collection).bg} ${getCollectionStyle(idea.collection).text} ${getCollectionStyle(idea.collection).ring}`}>
                    <span className={`h-1 w-1 rounded-full ${getCollectionStyle(idea.collection).dot}`} />
                    {idea.collection}
                  </span>
                )}
              </div>
            ))}
          </div>
          {ai.catalystPair.catalyst && (
            <p className="mt-2 rounded-[8px] bg-amber-50 px-3 py-2 text-[12px] text-amber-700 ring-1 ring-amber-200/50 leading-relaxed">
              {ai.catalystPair.catalyst}
            </p>
          )}
          <input
            value={ai.hybridTitle}
            onChange={e => ai.setHybridTitle(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); ai.collide(); } }}
            placeholder="碰撞出的新想法..."
            className="mt-2 h-9 w-full rounded-[8px] bg-white px-3 text-[13px] text-[#171717] ring-1 ring-[#e5e5e5] placeholder:text-[#a3a3a3] focus:outline-none focus:ring-amber-300/50"
          />
          <div className="mt-2 flex items-center justify-end gap-1.5">
            <button
              onClick={ai.closeCatalyst}
              className="inline-flex h-7 items-center rounded-md px-3 text-[11px] font-medium text-[#737373] hover:bg-[#f5f5f5] transition-colors"
            >
              跳过
            </button>
            <button
              onClick={ai.runCatalyst}
              disabled={ai.catalystLoading}
              className="inline-flex h-7 items-center rounded-md px-3 text-[11px] font-medium text-[#737373] hover:bg-[#f5f5f5] transition-colors"
            >
              换一对
            </button>
            <button
              onClick={ai.collide}
              disabled={!ai.hybridTitle.trim() || ai.hybridSaving}
              className="inline-flex h-7 items-center rounded-md bg-amber-500 px-3 text-[11px] font-medium text-white shadow-sm hover:bg-amber-600 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              碰撞生成
            </button>
          </div>
        </>
      )}
    </div>
  );
}
