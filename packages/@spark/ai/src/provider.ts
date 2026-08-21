// AI Provider — OpenAI-compatible chat completions client
// Designed to work with any OpenAI-compatible endpoint (OpenAI, tokens.store, local models, etc.)

const DEFAULT_BASE_URL = "https://tokens.store/v1";
// 带日期的快照别名（deepseek-v4-flash-0731）在中转站已下架渠道，默认用滚动别名
const DEFAULT_MODEL = "deepseek-v4-flash";

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

// 进程内串行队列：上游（tokens.store）对并发请求限流返回 429，
// 同一时刻只允许一个请求打到上游，其余排队等待。
// 挂在 globalThis 上：Next.js 会为每个 route 打包独立模块实例，需跨实例共享
const g = globalThis as { __sparkAiQueue?: Promise<unknown> };
g.__sparkAiQueue ??= Promise.resolve();
function enqueue<T>(fn: () => Promise<T>): Promise<T> {
  const run = g.__sparkAiQueue!.then(fn, fn);
  g.__sparkAiQueue = run.catch(() => {});
  return run;
}

export function getAiConfig() {
  const apiKey = process.env.AI_API_KEY;
  if (!apiKey) {
    throw new Error("AI_API_KEY 未配置：请在 apps/web/.env.local 中设置（参考 .env.example）");
  }
  return {
    baseUrl: process.env.AI_BASE_URL ?? DEFAULT_BASE_URL,
    apiKey,
    model: process.env.AI_MODEL ?? DEFAULT_MODEL,
  };
}

export async function chatCompletion(opts: ChatOptions): Promise<ChatResult> {
  const { baseUrl, apiKey, model } = getAiConfig();
  return enqueue(() => requestWithRetry(baseUrl, apiKey, model, opts));
}

async function requestWithRetry(
  baseUrl: string,
  apiKey: string,
  model: string,
  opts: ChatOptions,
): Promise<ChatResult> {
  // 上游偶发限流/超时，对网络错误与 429/5xx 重试最多 2 次
  // 429 的限流窗口较长，退避 5s、15s（优先尊重 Retry-After 头）；其余 1s、3s
  const MAX_ATTEMPTS = 3;
  let resp: Response | null = null;
  let lastError: unknown = null;
  let lastStatus = 0;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      resp = await fetch(`${baseUrl}/chat/completions`, {
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
      if (resp.ok || (resp.status !== 429 && resp.status < 500)) break;
      lastStatus = resp.status;
      lastError = new Error(`AI API error ${resp.status}`);
      resp = null;
    } catch (err) {
      lastStatus = 0;
      lastError = err;
      resp = null;
    }
    if (attempt < MAX_ATTEMPTS) {
      const fallbackMs = lastStatus === 429
        ? (attempt === 1 ? 5000 : 15000)
        : (attempt === 1 ? 1000 : 3000);
      await new Promise(r => setTimeout(r, fallbackMs));
    }
  }

  if (!resp) {
    throw lastError instanceof Error ? lastError : new Error(String(lastError));
  }

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
