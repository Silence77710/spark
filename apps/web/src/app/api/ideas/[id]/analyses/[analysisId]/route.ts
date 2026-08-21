import { NextRequest, NextResponse } from "next/server";
import { getDb, releaseDb, RowDataPacket } from "@spark/db";
import { validateDimensions } from "@/lib/analysis";

// PATCH /api/ideas/[id]/analyses/[analysisId] — 更新一份已存档的分析
// 目前用于：分析存档后，用户补充或修改追问回答（answer 随 dimensions 一起更新）
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; analysisId: string }> }
) {
  const { id, analysisId } = await params;
  const body = await request.json();
  const err = validateDimensions(body?.dimensions);
  if (err) {
    return NextResponse.json({ error: err }, { status: 400 });
  }

  const conn = await getDb();
  try {
    // 确认记录存在且属于该想法，避免误更新（本表无外键约束）
    const [rows] = await conn.query<RowDataPacket[]>(
      "SELECT id FROM idea_analyses WHERE id = ? AND idea_id = ?",
      [analysisId, id]
    );
    if (rows.length === 0) {
      return NextResponse.json({ error: "分析记录不存在" }, { status: 404 });
    }
    await conn.query(
      "UPDATE idea_analyses SET dimensions = ? WHERE id = ?",
      [JSON.stringify(body.dimensions), analysisId]
    );
    return NextResponse.json({ ok: true });
  } finally {
    releaseDb(conn);
  }
}
