import { NextRequest, NextResponse } from "next/server";
import { getDb, releaseDb, IdeaRow, RowDataPacket } from "@spark/db";
import { translateCrossDomain } from "@spark/ai";
import { generateId } from "@spark/utils";

// POST /api/ai/translate — cross-domain translation of an idea
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { idea_id } = body;

    if (!idea_id) {
      return NextResponse.json({ error: "缺少 idea_id" }, { status: 400 });
    }

    const conn = await getDb();
    let idea: IdeaRow | null = null;
    try {
      const [rows] = await conn.query<IdeaRow[] & RowDataPacket[]>(
        "SELECT * FROM ideas WHERE id = ?", [idea_id]
      );
      idea = rows[0] || null;
    } finally {
      releaseDb(conn);
    }

    if (!idea) {
      return NextResponse.json({ error: "想法不存在" }, { status: 404 });
    }

    const { result, raw } = await translateCrossDomain(idea.title, idea.content || "", idea.collection);

    // Log AI interaction
    try {
      const conn2 = await getDb();
      try {
        await conn2.query(
          "INSERT INTO ai_interactions (id, feature, idea_id, request_summary, response_summary, tokens_used, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
          [generateId(), "translate", idea_id, `跨界翻译「${idea.title.slice(0, 80)}」`, result ? `翻译到${result.targetDomain}` : "未生成", raw.tokensUsed, new Date()]
        );
      } finally {
        releaseDb(conn2);
      }
    } catch { /* best-effort logging */ }

    return NextResponse.json({ result });
  } catch (err) {
    console.error("[ai/translate] request failed:", err);
    return NextResponse.json({ result: null, error: "AI unavailable" }, { status: 200 });
  }
}
