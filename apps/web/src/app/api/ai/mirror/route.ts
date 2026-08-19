import { NextRequest, NextResponse } from "next/server";
import { getDb, releaseDb, IdeaRow, ActivityRow, RowDataPacket } from "@spark/db";
import { generateMirrorInsights, type MirrorStats } from "@spark/ai";
import { generateId } from "@spark/utils";

// POST /api/ai/mirror — generate thinking mirror insights from metadata
export async function POST(request: NextRequest) {
  try {
    const conn = await getDb();
    try {
      const [ideas] = await conn.query<IdeaRow[] & RowDataPacket[]>(
        "SELECT id, title, status, importance, collection, emotion, created_at, updated_at, last_reviewed_at FROM ideas ORDER BY created_at ASC"
      );

      if (ideas.length < 20) {
        return NextResponse.json({ insights: [], message: "继续使用，积累更多想法后解锁思考镜子（需要至少 20 条想法）" });
      }

      const oldest = new Date(ideas[0].created_at).getTime();
      const daysSinceOldest = Math.floor((Date.now() - oldest) / 86400000);
      if (daysSinceOldest < 30) {
        return NextResponse.json({ insights: [], message: "继续使用，积累 30 天数据后解锁思考镜子" });
      }

      // Build stats
      const byImportance: Record<number, number> = {};
      const byStatus: Record<string, number> = {};
      const byEmotion: Record<string, number> = {};
      const byCollection: Record<string, number> = {};
      const captureByHour = new Array(24).fill(0);
      const captureByDayOfWeek = new Array(7).fill(0);

      for (const idea of ideas) {
        byImportance[idea.importance] = (byImportance[idea.importance] || 0) + 1;
        byStatus[idea.status] = (byStatus[idea.status] || 0) + 1;
        const emo = idea.emotion || "none";
        byEmotion[emo] = (byEmotion[emo] || 0) + 1;
        const col = idea.collection || "未分类";
        byCollection[col] = (byCollection[col] || 0) + 1;
        const d = new Date(idea.created_at);
        captureByHour[d.getHours()]++;
        captureByDayOfWeek[d.getDay()]++;
      }

      const seedCount = byStatus["seed"] || 0;
      const statusProgressRate = ideas.length > 0 ? (ideas.length - seedCount) / ideas.length : 0;
      const archivedCount = (byStatus["archived"] || 0) + (byStatus["dormant"] || 0);
      const archivedRate = ideas.length > 0 ? archivedCount / ideas.length : 0;

      // Count activities
      const [actRows] = await conn.query<ActivityRow[] & RowDataPacket[]>(
        "SELECT COUNT(*) as cnt FROM idea_activities"
      );
      const totalActivities = (actRows[0] as any).cnt || 0;
      const avgActivitiesPerIdea = ideas.length > 0 ? totalActivities / ideas.length : 0;

      const stats: MirrorStats = {
        totalIdeas: ideas.length,
        byImportance,
        byStatus,
        byEmotion,
        byCollection,
        statusProgressRate,
        avgActivitiesPerIdea,
        captureByHour,
        captureByDayOfWeek,
        oldestIdeaDays: daysSinceOldest,
        archivedRate,
      };

      const { insights, raw } = await generateMirrorInsights(stats);

      // Log AI interaction
      try {
        await conn.query(
          "INSERT INTO ai_interactions (id, feature, idea_id, request_summary, response_summary, tokens_used, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
          [generateId(), "mirror", null, `分析 ${ideas.length} 条想法的思考模式`, insights.length > 0 ? `生成 ${insights.length} 条洞察` : "未生成洞察", raw.tokensUsed, new Date()]
        );
      } catch { /* best-effort logging */ }

      return NextResponse.json({ insights });
    } finally {
      releaseDb(conn);
    }
  } catch {
    return NextResponse.json({ insights: [], error: "AI unavailable" }, { status: 200 });
  }
}
