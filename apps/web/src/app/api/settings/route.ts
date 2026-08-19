import { NextRequest, NextResponse } from "next/server";
import { getDb, releaseDb, SettingRow, RowDataPacket } from "@spark/db";
import {
  DEFAULT_IMPORTANCE_LEVELS,
  mergeImportanceLevels,
  type ImportanceLevel,
} from "@spark/utils";

const DEFAULT_AI_FEATURES = { socratic: true, connector: true, catalyst: true, retro: true };
const DEFAULT_AI_FEATURES_FULL = { ...DEFAULT_AI_FEATURES, mirror: true, devil: true, coroner: true, translate: true };

// GET /api/settings — 返回所有设置，缺失项用默认值填充
export async function GET() {
  const conn = await getDb();
  try {
    const [rows] = await conn.query<SettingRow[] & RowDataPacket[]>(
      "SELECT `key`, value FROM settings"
    );
    const map: Record<string, string> = {};
    for (const r of rows) {
      if (r.value) map[r.key] = r.value;
    }

    const importanceLevels = map["importance_levels"]
      ? mergeImportanceLevels(JSON.parse(map["importance_levels"]) as ImportanceLevel[])
      : DEFAULT_IMPORTANCE_LEVELS;

    const aiEnabled = map["ai_enabled"] === "true";
   const aiFeatures = map["ai_features"]
      ? { ...DEFAULT_AI_FEATURES_FULL, ...JSON.parse(map["ai_features"]) }
      : DEFAULT_AI_FEATURES_FULL;

    return NextResponse.json({ importance_levels: importanceLevels, ai_enabled: aiEnabled, ai_features: aiFeatures });
  } finally {
    releaseDb(conn);
  }
}

// PUT /api/settings — 更新设置
export async function PUT(request: NextRequest) {
  const body = await request.json();
  const conn = await getDb();
  try {
    if (body.importance_levels) {
      const levels: ImportanceLevel[] = body.importance_levels;
      if (levels.length !== 5 || !levels.every(l => typeof l.value === "number" && l.label?.trim())) {
        return NextResponse.json({ error: "等级数据格式错误" }, { status: 400 });
      }
      await conn.query(
        "INSERT INTO settings (`key`, value) VALUES ('importance_levels', ?) ON DUPLICATE KEY UPDATE value = ?",
        [JSON.stringify(levels), JSON.stringify(levels)]
      );
    }

    if (body.ai_enabled !== undefined) {
      await conn.query(
        "INSERT INTO settings (`key`, value) VALUES ('ai_enabled', ?) ON DUPLICATE KEY UPDATE value = ?",
        [String(body.ai_enabled), String(body.ai_enabled)]
      );
    }

    if (body.ai_features !== undefined) {
     const features = { ...DEFAULT_AI_FEATURES_FULL, ...body.ai_features };
      await conn.query(
        "INSERT INTO settings (`key`, value) VALUES ('ai_features', ?) ON DUPLICATE KEY UPDATE value = ?",
        [JSON.stringify(features), JSON.stringify(features)]
      );
    }

    return NextResponse.json({ success: true });
  } finally {
    releaseDb(conn);
  }
}
