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
   const importance = searchParams.get("importance");
    const parent = searchParams.get("parent");
    const sort = searchParams.get("sort") || "important";
    const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
    const pageSize = Math.min(100, Math.max(1, parseInt(searchParams.get("pageSize") || "20")));
    const backlinks = searchParams.get("backlinks");

    const params: string[] = [];
    const conditions: string[] = [];

    // Backlinks: find ideas whose content contains [[title of the given idea]]
    if (backlinks) {
      const [sourceRows] = await conn.query<IdeaRow[] & RowDataPacket[]>(
        "SELECT title FROM ideas WHERE id = ?", [backlinks]
      );
      if (sourceRows.length > 0) {
        const title = sourceRows[0].title;
        conditions.push("content LIKE ?");
        params.push(`%[[${title}]]%`);
        conditions.push("id != ?");
        params.push(backlinks);
      }
    }

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
    if (importance && importance.trim()) {
      const levels = importance.split(",").map(s => parseInt(s.trim())).filter(n => !isNaN(n));
      if (levels.length > 0) {
        conditions.push(`importance IN (${levels.map(() => "?").join(",")})`);
        params.push(...levels.map(String));
      }
    }
    if (parent && parent.trim()) {
      conditions.push("(parent_a_id = ? OR parent_b_id = ?)");
      params.push(parent.trim(), parent.trim());
    }

    const whereClause = conditions.length > 0 ? " WHERE " + conditions.join(" AND ") : "";

    const [countRows] = await conn.query<RowDataPacket[]>(
      "SELECT COUNT(*) as total FROM ideas" + whereClause, params
    );
    const total = countRows[0].total as number;

    const sortMap: Record<string, string> = {
      important: "importance DESC, created_at DESC",
      newest: "created_at DESC",
      oldest: "created_at ASC",
      updated: "updated_at DESC",
      status: "CASE status WHEN 'seed' THEN 1 WHEN 'sprout' THEN 2 WHEN 'growing' THEN 3 WHEN 'realized' THEN 4 WHEN 'archived' THEN 5 WHEN 'dormant' THEN 6 END ASC",
    };
    const orderBy = sortMap[sort] || sortMap.important;

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
    const importance = body.importance ?? 0;
    const isCapsule = body.is_capsule === true;
    const unlockAt = body.unlock_at ? new Date(body.unlock_at) : null;
   const parentAId = body.parent_a_id || null;
   const parentBId = body.parent_b_id || null;
   const emotion = body.emotion || null;

   if (!title || !title.trim()) {
     return NextResponse.json({ error: "标题不能为空" }, { status: 400 });
   }

   const now = new Date();
   const id = generateId();

   await conn.query(
     "INSERT INTO ideas (id, title, content, collection, status, importance, is_capsule, unlock_at, parent_a_id, parent_b_id, emotion, created_at, updated_at, last_reviewed_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
     [id, title.trim(), content.trim() || null, collection.trim() || null, "seed", Math.max(0, Math.min(4, Number(importance) || 0)), isCapsule, unlockAt, parentAId, parentBId, emotion, now, now, null]
   );

    // Auto-log capture activity
    await conn.query(
      "INSERT INTO idea_activities (id, idea_id, type, content, created_at) VALUES (?, ?, ?, ?, ?)",
      [generateId(), id, "capture", `捕获了想法「${title.trim()}」`, now]
    );

    // If hybrid offspring, log parentage activity
    if (parentAId && parentBId) {
      const [parentA] = await conn.query<IdeaRow[] & RowDataPacket[]>("SELECT title FROM ideas WHERE id = ?", [parentAId]);
      const [parentB] = await conn.query<IdeaRow[] & RowDataPacket[]>("SELECT title FROM ideas WHERE id = ?", [parentBId]);
      const titleA = parentA.length > 0 ? parentA[0].title : parentAId;
      const titleB = parentB.length > 0 ? parentB[0].title : parentBId;
      await conn.query(
        "INSERT INTO idea_activities (id, idea_id, type, content, created_at) VALUES (?, ?, ?, ?, ?)",
        [generateId(), id, "general", `从「${titleA}」和「${titleB}」杂交诞生`, now]
      );
    }

    const [rows] = await conn.query<IdeaRow[] & RowDataPacket[]>(
      "SELECT * FROM ideas WHERE id = ?", [id]
    );

    return NextResponse.json(rows[0], { status: 201 });
  } finally {
    releaseDb(conn);
  }
}
