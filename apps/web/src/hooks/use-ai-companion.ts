"use client";

import { useState } from "react";
import type { CatalystPair, ConnectionPair } from "@/lib/types";

// AI 思考伙伴（苏格拉底追问 / 发现连接 / 想法杂交台）的状态与动作。
// 上游 AI 接口失败一律静默降级，不影响列表主流程。
export function pairKey(p: ConnectionPair) { return `${p.sourceId}:${p.targetId}`; }

interface AiCompanionOptions {
  enabled: boolean;
  features: Record<string, boolean>;
  // 杂交台碰撞生成新想法后，通知调用方刷新列表等数据
  onIdeasChanged: () => void;
}

export function useAiCompanion({ enabled, features, onIdeasChanged }: AiCompanionOptions) {
  const [socratic, setSocratic] = useState<{ ideaId: string; question: string | null; loading: boolean } | null>(null);
  const [socraticAnswer, setSocraticAnswer] = useState("");
  const [socraticSaving, setSocraticSaving] = useState(false);

  const [connectOpen, setConnectOpen] = useState(false);
  const [connectLoading, setConnectLoading] = useState(false);
  const [connectPairs, setConnectPairs] = useState<ConnectionPair[]>([]);
  const [connectMessage, setConnectMessage] = useState("");
  const [confirmingKey, setConfirmingKey] = useState<string | null>(null);

  const [catalystOpen, setCatalystOpen] = useState(false);
  const [catalystLoading, setCatalystLoading] = useState(false);
  const [catalystPair, setCatalystPair] = useState<CatalystPair | null>(null);
  const [catalystMessage, setCatalystMessage] = useState("");
  const [hybridTitle, setHybridTitle] = useState("");
  const [hybridSaving, setHybridSaving] = useState(false);

  // 保存成功后追问一个深问题（AI 开启时；失败静默降级）
  const askSocratic = async (ideaId: string, t: string, c: string) => {
    if (!enabled || features.socratic === false) return;
    setSocratic({ ideaId, question: null, loading: true });
    setSocraticAnswer("");
    try {
      const r = await fetch("/api/ai/socratic", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idea_id: ideaId, title: t, content: c }),
      });
      const d = await r.json().catch(() => null);
      if (d?.question) {
        setSocratic({ ideaId, question: d.question, loading: false });
      } else {
        setSocratic(null); // 静默降级：没有问题就不打扰
      }
    } catch {
      setSocratic(null);
    }
  };

  const answerSocratic = async () => {
    if (!socratic?.question || !socraticAnswer.trim()) return;
    setSocraticSaving(true);
    await fetch(`/api/ideas/${socratic.ideaId}/activities`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "note", content: `苏格拉底追问回答：${socraticAnswer.trim()}\n追问：${socratic.question}` }),
    }).catch(() => {});
    setSocraticSaving(false);
    setSocratic(null);
  };

  const runConnect = async () => {
    setConnectOpen(true); setCatalystOpen(false);
    setConnectLoading(true); setConnectMessage("");
    try {
      const r = await fetch("/api/ai/connect", { method: "POST" });
      const d = await r.json().catch(() => null);
      const pairs: ConnectionPair[] = d?.pairs ?? [];
      setConnectPairs(pairs);
      if (pairs.length === 0) {
        setConnectMessage(d?.message ?? (d?.error ? "AI 暂时不可用，请稍后再试" : "这次没有发现新的连接"));
      }
    } catch {
      setConnectMessage("AI 暂时不可用，请稍后再试");
    }
    setConnectLoading(false);
  };

  const confirmPair = async (p: ConnectionPair) => {
    setConfirmingKey(pairKey(p));
    await fetch("/api/relationships", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ source_id: p.sourceId, target_id: p.targetId, type: "related", created_by: "ai", ai_explanation: p.explanation }),
    }).catch(() => {});
    // 409（关联已存在）同样视为处理完成，直接从列表移除
    setConnectPairs(prev => prev.filter(x => pairKey(x) !== pairKey(p)));
    setConfirmingKey(null);
  };

  const ignorePair = (p: ConnectionPair) => {
    setConnectPairs(prev => prev.filter(x => pairKey(x) !== pairKey(p)));
  };

  const runCatalyst = async () => {
    setCatalystOpen(true); setConnectOpen(false);
    setCatalystLoading(true); setCatalystMessage(""); setHybridTitle("");
    try {
      const r = await fetch("/api/ai/catalyst", { method: "POST" });
      const d = await r.json().catch(() => null);
      setCatalystPair(d?.pair ?? null);
      if (!d?.pair) setCatalystMessage(d?.message ?? "AI 暂时不可用，请稍后再试");
    } catch {
      setCatalystPair(null);
      setCatalystMessage("AI 暂时不可用，请稍后再试");
    }
    setCatalystLoading(false);
  };

  const collide = async () => {
    if (!catalystPair || !hybridTitle.trim()) return;
    setHybridSaving(true);
    const content = [
      catalystPair.catalyst ? `AI 催化提示：${catalystPair.catalyst}` : "",
      `由「${catalystPair.ideaA.title}」×「${catalystPair.ideaB.title}」碰撞生成`,
    ].filter(Boolean).join("\n\n");
    const r = await fetch("/api/ideas", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: hybridTitle.trim(),
        content,
        parent_a_id: catalystPair.ideaA.id,
        parent_b_id: catalystPair.ideaB.id,
      }),
    }).catch(() => null);
    setHybridSaving(false);
    if (r?.ok) {
      setCatalystOpen(false); setCatalystPair(null); setHybridTitle("");
      onIdeasChanged();
    }
  };

  return {
    socratic, socraticAnswer, socraticSaving,
    setSocraticAnswer, askSocratic, answerSocratic, dismissSocratic: () => setSocratic(null),
    connectOpen, connectLoading, connectPairs, connectMessage, confirmingKey,
    runConnect, confirmPair, ignorePair, closeConnect: () => setConnectOpen(false),
    catalystOpen, catalystLoading, catalystPair, catalystMessage, hybridTitle, hybridSaving,
    setHybridTitle, runCatalyst, collide,
    closeCatalyst: () => { setCatalystOpen(false); setCatalystPair(null); },
  };
}

export type AiCompanion = ReturnType<typeof useAiCompanion>;
