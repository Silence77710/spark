import { NextRequest, NextResponse } from "next/server";
import { getDb, releaseDb, AiInteractionRow, IdeaRow, IdeaRelationshipRow, RowDataPacket } from "@spark/db";
import { discoverConnections } from "@spark/ai";
import { generateId } from "@spark/utils";

// POST /api/ai/connect — discover hidden connections between ideas
export async function POST(request: NextRequest) {
  try {
    const conn = await getDb();
    try {
      // Fetch all non-archived, non-dormant ideas
      const [ideas] = await conn.query<IdeaRow[] & RowDataPacket[]>(
        "SELECT id, title, content FROM ideas WHERE status NOT IN ('archived', 'dormant') ORDER BY created_at DESC LIMIT 50"
      );

      if (ideas.length < 5) {
        return NextResponse.json({ pairs: [], message: "想法还不够多，多写几条再来发现连接" });
      }

      // Fetch existing relationships to avoid duplicates
      const [existing] = await conn.query<IdeaRelationshipRow[] & RowDataPacket[]>(
        "SELECT source_id, target_id FROM idea_relationships"
      );
      const existingPairs = existing.map(r => ({
        sourceId: r.source_id,
        targetId: r.target_id,
      }));

      const ideaBriefs = ideas.map(i => ({
        id: i.id,
        title: i.title,
        content: i.content || "",
      }));

      const { pairs, tokensUsed } = await discoverConnections(ideaBriefs, existingPairs);

      // Log AI interaction
      try {
        await conn.query(
          "INSERT INTO ai_interactions (id, feature, idea_id, request_summary, response_summary, tokens_used, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
          [generateId(), "connector", null, `分析 ${ideas.length} 条想法的连接`, pairs.length > 0 ? `推荐 ${pairs.length} 对连接` : "未发现连接", tokensUsed, new Date()]
        );
      } catch { /* best-effort logging */ }

      return NextResponse.json({ pairs });
    } finally {
      releaseDb(conn);
    }
  } catch {
    return NextResponse.json({ pairs: [], error: "AI unavailable" }, { status: 200 });
  }
}
