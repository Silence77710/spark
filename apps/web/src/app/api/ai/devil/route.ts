import { NextRequest, NextResponse } from "next/server";
import { getDb, releaseDb, IdeaRow, RowDataPacket } from "@spark/db";
import { generateDevilChallenges } from "@spark/ai";
import { generateId } from "@spark/utils";

// POST /api/ai/devil — generate devil's advocate challenges for an idea
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { idea_id, title, content } = body;

    if (!title || !title.trim()) {
      return NextResponse.json({ error: "标题不能为空" }, { status: 400 });
    }

    const { challenges, raw } = await generateDevilChallenges(title.trim(), content || "");

    // Log AI interaction
    try {
      const conn = await getDb();
      try {
        await conn.query(
          "INSERT INTO ai_interactions (id, feature, idea_id, request_summary, response_summary, tokens_used, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
          [generateId(), "devil", idea_id || null, `挑战「${title.trim().slice(0, 80)}」`, challenges.length > 0 ? `生成 ${challenges.length} 个反驳` : "未生成反驳", raw.tokensUsed, new Date()]
        );
      } finally {
        releaseDb(conn);
      }
    } catch { /* best-effort logging */ }

    return NextResponse.json({ challenges });
  } catch {
    return NextResponse.json({ challenges: [], error: "AI unavailable" }, { status: 200 });
  }
}
