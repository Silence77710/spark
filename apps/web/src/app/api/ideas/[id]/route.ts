import { NextRequest, NextResponse } from "next/server";
import { getDb, releaseDb, IdeaRow, ActivityRow, RowDataPacket } from "@spark/db";
import { generateId } from "@spark/utils";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const conn = await getDb();
  try {
    const [rows] = await conn.query<IdeaRow[] & RowDataPacket[]>(
      "SELECT * FROM ideas WHERE id = ?",
      [id]
    );
    if (rows.length === 0) {
      return NextResponse.json({ error: "想法不存在" }, { status: 404 });
    }

    // Update last_reviewed_at
    const now = new Date();
    await conn.query("UPDATE ideas SET last_reviewed_at = ? WHERE id = ?", [now, id]);

    // Read back to get consistent format
    const [updated] = await conn.query<IdeaRow[] & RowDataPacket[]>(
      "SELECT * FROM ideas WHERE id = ?", [id]
    );
    return NextResponse.json(updated[0]);
  } finally {
    releaseDb(conn);
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();
  const conn = await getDb();
  try {
    // Read current state before updating
    const [current] = await conn.query<IdeaRow[] & RowDataPacket[]>(
      "SELECT * FROM ideas WHERE id = ?", [id]
    );
    const oldStatus = current.length > 0 ? current[0].status : null;

    const now = new Date();
    const sets: string[] = ["updated_at = ?"];
    const vals: any[] = [now];

    if (body.title !== undefined) { sets.push("title = ?"); vals.push(body.title.trim()); }
    if (body.content !== undefined) { sets.push("content = ?"); vals.push(body.content.trim() || null); }
    if (body.status !== undefined) { sets.push("status = ?"); vals.push(body.status); }
    if (body.collection !== undefined) { sets.push("collection = ?"); vals.push(body.collection || null); }

    vals.push(id);
    await conn.query(`UPDATE ideas SET ${sets.join(", ")} WHERE id = ?`, vals);

    // Auto-log status change
    if (body.status !== undefined && oldStatus && body.status !== oldStatus) {
      const statusLabels: Record<string, string> = {
        seed: "种子", sprout: "萌芽", growing: "生长中",
        realized: "已实现", archived: "已归档", dormant: "休眠",
      };
      const from = statusLabels[oldStatus] || oldStatus;
      const to = statusLabels[body.status] || body.status;
      await conn.query(
        "INSERT INTO idea_activities (id, idea_id, type, content, created_at) VALUES (?, ?, ?, ?, ?)",
        [generateId(), id, "status_change", `状态从「${from}」变为「${to}」`, now]
      );
    }

    // Read back to get consistent format
    const [rows] = await conn.query<IdeaRow[] & RowDataPacket[]>(
      "SELECT * FROM ideas WHERE id = ?", [id]
    );
    if (rows.length === 0) {
      return NextResponse.json({ error: "想法不存在" }, { status: 404 });
    }
    return NextResponse.json(rows[0]);
  } finally {
    releaseDb(conn);
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const conn = await getDb();
  try {
    await conn.query("DELETE FROM ideas WHERE id = ?", [id]);
    return NextResponse.json({ success: true });
  } finally {
    releaseDb(conn);
  }
}
