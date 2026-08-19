import { NextRequest, NextResponse } from "next/server";
import { getDb, releaseDb, AiInteractionRow, RowDataPacket } from "@spark/db";
import { generateSocraticQuestion } from "@spark/ai";
import { generateId } from "@spark/utils";

// POST /api/ai/socratic — generate a Socratic question for an idea
export async function POST(request: NextRequest) {
  const body = await request.json();
  const { idea_id, title, content } = body;

  if (!title || !title.trim()) {
    return NextResponse.json({ error: "标题不能为空" }, { status: 400 });
  }

  try {
    const { content: question, tokensUsed } = await generateSocraticQuestion(
      title.trim(),
      content || "",
    );

    // Log the AI interaction (best-effort, don't fail if logging fails)
    try {
      const conn = await getDb();
      try {
        await conn.query(
          "INSERT INTO ai_interactions (id, feature, idea_id, request_summary, response_summary, tokens_used, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
          [
            generateId(),
            "socratic",
            idea_id || null,
            `追问「${title.trim().slice(0, 80)}」`,
            question.slice(0, 200),
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

    return NextResponse.json({ question });
  } catch (err) {
    // Silent degradation — return empty so frontend can skip
    return NextResponse.json({ question: null, error: "AI unavailable" }, { status: 200 });
  }
}
