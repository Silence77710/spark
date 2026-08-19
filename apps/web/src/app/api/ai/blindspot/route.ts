import { NextRequest, NextResponse } from "next/server";
import { getDb, releaseDb, IdeaRow, RowDataPacket } from "@spark/db";
import { detectBlindSpots, type IdeaSummary } from "@spark/ai";
import { generateId } from "@spark/utils";

// POST /api/ai/blindspot — detect thinking blind spots
export async function POST(request: NextRequest) {
  try {
    const conn = await getDb();
    try {
      const [ideas] = await conn.query<IdeaRow[] & RowDataPacket[]>(
        "SELECT id, title, collection, emotion, status, importance FROM ideas ORDER BY created_at ASC LIMIT 100"
      );

      if (ideas.length < 15) {
        return NextResponse.json({ result: null, message: "需要至少 15 条想法才能分析思维盲区" });
      }

      const summaries: IdeaSummary[] = ideas.map(i => ({
        title: i.title,
        collection: i.collection,
        emotion: i.emotion,
        status: i.status,
        importance: i.importance,
      }));

      const { result, raw } = await detectBlindSpots(summaries);

      // Log AI interaction
      try {
        await conn.query(
          "INSERT INTO ai_interactions (id, feature, idea_id, request_summary, response_summary, tokens_used, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
          [generateId(), "blindspot", null, `分析 ${ideas.length} 条想法的盲区`, result ? `发现 ${result.topicBlindSpots.length} 个主题盲区` : "未生成", raw.tokensUsed, new Date()]
        );
      } catch { /* best-effort logging */ }

      return NextResponse.json({ result });
    } finally {
      releaseDb(conn);
    }
  } catch (err) {
    console.error("[ai/blindspot] request failed:", err);
    return NextResponse.json({ result: null, error: "AI unavailable" }, { status: 200 });
  }
}
