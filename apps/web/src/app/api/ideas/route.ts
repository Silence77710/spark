import { NextRequest, NextResponse } from "next/server";
import { getDb, releaseDb, IdeaRow, ActivityRow, RowDataPacket } from "@spark/db";
import { generateId } from "@spark/utils";

export async function GET(request: NextRequest) {
  const conn = await getDb();
  try {
    const { searchParams } = new URL(request.url);
    const q = searchParams.get("q");
    const collection = searchParams.get("collection");
    const status = searchParams.get("status");
    const sort = searchParams.get("sort") || "newest";
    const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
    const pageSize = Math.min(100, Math.max(1, parseInt(searchParams.get("pageSize") || "20")));

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
    if (status && status.trim()) {
      const statuses = status.split(",").map(s => s.trim()).filter(Boolean);
      if (statuses.length > 0) {
        conditions.push(`status IN (${statuses.map(() => "?").join(",")})`);
        params.push(...statuses);
      }
    }

    const whereClause = conditions.length > 0 ? " WHERE " + conditions.join(" AND ") : "";

    // Count total
    const [countRows] = await conn.query<RowDataPacket[]>(
      "SELECT COUNT(*) as total FROM ideas" + whereClause, params
    );
    const total = countRows[0].total as number;

    // Sort
    const sortMap: Record<string, string> = {
      newest: "created_at DESC",
      oldest: "created_at ASC",
      updated: "updated_at DESC",
      status: "CASE status WHEN 'seed' THEN 1 WHEN 'sprout' THEN 2 WHEN 'growing' THEN 3 WHEN 'realized' THEN 4 WHEN 'archived' THEN 5 WHEN 'dormant' THEN 6 END ASC",
    };
    const orderBy = sortMap[sort] || sortMap.newest;

    const offset = (page - 1) * pageSize;
    const dataParams = [...params, pageSize, offset];

    const [rows] = await conn.query<IdeaRow[] & RowDataPacket[]>(
      "SELECT * FROM ideas" + whereClause + " ORDER BY " + orderBy + " LIMIT ? OFFSET ?",
      dataParams
    );

    return NextResponse.json({ ideas: rows, total, page, pageSize });
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

    const [rows] = await conn.query<IdeaRow[] & RowDataPacket[]>(
      "SELECT * FROM ideas WHERE id = ?", [id]
    );

    // Auto-log capture activity
    await conn.query(
      "INSERT INTO idea_activities (id, idea_id, type, content, created_at) VALUES (?, ?, ?, ?, ?)",
      [generateId(), id, "capture", `捕获了想法「${title.trim()}」`, now]
    );

    return NextResponse.json(rows[0], { status: 201 });
  } finally {
    releaseDb(conn);
  }
}
