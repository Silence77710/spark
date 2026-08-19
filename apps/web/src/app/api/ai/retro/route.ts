import { NextRequest, NextResponse } from "next/server";
import { getDb, releaseDb, AiInteractionRow, IdeaRow, ActivityRow, RowDataPacket } from "@spark/db";
import { startRetroDialogue, continueRetroDialogue, type ChatMessage } from "@spark/ai";
import { generateId } from "@spark/utils";

// POST /api/ai/retro — start or continue a retro dialogue with an unlocked capsule
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { idea_id, history } = body;

    if (!idea_id) {
      return NextResponse.json({ error: "缺少 idea_id" }, { status: 400 });
    }

    const conn = await getDb();
    try {
      const [rows] = await conn.query<IdeaRow[] & RowDataPacket[]>(
        "SELECT * FROM ideas WHERE id = ?", [idea_id]
      );
      if (rows.length === 0) {
        return NextResponse.json({ error: "想法不存在" }, { status: 404 });
      }

      const idea = rows[0];

      // Check capsule is unlocked
      const isSealed = idea.is_capsule && idea.unlock_at && new Date(idea.unlock_at) > new Date();
      if (isSealed) {
        return NextResponse.json({ error: "胶囊尚未解锁" }, { status: 403 });
      }

      // Fetch activities for context
      const [activities] = await conn.query<ActivityRow[] & RowDataPacket[]>(
        "SELECT type, content, created_at FROM idea_activities WHERE idea_id = ? ORDER BY created_at ASC", [idea_id]
      );

      const ctx = {
        title: idea.title,
        content: idea.content || "",
        createdAt: idea.created_at,
        unlockAt: idea.unlock_at || idea.created_at,
        activities: activities.map(a => ({
          type: a.type,
          content: a.content,
          createdAt: a.created_at,
        })),
      };

      let result;
      if (history && Array.isArray(history) && history.length > 0) {
        result = await continueRetroDialogue(ctx, history as ChatMessage[]);
      } else {
        result = await startRetroDialogue(ctx);
      }

      // Log AI interaction
      try {
        await conn.query(
          "INSERT INTO ai_interactions (id, feature, idea_id, request_summary, response_summary, tokens_used, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
          [generateId(), "retro", idea_id, `回望对话「${idea.title.slice(0, 80)}」`, result.reply.slice(0, 200), result.tokensUsed, new Date()]
        );
      } catch { /* best-effort logging */ }

      return NextResponse.json({ reply: result.reply });
    } finally {
      releaseDb(conn);
    }
  } catch {
    return NextResponse.json({ reply: null, error: "AI unavailable" }, { status: 200 });
  }
}
