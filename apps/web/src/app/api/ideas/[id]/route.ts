import { NextRequest, NextResponse } from "next/server";
import { getDb, releaseDb, IdeaRow, ActivityRow, RowDataPacket } from "@spark/db";
import { generateId, DEFAULT_IMPORTANCE_LEVELS, getImportanceLabel } from "@spark/utils";

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

    return NextResponse.json(rows[0]);
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
    const oldImportance = current.length > 0 ? current[0].importance : null;

    const now = new Date();

    const hasContentUpdates = body.title !== undefined || body.content !== undefined || body.status !== undefined || body.collection !== undefined || body.importance !== undefined || body.emotion !== undefined;
    const sets: string[] = [];
    const vals: any[] = [];

    if (hasContentUpdates) { sets.push("updated_at = ?"); vals.push(now); }
    if (body.title !== undefined) { sets.push("title = ?"); vals.push(body.title.trim()); }
    if (body.content !== undefined) { sets.push("content = ?"); vals.push(body.content.trim() || null); }
    if (body.status !== undefined) { sets.push("status = ?"); vals.push(body.status); }
    if (body.importance !== undefined) { sets.push("importance = ?"); vals.push(Math.max(0, Math.min(4, Number(body.importance) || 0))); }
    if (body.collection !== undefined) { sets.push("collection = ?"); vals.push(body.collection || null); }
   if (body.last_reviewed_at !== undefined) { sets.push("last_reviewed_at = ?"); vals.push(new Date(body.last_reviewed_at)); }
   if (body.is_capsule !== undefined) { sets.push("is_capsule = ?"); vals.push(body.is_capsule ? 1 : 0); }
   if (body.unlock_at !== undefined) { sets.push("unlock_at = ?"); vals.push(body.unlock_at ? new Date(body.unlock_at) : null); }
  if (body.epitaph !== undefined) { sets.push("epitaph = ?"); vals.push(body.epitaph || null); }
   if (body.emotion !== undefined) { sets.push("emotion = ?"); vals.push(body.emotion || null); }

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

    // Auto-log importance change
    if (body.importance !== undefined && oldImportance !== null && body.importance !== oldImportance) {
      const fromLabel = getImportanceLabel(DEFAULT_IMPORTANCE_LEVELS, oldImportance);
      const toLabel = getImportanceLabel(DEFAULT_IMPORTANCE_LEVELS, body.importance);
      await conn.query(
        "INSERT INTO idea_activities (id, idea_id, type, content, created_at) VALUES (?, ?, ?, ?, ?)",
        [generateId(), id, "importance_change", `重要程度从「${fromLabel}」变为「${toLabel}」`, now]
     );
   }

  // Auto-log epitaph (墓志铭) when set
  if (body.epitaph !== undefined && body.epitaph.trim()) {
    await conn.query(
      "INSERT INTO idea_activities (id, idea_id, type, content, created_at) VALUES (?, ?, ?, ?, ?)",
      [generateId(), id, "general", `墓志铭：${body.epitaph.trim()}`, now]
    );
  }

   // Auto-log emotion change
   if (body.emotion !== undefined) {
     const emotionLabels: Record<string, string> = {
       excited: "兴奋", curious: "好奇", anxious: "焦虑", calm: "平静", confused: "困惑",
     };
     const label = emotionLabels[body.emotion] || body.emotion || "清除";
     await conn.query(
       "INSERT INTO idea_activities (id, idea_id, type, content, created_at) VALUES (?, ?, ?, ?, ?)",
       [generateId(), id, "general", `情绪标记为「${label}」`, now]
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
