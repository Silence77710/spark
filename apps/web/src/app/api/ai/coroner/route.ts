import { NextRequest, NextResponse } from "next/server";
import { getDb, releaseDb, IdeaRow, RowDataPacket } from "@spark/db";
import { generateCoronerReport, type DeceasedIdea } from "@spark/ai";
import { generateId } from "@spark/utils";

// POST /api/ai/coroner — analyze abandoned ideas for patterns
export async function POST(request: NextRequest) {
  try {
    const conn = await getDb();
    try {
      const [ideas] = await conn.query<IdeaRow[] & RowDataPacket[]>(
        "SELECT id, title, content, status, importance, collection, epitaph, created_at, updated_at FROM ideas WHERE status IN ('archived', 'dormant') ORDER BY updated_at DESC LIMIT 50"
      );

      if (ideas.length < 5) {
        return NextResponse.json({ report: null, message: "归档想法还不够多，需要至少 5 条才能做验尸分析" });
      }

      const deceasedIdeas: DeceasedIdea[] = ideas.map(i => ({
        title: i.title,
        epitaph: i.epitaph,
        status: i.status,
        createdAt: i.created_at,
        archivedAt: i.updated_at,
        importance: i.importance,
        collection: i.collection,
        lifespanDays: Math.floor((new Date(i.updated_at).getTime() - new Date(i.created_at).getTime()) / 86400000),
      }));

      const { report, raw } = await generateCoronerReport(deceasedIdeas);

      // Log AI interaction
      try {
        await conn.query(
          "INSERT INTO ai_interactions (id, feature, idea_id, request_summary, response_summary, tokens_used, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
          [generateId(), "coroner", null, `验尸 ${ideas.length} 条放弃的想法`, report ? "生成验尸报告" : "未生成报告", raw.tokensUsed, new Date()]
        );
      } catch { /* best-effort logging */ }

      return NextResponse.json({ report });
    } finally {
      releaseDb(conn);
    }
  } catch {
    return NextResponse.json({ report: null, error: "AI unavailable" }, { status: 200 });
  }
}
