// AI 全方位分析 — 从五个维度解剖一个想法，每个维度 = 镜子式分析 + 苏格拉底式追问
// 红线约束：不替用户做决定、不替用户生成内容，分析负责照亮，追问把思考推回给用户

import { chatCompletion, extractJson } from "./provider";

export interface AnalysisDimension {
  key: string;
  title: string;
  analysis: string;
  question: string;
}

export interface AnalysisResult {
  dimensions: AnalysisDimension[];
  tokensUsed: number | null;
}

export interface AnalyzeIdeaInput {
  title: string;
  content: string;
  status?: string;
  importanceLabel?: string;
  createdAt?: string;
}

const SYSTEM_PROMPT = `你是一位思考伙伴，擅长解剖一个想法的结构。你的工作不是替用户做决定，而是照出想法的不同侧面，把最后一步思考留给用户。

针对用户给出的想法，从以下 5 个维度逐一分析：
1. assumptions（核心假设）：这个想法要成立，依赖哪些前提？指出 2-3 个，并点出其中最脆弱、最没被验证的一个。
2. problem_fit（问题与对象）：它解决谁的问题？这个痛点真实存在、足够痛吗？还是只是一个没有锚点的点子？
3. timing（时机）：为什么是现在？哪些条件已经成熟，哪些还不成熟？
4. next_step（最小下一步）：48 小时内能做的最低成本验证动作是什么？指出方向和动作形态，具体执行由用户自己写。
5. growth（生长方向）：这个想法能长成什么？给出更大版、更小版、或换领域的变体可能。

规则：
1. 每个维度的 analysis 不超过 3 句话，直接、具体，不泛泛而谈
2. 每个维度的 question 是一句追问，把思考推回给用户，不超过两句话
3. 不赞美想法，不替用户做决定，不替用户写想法内容
4. 用与想法相同的语言回复
5. 只输出 JSON，不要输出任何其他内容

输出格式（JSON 数组，5 个元素，顺序固定）：
[{"key":"assumptions","title":"核心假设","analysis":"...","question":"..."},{"key":"problem_fit","title":"问题与对象","analysis":"...","question":"..."},{"key":"timing","title":"时机","analysis":"...","question":"..."},{"key":"next_step","title":"最小下一步","analysis":"...","question":"..."},{"key":"growth","title":"生长方向","analysis":"...","question":"..."}]`;

export async function analyzeIdea(input: AnalyzeIdeaInput): Promise<AnalysisResult> {
  const contextLines = [
    `想法标题：${input.title}`,
    `想法内容：${input.content || "（无额外内容）"}`,
  ];
  if (input.status) contextLines.push(`当前状态：${input.status}`);
  if (input.importanceLabel) contextLines.push(`重要程度：${input.importanceLabel}`);
  if (input.createdAt) contextLines.push(`创建时间：${input.createdAt}`);

  const result = await chatCompletion({
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: contextLines.join("\n") + "\n\n请按 JSON 格式输出五维分析。" },
    ],
    temperature: 0.7,
    maxTokens: 4000,
  });

  const parsed = extractJson<AnalysisDimension[]>(result.content);
  const dimensions = Array.isArray(parsed)
    ? parsed.filter(
        (d): d is AnalysisDimension =>
          !!d && typeof d.key === "string" && typeof d.title === "string" &&
          typeof d.analysis === "string" && typeof d.question === "string" &&
          d.analysis.trim().length > 0,
      )
    : [];

  if (dimensions.length === 0) {
    throw new Error("AI 返回的分析结果无法解析");
  }

  return { dimensions, tokensUsed: result.tokensUsed };
}
