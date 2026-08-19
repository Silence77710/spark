// AI 反方辩手 — 站在想法对立面提出挑战

import { chatCompletion, extractJson, type ChatResult } from "./provider";

export interface DevilChallenge {
  angle: string;
  challenge: string;
}

export async function generateDevilChallenges(
  title: string,
  content: string,
): Promise<{ challenges: DevilChallenge[]; raw: ChatResult }> {
  const systemPrompt = `你是一个"反方辩手"。你的工作是对用户的想法提出挑战和反驳，帮助用户强化思考的严密性。
规则：
1. 生成 2-3 个反驳角度，每个角度一个简短标题和一句挑战
2. 不要否定用户的想法，只提出可探索的反面视角
3. 挑战要具体，直击假设或盲区
4. 用与用户想法相同的语言回复
5. 返回 JSON 格式：{"challenges": [{"angle": "...", "challenge": "..."}]}`;

  const userPrompt = `想法标题：${title}
想法内容：${content || "（无额外内容）"}

请提出反驳挑战。`;

  const result = await chatCompletion({
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    temperature: 0.85,
    maxTokens: 4000,
  });

  const parsed = extractJson<{ challenges: DevilChallenge[] }>(result.content);
  return {
    challenges: parsed?.challenges ?? [],
    raw: result,
  };
}
