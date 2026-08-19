// AI 思考镜子 — 用元数据生成关于思考模式的叙事性洞察

import { chatCompletion, extractJson, type ChatResult } from "./provider";

export interface MirrorInsight {
  insight: string;
  suggestion: string;
}

export interface MirrorStats {
  totalIdeas: number;
  byImportance: Record<number, number>;
  byStatus: Record<string, number>;
  byEmotion: Record<string, number>;
  byCollection: Record<string, number>;
  statusProgressRate: number;
  avgActivitiesPerIdea: number;
  captureByHour: number[];
  captureByDayOfWeek: number[];
  oldestIdeaDays: number;
  archivedRate: number;
}

export async function generateMirrorInsights(
  stats: MirrorStats,
): Promise<{ insights: MirrorInsight[]; raw: ChatResult }> {
  const systemPrompt = `你是用户的"思考镜子"。你用用户自己的数据生成关于思考模式的洞察。
规则：
1. 生成 3-5 条叙事性洞察，用自然语言叙述，不堆砌数字
2. 每条洞察附一个可操作建议
3. 像朋友跟你聊天一样，温和但有洞察力
4. 发现用户没意识到的行为模式
5. 不评判，只观察和建议
6. 用中文回复
7. 返回 JSON 格式：{"insights": [{"insight": "...", "suggestion": "..."}]}`;

  const userPrompt = `以下是用户的想法元数据统计：

总想法数：${stats.totalIdeas}
使用时长：${stats.oldestIdeaDays} 天

按重要程度分布：${JSON.stringify(stats.byImportance)}
按状态分布：${JSON.stringify(stats.byStatus)}
按情绪分布：${JSON.stringify(stats.byEmotion)}
按集合分布：${JSON.stringify(stats.byCollection)}
状态前进率（走出种子状态的比例）：${(stats.statusProgressRate * 100).toFixed(1)}%
平均每条想法的活动数：${stats.avgActivitiesPerIdea.toFixed(1)}
归档率：${(stats.archivedRate * 100).toFixed(1)}%
捕获时段分布（0-23点）：${JSON.stringify(stats.captureByHour)}
捕获星期分布（0=周日-6=周六）：${JSON.stringify(stats.captureByDayOfWeek)}

请生成 3-5 条叙事性洞察。`;

  const result = await chatCompletion({
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    temperature: 0.85,
    maxTokens: 8000,
  });

  const parsed = extractJson<{ insights: MirrorInsight[] }>(result.content);
  return {
    insights: parsed?.insights ?? [],
    raw: result,
  };
}
