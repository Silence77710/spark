"use client";

import { useRef, useState } from "react";
import { useOutsideClick } from "@/hooks/use-outside-click";
import { SORT_OPTIONS, STATUS_CONFIG, getCollectionStyle } from "@/lib/config";
import type { CollectionInfo } from "@/lib/types";

// 筛选交互：「状态 pills + 集合下拉弹层 + 激活条件标签」+ 搜索与排序（SPEC 3.2）
interface FilterBarProps {
  search: string;
  onSearch: (v: string) => void;
  total: number;
  loading: boolean;
  sort: string;
  onSortChange: (v: string) => void;
  activeStatuses: string[];
  onToggleStatus: (v: string) => void;
  onClearStatuses: () => void;
  collections: CollectionInfo[];
  activeCollection: string;
  onCollectionChange: (name: string) => void;
  onRenameCollection: (oldName: string, newName: string) => void;
  onDeleteCollection: (name: string) => void;
  onClearAll: () => void;
}

export function FilterBar(props: FilterBarProps) {
  const {
    search, onSearch, total, loading, sort, onSortChange,
    activeStatuses, onToggleStatus, onClearStatuses,
    collections, activeCollection, onCollectionChange,
    onRenameCollection, onDeleteCollection, onClearAll,
  } = props;

  const [showSortMenu, setShowSortMenu] = useState(false);
  const sortMenuRef = useRef<HTMLDivElement>(null);
  useOutsideClick(sortMenuRef, () => setShowSortMenu(false));

  const [showCollectionMenu, setShowCollectionMenu] = useState(false);
  const [collectionMenuMode, setCollectionMenuMode] = useState<"select" | "manage">("select");
  const [collectionQuery, setCollectionQuery] = useState("");
  const [renamingCol, setRenamingCol] = useState<string | null>(null);
  const [renameColVal, setRenameColVal] = useState("");
  const [deletingCol, setDeletingCol] = useState<string | null>(null);
  const collectionMenuRef = useRef<HTMLDivElement>(null);
  useOutsideClick(collectionMenuRef, () => setShowCollectionMenu(false));

  const isSearching = search.trim().length > 0;
  const hasAnyFilter = activeStatuses.length > 0 || !!activeCollection || isSearching;
  const filteredCollections = collectionQuery.trim()
    ? collections.filter(c => c.name.toLowerCase().includes(collectionQuery.trim().toLowerCase()))
    : collections;

  const toggleCollectionMenu = () => {
    if (!showCollectionMenu) {
      setCollectionMenuMode("select");
      setCollectionQuery("");
      setRenamingCol(null);
      setDeletingCol(null);
    }
    setShowCollectionMenu(v => !v);
  };

  const doRename = (oldName: string, newName: string) => {
    if (!newName.trim() || newName.trim() === oldName) { setRenamingCol(null); return; }
    onRenameCollection(oldName, newName.trim());
    setRenamingCol(null); setRenameColVal("");
  };

  const doDelete = (name: string) => {
    onDeleteCollection(name);
    setDeletingCol(null);
  };

  return (
    <>
      {/* Search + Sort */}
      <div className="mb-4 flex items-center gap-2">
        <div className="relative flex-1">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#a3a3a3] pointer-events-none" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>
          </svg>
          <input
            type="text"
            placeholder="搜索想法..."
            value={search}
            onChange={e => onSearch(e.target.value)}
            className="h-9 w-full rounded-[8px] bg-white pl-8 pr-16 text-[13px] text-[#171717] shadow-sm ring-1 ring-[#e5e5e5] placeholder:text-[#a3a3a3] transition-all focus:outline-none focus:ring-1 focus:ring-amber-300/50"
          />
          <div className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
            {!loading && total > 0 && (
              <span className="text-[11px] text-[#a3a3a3] tabular-nums" title="当前筛选下的想法总数">
                {total} 条
              </span>
            )}
            {isSearching && (
              <button
                onClick={() => onSearch("")}
                className="rounded p-0.5 text-[#a3a3a3] hover:text-[#737373] transition-colors"
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 6 6 18"/><path d="m6 6 12 12"/>
                </svg>
              </button>
            )}
          </div>
        </div>

        <div className="relative shrink-0" ref={sortMenuRef}>
          <button
            onClick={() => setShowSortMenu(!showSortMenu)}
            className="flex h-9 items-center gap-1.5 rounded-[8px] bg-white px-2.5 text-[11px] font-medium text-[#737373] shadow-sm ring-1 ring-[#e5e5e5] hover:bg-[#fafafa] transition-colors"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 7h6"/><path d="M3 12h12"/><path d="M3 17h18"/>
            </svg>
            <span className="hidden sm:inline">{SORT_OPTIONS.find(o => o.value === sort)?.label}</span>
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`transition-transform ${showSortMenu ? "rotate-180" : ""}`}>
              <polyline points="6 9 12 15 18 9"/>
            </svg>
          </button>
          {showSortMenu && (
            <div className="absolute right-0 top-full mt-1.5 w-32 rounded-[8px] bg-white shadow-lg ring-1 ring-[#e5e5e5] z-10 py-1 animate-scale-in">
              {SORT_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => { onSortChange(opt.value); setShowSortMenu(false); }}
                  className={`flex w-full items-center gap-2 px-3 py-1.5 text-[12px] hover:bg-[#f5f5f5] transition-colors ${opt.value === sort ? "text-amber-600 font-medium" : "text-[#737373]"}`}
                >
                  {opt.value === sort && (
                    <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12"/>
                    </svg>
                  )}
                  <span className={opt.value === sort ? "" : "ml-4"}>{opt.label}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Compact filter bar */}
      <div className="mb-4 flex items-center gap-1.5">
        {/* Status pills: bounded set, scrolls horizontally on narrow screens */}
        <div className="flex min-w-0 flex-1 items-center gap-1.5 overflow-x-auto" style={{ scrollbarWidth: "none" }}>
        <button
          onClick={onClearStatuses}
          className={`inline-flex shrink-0 items-center rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors ${
            activeStatuses.length === 0 && !activeCollection
              ? "bg-[#171717] text-white"
              : "bg-white text-[#737373] ring-1 ring-[#e5e5e5] hover:ring-[#d4d4d4]"
          }`}
        >
          全部
        </button>
        {STATUS_CONFIG.map(s => {
          const isActive = activeStatuses.includes(s.value);
          return (
            <button
              key={s.value}
              onClick={() => onToggleStatus(s.value)}
              className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors ${
                isActive
                  ? `${s.bg} ${s.text} ring-1 ${s.ring}`
                  : "bg-white text-[#737373] ring-1 ring-[#e5e5e5] hover:ring-[#d4d4d4]"
              }`}
            >
              <span className={`h-1.5 w-1.5 rounded-full ${s.dot}`} />
              {s.label}
            </button>
          );
        })}
        </div>
        {/* Collections: unbounded user-defined list, lives in a dropdown popover */}
        {collections.length > 0 && (
          <>
            <div className="h-4 w-px shrink-0 bg-[#e5e5e5]" />
            <div className="relative shrink-0" ref={collectionMenuRef}>
              <button
                onClick={toggleCollectionMenu}
                aria-haspopup="true"
                aria-expanded={showCollectionMenu}
                className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors ${
                  activeCollection
                    ? `${getCollectionStyle(activeCollection).bg} ${getCollectionStyle(activeCollection).text} ring-1 ${getCollectionStyle(activeCollection).ring}`
                    : "bg-white text-[#737373] ring-1 ring-[#e5e5e5] hover:ring-[#d4d4d4]"
                }`}
              >
                {activeCollection ? (
                  <>
                    <span className={`h-1.5 w-1.5 rounded-full ${getCollectionStyle(activeCollection).dot}`} />
                    <span className="max-w-[120px] truncate">{activeCollection}</span>
                    <span className="text-[9px] opacity-60 tabular-nums">
                      {collections.find(c => c.name === activeCollection)?.count ?? 0}
                    </span>
                  </>
                ) : (
                  <>
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M4 20h16"/><path d="M4 4h16v12H4z"/>
                    </svg>
                    集合
                  </>
                )}
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`transition-transform ${showCollectionMenu ? "rotate-180" : ""}`}>
                  <polyline points="6 9 12 15 18 9"/>
                </svg>
              </button>
              {showCollectionMenu && (
                <div
                  className="absolute right-0 top-full z-40 mt-1.5 w-64 overflow-hidden rounded-[10px] bg-white shadow-lg ring-1 ring-[#e5e5e5] animate-scale-in"
                  onKeyDown={e => { if (e.key === "Escape") setShowCollectionMenu(false); }}
                >
                  {collectionMenuMode === "select" ? (
                    <>
                      <div className="border-b border-[#f0f0f0] p-2">
                        <div className="relative">
                          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="absolute left-2 top-1/2 -translate-y-1/2 text-[#a3a3a3]">
                            <circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>
                          </svg>
                          <input
                            autoFocus
                            value={collectionQuery}
                            onChange={e => setCollectionQuery(e.target.value)}
                            placeholder="搜索集合…"
                            className="h-7 w-full rounded-md border border-[#e5e5e5] bg-[#fafafa] pl-7 pr-2 text-[12px] text-[#171717] placeholder:text-[#a3a3a3] focus:outline-none focus:border-amber-300 focus:ring-1 focus:ring-amber-200/50"
                          />
                        </div>
                      </div>
                      <div className="max-h-60 overflow-y-auto py-1">
                        <button
                          onClick={() => { onCollectionChange(""); setShowCollectionMenu(false); }}
                          className={`flex w-full items-center gap-2 px-3 py-1.5 text-[12px] hover:bg-[#f5f5f5] transition-colors ${!activeCollection ? "font-medium text-amber-600" : "text-[#737373]"}`}
                        >
                          {!activeCollection && (
                            <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                              <polyline points="20 6 9 17 4 12"/>
                            </svg>
                          )}
                          <span className={!activeCollection ? "" : "ml-4"}>全部集合</span>
                        </button>
                        {filteredCollections.map(col => {
                          const isActive = activeCollection === col.name;
                          const c = getCollectionStyle(col.name);
                          return (
                            <button
                              key={col.name}
                              onClick={() => { onCollectionChange(isActive ? "" : col.name); setShowCollectionMenu(false); }}
                              className={`flex w-full items-center gap-2 px-3 py-1.5 text-left hover:bg-[#f5f5f5] transition-colors ${isActive ? "bg-amber-50/50" : ""}`}
                            >
                              <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${c.dot}`} />
                              <span className={`min-w-0 flex-1 truncate text-[12px] ${isActive ? "font-medium text-[#171717]" : "text-[#404040]"}`}>{col.name}</span>
                              <span className="shrink-0 text-[10px] text-[#a3a3a3] tabular-nums">{col.count}</span>
                              {isActive && (
                                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
                                  <polyline points="20 6 9 17 4 12"/>
                                </svg>
                              )}
                            </button>
                          );
                        })}
                        {filteredCollections.length === 0 && (
                          <p className="px-3 py-5 text-center text-[11px] text-[#a3a3a3]">没有匹配的集合</p>
                        )}
                      </div>
                      <div className="border-t border-[#f0f0f0] p-1">
                        <button
                          onClick={() => setCollectionMenuMode("manage")}
                          className="flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-[12px] text-[#737373] hover:bg-[#f5f5f5] transition-colors"
                        >
                          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/>
                            <circle cx="12" cy="12" r="3"/>
                          </svg>
                          管理集合
                        </button>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="flex items-center gap-1 border-b border-[#f0f0f0] px-2 py-1.5">
                        <button
                          onClick={() => { setCollectionMenuMode("select"); setRenamingCol(null); setDeletingCol(null); }}
                          className="rounded p-1 text-[#a3a3a3] hover:bg-[#f5f5f5] hover:text-[#737373] transition-colors"
                          title="返回"
                        >
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="m15 18-6-6 6-6"/>
                          </svg>
                        </button>
                        <p className="text-[11px] font-semibold text-[#737373]">管理集合</p>
                      </div>
                      <div className="max-h-60 overflow-y-auto py-1">
                        {collections.map(col => (
                          <div key={col.name} className="px-3 py-1.5 hover:bg-[#f5f5f5] transition-colors">
                            {renamingCol === col.name ? (
                              <div className="flex items-center gap-1.5">
                                <input
                                  autoFocus
                                  value={renameColVal}
                                  onChange={e => setRenameColVal(e.target.value)}
                                  onKeyDown={e => { if (e.key === "Enter") doRename(col.name, renameColVal); if (e.key === "Escape") { setRenamingCol(null); setRenameColVal(""); } }}
                                  className="h-6 flex-1 rounded-md border border-[#e5e5e5] bg-[#fafafa] px-2 text-[12px] text-[#171717] focus:outline-none focus:border-amber-300 focus:ring-1 focus:ring-amber-200/50"
                                />
                                <button onClick={() => doRename(col.name, renameColVal)} className="shrink-0 rounded-md bg-amber-500 px-2 py-0.5 text-[10px] font-medium text-white hover:bg-amber-600">确定</button>
                              </div>
                            ) : deletingCol === col.name ? (
                              <div className="flex items-center justify-between gap-2">
                                <span className="text-[11px] text-[#525252]">{col.count} 条想法将变为未分类</span>
                                <div className="flex items-center gap-1">
                                  <button onClick={() => doDelete(col.name)} className="rounded-md bg-rose-500 px-2 py-0.5 text-[10px] font-medium text-white hover:bg-rose-600">删除</button>
                                  <button onClick={() => setDeletingCol(null)} className="rounded-md px-2 py-0.5 text-[10px] font-medium text-[#737373] hover:bg-[#f5f5f5]">取消</button>
                                </div>
                              </div>
                            ) : (
                              <div className="flex items-center justify-between gap-2">
                                <div className="flex items-center gap-1.5 min-w-0">
                                  <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${getCollectionStyle(col.name).dot}`} />
                                  <span className="text-[12px] text-[#404040] truncate">{col.name}</span>
                                  <span className="text-[10px] text-[#a3a3a3] tabular-nums shrink-0">{col.count}</span>
                                </div>
                                <div className="flex items-center gap-1 shrink-0">
                                  <button onClick={() => { setRenamingCol(col.name); setRenameColVal(col.name); }} className="rounded p-1 text-[#a3a3a3] hover:text-[#737373] hover:bg-[#f5f5f5]" title="重命名">
                                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/></svg>
                                  </button>
                                  <button onClick={() => setDeletingCol(col.name)} className="rounded p-1 text-[#a3a3a3] hover:text-rose-600 hover:bg-rose-50" title="删除">
                                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* Active filters bar */}
      {hasAnyFilter && (
        <div className="mb-4 flex items-center gap-2">
          <div className="flex flex-wrap items-center gap-1.5">
            {activeStatuses.map(v => {
              const s = STATUS_CONFIG.find(c => c.value === v);
              if (!s) return null;
              return (
                <span key={v} className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ring-1 ${s.bg} ${s.text} ${s.ring}`}>
                  <span className={`h-1 w-1 rounded-full ${s.dot}`} />
                  {s.label}
                  <button onClick={() => onToggleStatus(v)} className="ml-0.5 hover:opacity-60">
                    <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M18 6 6 18"/><path d="m6 6 12 12"/>
                    </svg>
                  </button>
                </span>
              );
            })}
            {activeCollection && (
              <span className="inline-flex items-center gap-1 rounded-full bg-[#f5f5f5] px-2 py-0.5 text-[10px] font-medium text-[#737373] ring-1 ring-[#e5e5e5]">
                {activeCollection}
               <button onClick={() => onCollectionChange("")} className="ml-0.5 hover:opacity-60">
                 <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                   <path d="M18 6 6 18"/><path d="m6 6 12 12"/>
                 </svg>
                </button>
              </span>
            )}
          </div>
          <button
            onClick={onClearAll}
            className="text-[10px] font-medium text-[#a3a3a3] hover:text-[#737373] transition-colors shrink-0"
          >
            清除筛选
          </button>
        </div>
      )}
    </>
  );
}
