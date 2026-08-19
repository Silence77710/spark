import { NextRequest, NextResponse } from "next/server";
import { getDb, releaseDb, IdeaRelationshipRow, RowDataPacket } from "@spark/db";
import { generateId } from "@spark/utils";

// GET /api/relationships?idea_id=xxx — list relationships for an idea
export async function GET(request: NextRequest) {
  const conn = await getDb();
  try {
    const { searchParams } = new URL(request.url);
    const ideaId = searchParams.get("idea_id");

    let rows: IdeaRelationshipRow[];
    if (ideaId) {
      [rows] = await conn.query<IdeaRelationshipRow[] & RowDataPacket[]>(
        `SELECT * FROM idea_relationships WHERE source_id = ? OR target_id = ? ORDER BY created_at DESC`,
        [ideaId, ideaId]
      );
    } else {
      [rows] = await conn.query<IdeaRelationshipRow[] & RowDataPacket[]>(
        "SELECT * FROM idea_relationships ORDER BY created_at DESC LIMIT 100"
      );
    }

    return NextResponse.json({ relationships: rows });
  } finally {
    releaseDb(conn);
  }
}

// POST /api/relationships — create a new relationship (user or AI-suggested)
export async function POST(request: NextRequest) {
  const conn = await getDb();
  try {
    const body = await request.json();
    const { source_id, target_id, type = "related", created_by = "user", ai_explanation = null } = body;

    if (!source_id || !target_id || source_id === target_id) {
      return NextResponse.json({ error: "无效的关联" }, { status: 400 });
    }

    // Check for duplicate (either direction)
    const [existing] = await conn.query<RowDataPacket[]>(
      "SELECT id FROM idea_relationships WHERE (source_id = ? AND target_id = ?) OR (source_id = ? AND target_id = ?)",
      [source_id, target_id, target_id, source_id]
    );
    if (existing.length > 0) {
      return NextResponse.json({ error: "关联已存在" }, { status: 409 });
    }

    const id = generateId();
    const now = new Date();
    await conn.query(
      "INSERT INTO idea_relationships (id, source_id, target_id, type, created_by, ai_explanation, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
      [id, source_id, target_id, type, created_by, ai_explanation, now]
    );

    const [rows] = await conn.query<IdeaRelationshipRow[] & RowDataPacket[]>(
      "SELECT * FROM idea_relationships WHERE id = ?", [id]
    );

    return NextResponse.json(rows[0], { status: 201 });
  } finally {
    releaseDb(conn);
  }
}
