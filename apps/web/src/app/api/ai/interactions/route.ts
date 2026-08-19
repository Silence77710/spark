import { NextRequest, NextResponse } from "next/server";
import { getDb, releaseDb, AiInteractionRow, RowDataPacket } from "@spark/db";

// GET /api/ai/interactions — list AI interaction log for privacy control
export async function GET(request: NextRequest) {
  const conn = await getDb();
  try {
    const { searchParams } = new URL(request.url);
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "50")));

    const [rows] = await conn.query<AiInteractionRow[] & RowDataPacket[]>(
      "SELECT * FROM ai_interactions ORDER BY created_at DESC LIMIT ?",
      [limit]
    );

    return NextResponse.json({ interactions: rows });
  } finally {
    releaseDb(conn);
  }
}
