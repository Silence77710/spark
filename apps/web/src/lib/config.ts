// 跨页面共享的展示配置：唯一定义处，其他文件一律 import，禁止复制副本（AGENTS.md 硬规则）

export const STATUS_CONFIG = [
  { value: "seed",     label: "种子",   dot: "bg-amber-400",  text: "text-amber-700", bg: "bg-amber-50", ring: "ring-amber-200/50" },
  { value: "sprout",   label: "萌芽",   dot: "bg-emerald-400",text: "text-emerald-700", bg: "bg-emerald-50", ring: "ring-emerald-200/50" },
  { value: "growing",  label: "生长中", dot: "bg-sky-400",    text: "text-sky-700", bg: "bg-sky-50", ring: "ring-sky-200/50" },
  { value: "realized", label: "已实现", dot: "bg-violet-400", text: "text-violet-700", bg: "bg-violet-50", ring: "ring-violet-200/50" },
  { value: "archived", label: "已归档", dot: "bg-neutral-400",text: "text-neutral-500", bg: "bg-neutral-50", ring: "ring-neutral-200/50" },
  { value: "dormant",  label: "休眠",   dot: "bg-stone-400",  text: "text-stone-500", bg: "bg-stone-50", ring: "ring-stone-200/50" },
];

export const STATUS_MAP: Record<string, { label: string; dot: string }> = Object.fromEntries(
  STATUS_CONFIG.map(c => [c.value, { label: c.label, dot: c.dot }])
);

// 按 value 查表的索引形态：供 retro / explore / rhythm 等直接以 status / importance / emotion 取配置
export const STATUS_BY_VALUE: Record<string, (typeof STATUS_CONFIG)[number]> =
  Object.fromEntries(STATUS_CONFIG.map(c => [c.value, c])) as Record<string, (typeof STATUS_CONFIG)[number]>;

export const IMPORTANCE_CONFIG = [
  { value: 0, label: "未评级",   dot: "bg-neutral-300",  text: "text-neutral-500",  bg: "bg-neutral-50",  ring: "ring-neutral-200/50" },
  // 单色系深浅刻度：同一琥珀色由浅到深表达重要度，语义色只留给状态点，避免撞色
  { value: 1, label: "灵感碎片", dot: "bg-amber-300",    text: "text-amber-700",    bg: "bg-amber-50",    ring: "ring-amber-200/50" },
  { value: 2, label: "有意思",   dot: "bg-amber-400",    text: "text-amber-700",    bg: "bg-amber-50",    ring: "ring-amber-200/50" },
  { value: 3, label: "想做",     dot: "bg-amber-500",    text: "text-amber-700",    bg: "bg-amber-50",    ring: "ring-amber-200/50" },
  { value: 4, label: "必做",     dot: "bg-amber-700",    text: "text-amber-800",    bg: "bg-amber-50",    ring: "ring-amber-300/50" },
];

export const EMOTION_CONFIG = [
  // emoji 用于列表卡片标题旁（与状态圆点视觉区分），dot/bg 用于选择器与详情页
  { value: "excited",  label: "兴奋", emoji: "🔥", dot: "bg-rose-400",    text: "text-rose-700",    bg: "bg-rose-50",    ring: "ring-rose-200/50" },
  { value: "curious",  label: "好奇", emoji: "💡", dot: "bg-amber-400",   text: "text-amber-700",   bg: "bg-amber-50",   ring: "ring-amber-200/50" },
  { value: "anxious",  label: "焦虑", emoji: "⚡", dot: "bg-orange-400",  text: "text-orange-700",  bg: "bg-orange-50",  ring: "ring-orange-200/50" },
  { value: "calm",     label: "平静", emoji: "🌿", dot: "bg-sky-400",     text: "text-sky-700",     bg: "bg-sky-50",     ring: "ring-sky-200/50" },
  { value: "confused", label: "困惑", emoji: "🌀", dot: "bg-violet-400", text: "text-violet-700",  bg: "bg-violet-50",  ring: "ring-violet-200/50" },
];

export const IMPORTANCE_BY_VALUE: Record<number, (typeof IMPORTANCE_CONFIG)[number]> =
  Object.fromEntries(IMPORTANCE_CONFIG.map(c => [c.value, c])) as Record<number, (typeof IMPORTANCE_CONFIG)[number]>;

export const EMOTION_BY_VALUE: Record<string, (typeof EMOTION_CONFIG)[number]> =
  Object.fromEntries(EMOTION_CONFIG.map(c => [c.value, c])) as Record<string, (typeof EMOTION_CONFIG)[number]>;

export const SORT_OPTIONS = [
  { value: "important", label: "重要优先" },
  { value: "newest",  label: "最新创建" },
  { value: "oldest",  label: "最早创建" },
  { value: "updated", label: "最近更新" },
  { value: "status",  label: "按状态" },
];

const COLLECTION_PALETTE = [
  { bg: "bg-amber-50", text: "text-amber-700", ring: "ring-amber-200/50", dot: "bg-amber-400" },
  { bg: "bg-emerald-50", text: "text-emerald-700", ring: "ring-emerald-200/50", dot: "bg-emerald-400" },
  { bg: "bg-sky-50", text: "text-sky-700", ring: "ring-sky-200/50", dot: "bg-sky-400" },
  { bg: "bg-rose-50", text: "text-rose-700", ring: "ring-rose-200/50", dot: "bg-rose-400" },
  { bg: "bg-violet-50", text: "text-violet-700", ring: "ring-violet-200/50", dot: "bg-violet-400" },
  { bg: "bg-orange-50", text: "text-orange-700", ring: "ring-orange-200/50", dot: "bg-orange-400" },
  { bg: "bg-teal-50", text: "text-teal-700", ring: "ring-teal-200/50", dot: "bg-teal-400" },
  { bg: "bg-pink-50", text: "text-pink-700", ring: "ring-pink-200/50", dot: "bg-pink-400" },
];

export function getCollectionStyle(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = ((hash << 5) - hash) + name.charCodeAt(i);
  return COLLECTION_PALETTE[Math.abs(hash) % COLLECTION_PALETTE.length];
}
