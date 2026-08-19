// 想法杂交台 — AI 挑选两个看似不相关但底层结构相似的想法催化碰撞

import { chatCompletion, extractJson } from "./provider";

export interface CatalystPair {
  ideaA: {
    id: string;
    title: string;
    content: string;
    collection: string;
  };
  ideaB: {
    id: string;
    title: string;
    content: string;
    collection: string;
  };
  catalyst: string;
}

export interface CatalystResult {
  pair: CatalystPair | null;
  tokensUsed: number | null;
}

interface IdeaBrief {
  id: string;
  title: string;
  content: string;
  collection: string | null;
}

export async function pickHybridPair(ideas: IdeaBrief[]): Promise<CatalystResult> {
  if (ideas.length < 4) {
    return { pair: null, tokensUsed: null };
  }

  const systemPrompt = `你是一个思考伙伴。你的工作是挑选两个看似不相关但底层结构相似的想法放在一起催化碰撞。
规则：
1. 两个想法必须来自不同集合（collection）或不同主题领域
2. 选择标准：语义不相似但底层结构相似（比如解决相似的问题、有相似的架构）
3. 附一句话说明为什么这两个想法可能碰撞出新东西
4. 不要选主题完全相同的想法
5. 严格用 JSON 格式回复，不要其他文字
6. 用与用户想法相同的语言回复

JSON 格式：
{"ideaAId":"...","ideaBId":"...","catalyst":"..."}`;

  const ideaList = ideas.map(i => {
    const collection = i.collection ? ` [${i.collection}]` : " [未分类]";
    const content = i.content ? ` — ${i.content.slice(0, 150)}` : "";
    return `${i.id}${collection}: ${i.title}${content}`;
  }).join("\n");

  const userPrompt = `以下是我的想法列表：\n${ideaList}\n\n请挑选两个来自不同领域的想法进行杂交。`;

  const result = await chatCompletion({
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    temperature: 0.9,
    maxTokens: 8000,
  });

  const parsed = extractJson<{ ideaAId?: string; ideaBId?: string; catalyst?: string }>(result.content);
  if (!parsed) {
    return { pair: null, tokensUsed: result.tokensUsed };
  }
  const ideaA = ideas.find(i => i.id === parsed.ideaAId);
    const ideaB = ideas.find(i => i.id === parsed.ideaBId);
    if (!ideaA || !ideaB || ideaA.id === ideaB.id) {
      return { pair: null, tokensUsed: result.tokensUsed };
    }
    return {
      pair: {
        ideaA: {
          id: ideaA.id,
          title: ideaA.title,
          content: ideaA.content.slice(0, 200),
          collection: ideaA.collection || "未分类",
        },
        ideaB: {
          id: ideaB.id,
          title: ideaB.title,
          content: ideaB.content.slice(0, 200),
          collection: ideaB.collection || "未分类",
        },
        catalyst: parsed.catalyst || "",
      },
      tokensUsed: result.tokensUsed,
    };
}
