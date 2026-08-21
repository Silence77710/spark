import { NextRequest, NextResponse } from "next/server";
import { getDb, releaseDb, RowDataPacket } from "@spark/db";
import { analyzeIdea } from "@spark/ai";
import { generateId } from "@spark/utils";

// POST /api/ai/analyze — 全方位分析一个想法（五维度：镜子式分析 + 追问）
// 只生成不入库：是否保存由用户在前端确认后调 /api/ideas/[id]/analyses
export async function POST(request: NextRequest) {
  const body = await request.json();
  const { idea_id, title, content, status, importance_label, created_at } = body;

  if (!title || !title.trim()) {
    return NextResponse.json({ error: "标题不能为空" }, { status: 400 });
  }

  try {
    const { dimensions, tokensUsed } = await analyzeIdea({
      title: title.trim(),
      content: content || "",
      status,
      importanceLabel: importance_label,
      createdAt: created_at,
    });
    const model = process.env.AI_MODEL ?? null;

    // 记录 AI 交互日志（best-effort，失败不影响主流程）
    try {
      const conn = await getDb();
      try {
        await conn.query(
          "INSERT INTO ai_interactions (id, feature, idea_id, request_summary, response_summary, tokens_used, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
          [
            generateId(),
            "analyzer",
            idea_id || null,
            `全方位分析「${title.trim().slice(0, 80)}」`,
            `${dimensions.length} 个维度`,
            tokensUsed,
            new Date(),
          ],
        );
      } finally {
        releaseDb(conn);
      }
    } catch {
      // Logging is best-effort
    }

    return NextResponse.json({ analysis: { dimensions, model } });
  } catch (err) {
    // 静默降级——前端跳过，不报错
    console.error("[ai/analyze] request failed:", err);
    return NextResponse.json({ analysis: null, error: "AI unavailable" }, { status: 200 });
  }
}
