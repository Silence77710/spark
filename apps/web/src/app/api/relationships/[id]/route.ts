import { NextRequest, NextResponse } from "next/server";
import { getDb, releaseDb } from "@spark/db";

// DELETE /api/relationships/[id] — remove a relationship
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const conn = await getDb();
  try {
    await conn.query("DELETE FROM idea_relationships WHERE id = ?", [id]);
    return NextResponse.json({ success: true });
  } finally {
    releaseDb(conn);
  }
}
