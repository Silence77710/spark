import { NextRequest, NextResponse } from "next/server";
import { getDb, releaseDb, AiInteractionRow, IdeaRow, RowDataPacket } from "@spark/db";
import { pickHybridPair } from "@spark/ai";
import { generateId } from "@spark/utils";

// POST /api/ai/catalyst — pick two ideas from different domains for hybrid
export async function POST(_request: NextRequest) {
  try {
    const conn = await getDb();
    try {
      const [ideas] = await conn.query<IdeaRow[] & RowDataPacket[]>(
        "SELECT id, title, content, collection FROM ideas WHERE status NOT IN ('archived', 'dormant') ORDER BY created_at DESC LIMIT 50"
      );

      if (ideas.length < 4) {
        return NextResponse.json({ pair: null, message: "想法还不够多，多写几条再来杂交" });
      }

      const ideaBriefs = ideas.map(i => ({
        id: i.id,
        title: i.title,
        content: i.content || "",
        collection: i.collection,
      }));

      const { pair, tokensUsed } = await pickHybridPair(ideaBriefs);

      // Log AI interaction
      try {
        await conn.query(
          "INSERT INTO ai_interactions (id, feature, idea_id, request_summary, response_summary, tokens_used, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
          [generateId(), "catalyst", null, `从 ${ideas.length} 条想法中挑选杂交对`, pair ? `${pair.ideaA.title} × ${pair.ideaB.title}` : "未找到合适的配对", tokensUsed, new Date()]
        );
      } catch { /* best-effort logging */ }

      return NextResponse.json({ pair });
    } finally {
      releaseDb(conn);
    }
  } catch {
    return NextResponse.json({ pair: null, error: "AI unavailable" }, { status: 200 });
  }
}
