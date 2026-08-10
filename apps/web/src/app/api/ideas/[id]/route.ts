import { NextRequest, NextResponse } from "next/server";
import { getDb, releaseDb, IdeaRow } from "@spark/db";

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
    const now = new Date();
    const sets: string[] = ["updated_at = ?"];
    const vals: any[] = [now];

    if (body.title !== undefined) { sets.push("title = ?"); vals.push(body.title.trim()); }
    if (body.content !== undefined) { sets.push("content = ?"); vals.push(body.content.trim() || null); }
    if (body.status !== undefined) { sets.push("status = ?"); vals.push(body.status); }
    if (body.collection !== undefined) { sets.push("collection = ?"); vals.push(body.collection || null); }

    vals.push(id);
    await conn.query(`UPDATE ideas SET ${sets.join(", ")} WHERE id = ?`, vals);

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
