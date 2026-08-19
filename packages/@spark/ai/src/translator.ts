// AI 跨界翻译 — 把一个领域的想法翻译到另一个领域

import { chatCompletion, extractJson, type ChatResult } from "./provider";

export interface CrossDomainResult {
  perspective: string;
  questions: string[];
  targetDomain: string;
}

export async function translateCrossDomain(
  title: string,
  content: string,
  currentCollection: string | null,
): Promise<{ result: CrossDomainResult | null; raw: ChatResult }> {
  const systemPrompt = `你是一个"跨界翻译师"。你把一个领域的想法翻译到另一个领域，激发跨界灵感。
规则：
1. 选择一个与当前领域不同的领域作为目标
2. 用目标领域的视角重新解读这个想法
3. 生成 3 个跨界启发问题
4. 打破领域壁垒，催化交叉学科思维
5. 用与用户想法相同的语言回复
6. 返回 JSON 格式：{"targetDomain": "...", "perspective": "...", "questions": ["...", "...", "..."]}`;

  const userPrompt = `想法标题：${title}
想法内容：${content || "（无额外内容）"}
当前所属领域：${currentCollection || "未分类"}

请选择一个不同的领域进行跨界翻译。`;

  const result = await chatCompletion({
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    temperature: 0.9,
    maxTokens: 6000,
  });

  const parsed = extractJson<CrossDomainResult>(result.content);
  return { result: parsed, raw: result };
}
