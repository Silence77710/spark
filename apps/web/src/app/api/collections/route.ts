import { NextRequest, NextResponse } from "next/server";
import { getDb, releaseDb, RowDataPacket } from "@spark/db";

// GET /api/collections — returns [{ name, count }]
export async function GET() {
  const conn = await getDb();
  try {
    const [rows] = await conn.query<RowDataPacket[]>(
      "SELECT collection AS name, COUNT(*) AS count FROM ideas WHERE collection IS NOT NULL AND collection != '' GROUP BY collection ORDER BY collection ASC"
    );
    return NextResponse.json(rows);
  } finally {
    releaseDb(conn);
  }
}

// PUT /api/collections — rename collection: { oldName, newName }
export async function PUT(request: NextRequest) {
  const { oldName, newName } = await request.json();
  if (!oldName?.trim() || !newName?.trim()) {
    return NextResponse.json({ error: "集合名不能为空" }, { status: 400 });
  }
  const conn = await getDb();
  try {
    await conn.query(
      "UPDATE ideas SET collection = ? WHERE collection = ?",
      [newName.trim(), oldName.trim()]
    );
    return NextResponse.json({ success: true });
  } finally {
    releaseDb(conn);
  }
}

// DELETE /api/collections?name=xxx — unclassify all ideas in that collection
export async function DELETE(request: NextRequest) {
  const name = new URL(request.url).searchParams.get("name");
  if (!name?.trim()) {
    return NextResponse.json({ error: "缺少集合名" }, { status: 400 });
  }
  const conn = await getDb();
  try {
    await conn.query(
      "UPDATE ideas SET collection = NULL WHERE collection = ?",
      [name.trim()]
    );
    return NextResponse.json({ success: true });
  } finally {
    releaseDb(conn);
  }
}
