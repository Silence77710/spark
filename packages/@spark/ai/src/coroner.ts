// AI 想法验尸官 — 分析被放弃的想法，找出放弃模式

import { chatCompletion, extractJson, type ChatResult } from "./provider";

export interface CoronerReport {
  patterns: string[];
  categoryBreakdown: Record<string, number>;
  avgLifespan: string;
  narrative: string;
  recommendation: string;
}

export interface DeceasedIdea {
  title: string;
  epitaph: string | null;
  status: string;
  createdAt: string;
  archivedAt: string;
  importance: number;
  collection: string | null;
  lifespanDays: number;
}

export async function generateCoronerReport(
  ideas: DeceasedIdea[],
): Promise<{ report: CoronerReport | null; raw: ChatResult }> {
  const systemPrompt = `你是"想法验尸官"。你分析被放弃（归档/休眠）的想法，找出放弃模式。
规则：
1. 分析放弃原因分类（兴趣转移/难度过大/时机不对/被替代）
2. 计算存活时长分布
3. 找出共性特征
4. 用叙事性语言描述发现
5. 给出改善未来决策的建议
6. 用中文回复
7. 返回 JSON 格式：{"patterns": ["..."], "categoryBreakdown": {"兴趣转移": N, ...}, "avgLifespan": "...天", "narrative": "...", "recommendation": "..."}`;

  const summary = ideas.map(i => ({
    title: i.title,
    epitaph: i.epitaph || "（无墓志铭）",
    importance: i.importance,
    collection: i.collection || "未分类",
    lifespanDays: i.lifespanDays,
  }));

  const userPrompt = `以下是 ${ideas.length} 条被放弃的想法：

${JSON.stringify(summary, null, 2)}

请生成验尸报告。`;

  const result = await chatCompletion({
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    temperature: 0.85,
    maxTokens: 8000,
  });

  const parsed = extractJson<CoronerReport>(result.content);
  return { report: parsed, raw: result };
}
