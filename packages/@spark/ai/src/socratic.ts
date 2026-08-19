// AI 苏格拉底 — 保存想法后生成一个有深度的追问

import { chatCompletion, type ChatResult } from "./provider";

export async function generateSocraticQuestion(
  title: string,
  content: string,
): Promise<ChatResult> {
  const systemPrompt = `你是一个思考伙伴，不是助手。你的工作是用一个问题帮用户走深一步。
规则：
1. 只问一个问题
2. 问题要直击想法的核心假设或盲区，不要泛泛而谈
3. 不要赞美用户的想法
4. 不要帮用户扩展或生成内容
5. 问题要简短，不超过两句话
6. 用与用户想法相同的语言回复`;

  const userPrompt = `想法标题：${title}
想法内容：${content || "（无额外内容）"}

请提出一个追问。`;

  return chatCompletion({
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    temperature: 0.85,
    maxTokens: 2000,
  });
}
