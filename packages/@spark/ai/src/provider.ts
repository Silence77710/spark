// AI Provider — OpenAI-compatible chat completions client
// Designed to work with any OpenAI-compatible endpoint (OpenAI, tokens.store, local models, etc.)

const DEFAULT_BASE_URL = "https://tokens.store/v1";
const DEFAULT_MODEL = "deepseek-v4-flash-0731";

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface ChatOptions {
  messages: ChatMessage[];
  model?: string;
  temperature?: number;
  maxTokens?: number;
}

export interface ChatResult {
  content: string;
  tokensUsed: number | null;
}

export function getAiConfig() {
  return {
    baseUrl: process.env.AI_BASE_URL ?? DEFAULT_BASE_URL,
    apiKey: process.env.AI_API_KEY ?? "ek-xxx",
    model: process.env.AI_MODEL ?? DEFAULT_MODEL,
  };
}

export async function chatCompletion(opts: ChatOptions): Promise<ChatResult> {
  const { baseUrl, apiKey, model } = getAiConfig();

  const resp = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: opts.model ?? model,
      messages: opts.messages,
      temperature: opts.temperature ?? 0.8,
      max_tokens: opts.maxTokens ?? 4000,
    }),
  });

  if (!resp.ok) {
    const text = await resp.text().catch(() => "");
    throw new Error(`AI API error ${resp.status}: ${text}`);
  }

  const data = await resp.json();
  const content = data.choices?.[0]?.message?.content ?? "";
  const tokensUsed = data.usage?.total_tokens ?? null;

  return { content, tokensUsed };
}

/** Strip markdown code fences and extract JSON from AI responses. */
export function extractJson<T = any>(raw: string): T | null {
  if (!raw || typeof raw !== "string") return null;
  let s = raw.trim();

  // Strip ```json ... ``` or ``` ... ``` fences
  const fenceMatch = s.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  if (fenceMatch) {
    s = fenceMatch[1].trim();
  }

  // Try direct parse first
  try {
    return JSON.parse(s) as T;
  } catch {
    // fall through
  }

  // Extract first {...} or [...] block from text
  const objMatch = s.match(/\{[\s\S]*\}/);
  if (objMatch) {
    try {
      return JSON.parse(objMatch[0]) as T;
    } catch {
      // fall through
    }
  }

  const arrMatch = s.match(/\[[\s\S]*\]/);
  if (arrMatch) {
    try {
      return JSON.parse(arrMatch[0]) as T;
    } catch {
      // fall through
    }
  }

  return null;
}
