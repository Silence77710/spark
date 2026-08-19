export function formatRelativeTime(dateStr: string): string {
  const now = Date.now();
  const date = new Date(dateStr).getTime();
  const diff = now - date;

  const seconds = Math.floor(diff / 1000);
  if (seconds < 60) return "刚刚";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}分钟前`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}小时前`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}天前`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}个月前`;
  const years = Math.floor(months / 12);
  return `${years}年前`;
}

export function truncate(str: string, len: number): string {
  if (str.length <= len) return str;
  return str.slice(0, len) + "...";
}

// 把 Markdown 原文剥成纯文本，供列表/回顾等单行预览使用；
// 与 truncate 组合：truncate(stripMarkdown(content), n)
export function stripMarkdown(md: string): string {
  return md
    .replace(/```[\s\S]*?```/g, " ")           // 代码块
    .replace(/`([^`]*)`/g, "$1")               // 行内代码
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, "$1")  // 图片保留 alt
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")   // 链接保留文字
    .replace(/\[\[([^\]]+)\]\]/g, "$1")        // wiki 链接
    .replace(/^#{1,6}\s+/gm, "")               // 标题
    .replace(/^\s*>\s?/gm, "")                 // 引用
    .replace(/^\s*[-*+]\s+/gm, "")             // 无序列表
    .replace(/^\s*\d+\.\s+/gm, "")             // 有序列表
    .replace(/^\s*(?:[-*_]\s*){3,}$/gm, " ")   // 分割线
    .replace(/(\*\*|__)(.*?)\1/g, "$2")        // 粗体
    .replace(/(\*|_)(.*?)\1/g, "$2")           // 斜体
    .replace(/~~(.*?)~~/g, "$1")               // 删除线
    .replace(/<[^>]+>/g, " ")                  // HTML 标签
    .replace(/\s+/g, " ")                      // 压缩空白
    .trim();
}

export function generateId(): string {
  return crypto.randomUUID();
}

export {
  type ImportanceLevel,
  DEFAULT_IMPORTANCE_LEVELS,
  getImportanceLabel,
  mergeImportanceLevels,
} from "./importance";
