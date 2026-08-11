import { NextRequest, NextResponse } from "next/server";
import { getDb, releaseDb, ActivityRow, RowDataPacket } from "@spark/db";
import { generateId } from "@spark/utils";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const conn = await getDb();
  try {
    const [rows] = await conn.query<ActivityRow[] & RowDataPacket[]>(
      "SELECT * FROM idea_activities WHERE idea_id = ? ORDER BY created_at DESC",
      [id]
    );
    return NextResponse.json(rows);
  } finally {
    releaseDb(conn);
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();
  const { type = "general", content } = body;

  if (!content || !content.trim()) {
    return NextResponse.json({ error: "活动内容不能为空" }, { status: 400 });
  }

  const now = new Date();
  const activity = {
    id: generateId(),
    idea_id: id,
    type,
    content: content.trim(),
    created_at: now,
  };

  const conn = await getDb();
  try {
    await conn.query(
      "INSERT INTO idea_activities (id, idea_id, type, content, created_at) VALUES (?, ?, ?, ?, ?)",
      [activity.id, activity.idea_id, activity.type, activity.content, activity.created_at]
    );

    const [rows] = await conn.query<ActivityRow[] & RowDataPacket[]>(
      "SELECT * FROM idea_activities WHERE id = ?", [activity.id]
    );
    return NextResponse.json(rows[0], { status: 201 });
  } finally {
    releaseDb(conn);
  }
}
