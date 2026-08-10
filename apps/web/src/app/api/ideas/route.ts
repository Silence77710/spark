import { NextRequest, NextResponse } from "next/server";
import { getDb, releaseDb, IdeaRow } from "@spark/db";
import { generateId } from "@spark/utils";

export async function GET(request: NextRequest) {
  const conn = await getDb();
  try {
    const { searchParams } = new URL(request.url);
    const q = searchParams.get("q");
    const collection = searchParams.get("collection");

    let sql = "SELECT * FROM ideas";
    const params: string[] = [];
    const conditions: string[] = [];

    if (q && q.trim()) {
      conditions.push("(title LIKE ? OR content LIKE ?)");
      params.push(`%${q}%`, `%${q}%`);
    }
    if (collection && collection.trim()) {
      conditions.push("collection = ?");
      params.push(collection.trim());
    }
    if (conditions.length > 0) {
      sql += " WHERE " + conditions.join(" AND ");
    }
    sql += " ORDER BY created_at DESC";

    const [rows] = await conn.query<IdeaRow[] & RowDataPacket[]>(sql, params);
    return NextResponse.json(rows);
  } finally {
    releaseDb(conn);
  }
}

export async function POST(request: NextRequest) {
  const conn = await getDb();
  try {
    const body = await request.json();
    const { title, content = "", collection = "" } = body;

    if (!title || !title.trim()) {
      return NextResponse.json({ error: "标题不能为空" }, { status: 400 });
    }

    const now = new Date();
    const id = generateId();
    const idea = {
      id,
      title: title.trim(),
      content: content.trim() || null,
      collection: collection.trim() || null,
      status: "seed",
      created_at: now,
      updated_at: now,
      last_reviewed_at: null,
    };

    await conn.query(
      "INSERT INTO ideas (id, title, content, collection, status, created_at, updated_at, last_reviewed_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
      [idea.id, idea.title, idea.content, idea.collection, idea.status, idea.created_at, idea.updated_at, idea.last_reviewed_at]
    );

    // Read back from DB to get consistent format
    const [rows] = await conn.query<IdeaRow[] & RowDataPacket[]>(
      "SELECT * FROM ideas WHERE id = ?", [id]
    );
    return NextResponse.json(rows[0], { status: 201 });
  } finally {
    releaseDb(conn);
  }
}
