// AI 回望对话 — 胶囊解锁后与了解完整上下文的 AI 对话回望

import { chatCompletion, type ChatMessage } from "./provider";

export interface RetroContext {
  title: string;
  content: string;
  createdAt: string;
  unlockAt: string;
  activities: Array<{ type: string; content: string; createdAt: string }>;
}

export interface RetroResult {
  reply: string;
  tokensUsed: number | null;
}

export async function startRetroDialogue(ctx: RetroContext): Promise<RetroResult> {
  const systemPrompt = `你是一个思考伙伴。用户在 ${ctx.createdAt} 写下了一个想法并密封为时间胶囊，现在 (${ctx.unlockAt}) 解锁了。你的工作是引导用户回望过去的自己。
规则：
1. 用提问引导用户反思，如"你当时说的是 X，现在怎么看？"
2. 不要替用户写反思总结
3. 基于用户的完整上下文（原始内容 + 中间活动）
4. 每次只问一个问题，保持对话感
5. 用与用户想法相同的语言回复
6. 语气温暖但不煽情，像一个老朋友`;

  const activitySummary = ctx.activities.length > 0
    ? ctx.activities.slice(0, 10).map(a => `[${a.type}] ${a.content}`).join("\n")
    : "（无中间活动记录）";

  const userPrompt = `想法标题：${ctx.title}
想法内容：${ctx.content || "（无额外内容）"}
捕获时间：${ctx.createdAt}
解锁时间：${ctx.unlockAt}

中间活动记录：
${activitySummary}

请开始回望对话。`;

  const result = await chatCompletion({
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    temperature: 0.85,
    maxTokens: 4000,
  });

  return { reply: result.content, tokensUsed: result.tokensUsed };
}

export async function continueRetroDialogue(
  ctx: RetroContext,
  history: ChatMessage[],
): Promise<RetroResult> {
  const systemPrompt = `你是一个思考伙伴。用户在 ${ctx.createdAt} 写下了一个想法并密封为时间胶囊，现在解锁了。继续回望对话。
规则：
1. 用提问引导用户反思
2. 不要替用户写反思总结
3. 基于用户的完整上下文和之前的对话
4. 每次只问一个问题
5. 用与用户相同的语言回复
6. 如果用户说"结束"或"好了"，用一句温暖的话收尾`;

  const activitySummary = ctx.activities.length > 0
    ? ctx.activities.slice(0, 10).map(a => `[${a.type}] ${a.content}`).join("\n")
    : "（无中间活动记录）";

  const contextMsg: ChatMessage = {
    role: "user",
    content: `【背景信息】
想法标题：${ctx.title}
想法内容：${ctx.content || "（无额外内容）"}
捕获时间：${ctx.createdAt}
解锁时间：${ctx.unlockAt}
中间活动记录：
${activitySummary}

【对话开始】`,
  };

  const result = await chatCompletion({
    messages: [
      { role: "system", content: systemPrompt },
      contextMsg,
      ...history,
    ],
    temperature: 0.85,
    maxTokens: 4000,
  });

  return { reply: result.content, tokensUsed: result.tokensUsed };
}
