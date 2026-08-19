import type { Idea } from "./types";

// 首页侧栏的派生数据：全部来自同一份全量想法列表（/api/ideas?pageSize=999），
// 客户端一次计算，避免每个小部件各自发起全量请求

// 每日回顾：随机取一条创建满 7 天的想法
export function pickDailyIdea(ideas: Idea[], now = Date.now()): Idea | null {
  const old = ideas.filter(i => (now - new Date(i.created_at).getTime()) / 86400000 >= 7);
  if (!old.length) return null;
  return old[Math.floor(Math.random() * old.length)];
}

// 墓地候选数：重要度 <= 1 且超过 90 天未回看
export function countGraveyard(ideas: Idea[], now = Date.now()): number {
  const cutoff = now - 90 * 86400000;
  return ideas.filter(i =>
    i.importance <= 1 &&
    new Date(i.last_reviewed_at || i.updated_at).getTime() < cutoff
  ).length;
}

// 状态分布：侧栏「状态」分组的计数来源
export function countByStatus(ideas: Idea[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const i of ideas) counts[i.status] = (counts[i.status] ?? 0) + 1;
  return counts;
}
