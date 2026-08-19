import type { ImportanceLevel } from "@spark/utils";
import { IMPORTANCE_CONFIG, STATUS_CONFIG } from "./config";
import type { Idea, IdeaGroup } from "./types";

// --- 列表分组：分组维度跟随排序语义 ---

const TIME_GROUP_LABELS: [string, string][] = [
  ["today", "今天"],
  ["yesterday", "昨天"],
  ["week", "本周"],
  ["earlier", "更早"],
];

function getTimeBucket(dateStr: string): string {
  const t = new Date(dateStr).getTime();
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const dayOfWeek = (now.getDay() + 6) % 7; // 周一为一周开始
  const weekStart = todayStart - dayOfWeek * 86400000;
  if (t >= todayStart) return "today";
  if (t >= todayStart - 86400000) return "yesterday";
  if (t >= weekStart) return "week";
  return "earlier";
}

export function groupIdeas(ideas: Idea[], sort: string, importanceLabels: ImportanceLevel[]): IdeaGroup[] {
  const buckets = new Map<string, Idea[]>();
  const put = (key: string, idea: Idea) => {
    const arr = buckets.get(key);
    if (arr) arr.push(idea); else buckets.set(key, [idea]);
  };

  if (sort === "important") {
    ideas.forEach(i => put(String(i.importance), i));
    return [4, 3, 2, 1, 0]
      .filter(v => buckets.has(String(v)))
      .map(v => ({
        key: String(v),
        label: importanceLabels.find(l => l.value === v)?.label ?? IMPORTANCE_CONFIG.find(c => c.value === v)?.label ?? "",
        ideas: buckets.get(String(v))!,
      }));
  }
  if (sort === "status") {
    ideas.forEach(i => put(i.status, i));
    return STATUS_CONFIG
      .filter(s => buckets.has(s.value))
      .map(s => ({ key: s.value, label: s.label, ideas: buckets.get(s.value)! }));
  }
  const field: "created_at" | "updated_at" = sort === "updated" ? "updated_at" : "created_at";
  ideas.forEach(i => put(getTimeBucket(i[field]), i));
  const groups = TIME_GROUP_LABELS
    .filter(([k]) => buckets.has(k))
    .map(([k, label]) => ({ key: k, label, ideas: buckets.get(k)! }));
  return sort === "oldest" ? groups.reverse() : groups;
}
