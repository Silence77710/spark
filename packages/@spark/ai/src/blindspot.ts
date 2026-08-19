// AI 思维盲区地图 — 检测用户从未探索的领域/视角

import { chatCompletion, extractJson, type ChatResult } from "./provider";

export interface BlindSpotResult {
  topicBlindSpots: string[];
  perspectiveBlindSpots: string[];
  emotionBlindSpots: string[];
  promptSuggestions: string[];
  exploredDomains: string[];
}

export interface IdeaSummary {
  title: string;
  collection: string | null;
  emotion: string | null;
  status: string;
  importance: number;
}

export async function detectBlindSpots(
  ideas: IdeaSummary[],
): Promise<{ result: BlindSpotResult | null; raw: ChatResult }> {
  const systemPrompt = `你是"思维盲区探测器"。你分析用户的所有想法，找出用户从未或极少触及的思考维度。
规则：
1. 分析主题盲区（用户从未写过的主题领域）
2. 分析视角盲区（用户从未采用过的思考角度）
3. 分析情绪盲区（用户从未伴随的情绪）
4. 生成 3 个"探索盲区"的建议提示词
5. 列出已探索的领域
6. 用中文回复
7. 返回 JSON 格式：{"topicBlindSpots": ["..."], "perspectiveBlindSpots": ["..."], "emotionBlindSpots": ["..."], "promptSuggestions": ["..."], "exploredDomains": ["..."]}`;

  const summary = ideas.map(i => ({
    title: i.title,
    collection: i.collection || "未分类",
    emotion: i.emotion || "无",
    status: i.status,
  }));

  const userPrompt = `以下是用户的所有想法摘要（${ideas.length} 条）：

${JSON.stringify(summary, null, 2)}

请分析用户的思维盲区。`;

  const result = await chatCompletion({
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    temperature: 0.85,
    maxTokens: 8000,
  });

  const parsed = extractJson<BlindSpotResult>(result.content);
  return { result: parsed, raw: result };
}
