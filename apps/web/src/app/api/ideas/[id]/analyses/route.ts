import { NextRequest, NextResponse } from "next/server";
import { getDb, releaseDb, IdeaAnalysisRow, RowDataPacket } from "@spark/db";
import { generateId } from "@spark/utils";
import { validateDimensions } from "@/lib/analysis";

// GET /api/ideas/[id]/analyses — 想法的分析历史（新的在前）
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const conn = await getDb();
  try {
    const [rows] = await conn.query<IdeaAnalysisRow[] & RowDataPacket[]>(
      "SELECT * FROM idea_analyses WHERE idea_id = ? ORDER BY created_at DESC LIMIT 50",
      [id]
    );
    const analyses = rows.map(r => ({
      ...r,
      dimensions: typeof r.dimensions === "string" ? JSON.parse(r.dimensions) : r.dimensions,
    }));
    return NextResponse.json({ analyses });
  } finally {
    releaseDb(conn);
  }
}

// POST /api/ideas/[id]/analyses — 用户确认后保存一份分析
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();
  const { dimensions, model, tokens_used } = body;
  const err = validateDimensions(dimensions);
  if (err) {
    return NextResponse.json({ error: err }, { status: 400 });
  }

  const conn = await getDb();
  try {
    // 确认想法存在，避免孤儿数据（本表无外键约束）
    const [ideaRows] = await conn.query<RowDataPacket[]>(
      "SELECT id FROM ideas WHERE id = ?", [id]
    );
    if (ideaRows.length === 0) {
      return NextResponse.json({ error: "想法不存在" }, { status: 404 });
    }

    const analysisId = generateId();
    const createdAt = new Date();
    await conn.query(
      "INSERT INTO idea_analyses (id, idea_id, dimensions, model, tokens_used, created_at) VALUES (?, ?, ?, ?, ?, ?)",
      [analysisId, id, JSON.stringify(dimensions), model ?? null, tokens_used ?? null, createdAt]
    );
    return NextResponse.json({
      id: analysisId,
      idea_id: id,
      dimensions,
      model: model ?? null,
      tokens_used: tokens_used ?? null,
      created_at: createdAt.toISOString(),
    });
  } finally {
    releaseDb(conn);
  }
}
