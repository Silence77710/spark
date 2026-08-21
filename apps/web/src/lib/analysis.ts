// AI 全方位分析的 dimensions 结构校验（POST/PATCH analyses 路由共用）
// 每个维度必含 key/title/analysis/question，answer（用户的追问回答）为可选字符串
export function validateDimensions(dimensions: unknown): string | null {
  if (!Array.isArray(dimensions) || dimensions.length === 0) {
    return "dimensions 不能为空";
  }
  const valid = dimensions.every(
    (d: unknown) =>
      !!d && typeof d === "object" &&
      typeof (d as Record<string, unknown>).key === "string" &&
      typeof (d as Record<string, unknown>).title === "string" &&
      typeof (d as Record<string, unknown>).analysis === "string" &&
      typeof (d as Record<string, unknown>).question === "string" &&
      ((d as Record<string, unknown>).answer === undefined ||
        typeof (d as Record<string, unknown>).answer === "string")
  );
  return valid ? null : "dimensions 格式不正确";
}
