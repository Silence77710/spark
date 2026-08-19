// AI 连接器 — 发现想法之间用户没注意到的连接

import { chatCompletion, extractJson } from "./provider";

export interface ConnectionPair {
  sourceId: string;
  sourceTitle: string;
  targetId: string;
  targetTitle: string;
  explanation: string;
}

export interface ConnectionResult {
  pairs: ConnectionPair[];
  tokensUsed: number | null;
}

interface IdeaBrief {
  id: string;
  title: string;
  content: string;
}

export async function discoverConnections(
  ideas: IdeaBrief[],
  existingPairs: Array<{ sourceId: string; targetId: string }> = [],
): Promise<ConnectionResult> {
  if (ideas.length < 5) {
    return { pairs: [], tokensUsed: null };
  }

  const systemPrompt = `你是一个思考伙伴。你的工作是发现用户没想到的想法之间的连接。
规则：
1. 找出 1-3 对看似不相关但底层可能有连接的想法
2. 每对附一句话解释为什么它们可能有关联
3. 不要选主题完全相同的想法对（那太明显了）
4. 不要选用户已经关联过的想法对
5. 严格用 JSON 格式回复，不要其他文字
6. 用与用户想法相同的语言回复

JSON 格式：
{"pairs":[{"sourceId":"...","targetId":"...","explanation":"..."}]}`;

  const ideaList = ideas.map(i => {
    const content = i.content ? ` — ${i.content.slice(0, 200)}` : "";
    return `${i.id}: ${i.title}${content}`;
  }).join("\n");

  const existingList = existingPairs.length > 0
    ? `\n\n已有关联（不要重复推荐）：\n${existingPairs.map(p => `${p.sourceId} <-> ${p.targetId}`).join("\n")}`
    : "";

  const userPrompt = `以下是我的想法列表：\n${ideaList}${existingList}\n\n请找出 1-3 对我可能没注意到的连接。`;

  const result = await chatCompletion({
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    temperature: 0.7,
    maxTokens: 8000,
  });

  const parsed = extractJson<{ pairs?: Array<{ sourceId: string; targetId: string; explanation?: string }> }>(result.content);
  if (!parsed || !parsed.pairs) {
    return { pairs: [], tokensUsed: result.tokensUsed };
  }
  const pairs: ConnectionPair[] = parsed.pairs.map((p: any) => ({
      sourceId: p.sourceId,
      sourceTitle: ideas.find(i => i.id === p.sourceId)?.title || "",
      targetId: p.targetId,
      targetTitle: ideas.find(i => i.id === p.targetId)?.title || "",
      explanation: p.explanation || "",
    })).filter((p: ConnectionPair) => p.sourceId && p.targetId && p.sourceTitle && p.targetTitle);
    return { pairs, tokensUsed: result.tokensUsed };
  
}
