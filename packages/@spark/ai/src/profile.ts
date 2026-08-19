// AI 思考风格画像 — 分析用户的思考习惯，生成风格画像

import { chatCompletion, extractJson, type ChatResult } from "./provider";

export interface ThinkingProfile {
  narrative: string;
  styleTags: string[];
  captureRhythm: string;
  topicPreference: string;
  emotionPattern: string;
  decisionStyle: string;
  connectionHabit: string;
}

export interface ProfileStats {
  totalIdeas: number;
  captureByHour: number[];
  captureByDayOfWeek: number[];
  byCollection: Record<string, number>;
  byEmotion: Record<string, number>;
  byImportance: Record<number, number>;
  byStatus: Record<string, number>;
  statusProgressRate: number;
  archivedRate: number;
  avgActivitiesPerIdea: number;
  relationshipRate: number;
  oldestIdeaDays: number;
}

export async function generateThinkingProfile(
  stats: ProfileStats,
): Promise<{ profile: ThinkingProfile | null; raw: ChatResult }> {
  const systemPrompt = `你是用户的"思考风格分析师"。你分析用户的思考习惯数据，生成一份思考风格画像。
规则：
1. 用自然语言叙述，像朋友跟你聊天
2. 生成 3-5 个风格标签（如"深夜创作者""跨领域思考者""完美主义倾向"）
3. 覆盖 5 个维度：捕获节律、主题偏好、情绪模式、决策风格、连接习惯
4. 有洞察力但不评判
5. 用中文回复
6. 返回 JSON 格式：{"narrative": "...", "styleTags": ["...", "..."], "captureRhythm": "...", "topicPreference": "...", "emotionPattern": "...", "decisionStyle": "...", "connectionHabit": "..."}`;

  const userPrompt = `以下是用户的思考习惯数据：

总想法数：${stats.totalIdeas}
使用时长：${stats.oldestIdeaDays} 天

捕获时段（0-23点）：${JSON.stringify(stats.captureByHour)}
捕获星期（0=周日-6=周六）：${JSON.stringify(stats.captureByDayOfWeek)}
按集合分布：${JSON.stringify(stats.byCollection)}
按情绪分布：${JSON.stringify(stats.byEmotion)}
按重要程度分布：${JSON.stringify(stats.byImportance)}
按状态分布：${JSON.stringify(stats.byStatus)}
状态前进率：${(stats.statusProgressRate * 100).toFixed(1)}%
归档率：${(stats.archivedRate * 100).toFixed(1)}%
平均每条想法活动数：${stats.avgActivitiesPerIdea.toFixed(1)}
想法关联率：${(stats.relationshipRate * 100).toFixed(1)}%

请生成思考风格画像。`;

  const result = await chatCompletion({
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    temperature: 0.85,
    maxTokens: 8000,
  });

  const parsed = extractJson<ThinkingProfile>(result.content);
  return { profile: parsed, raw: result };
}
