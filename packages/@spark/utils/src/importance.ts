export interface ImportanceLevel {
  value: number;
  label: string;
  description: string;
}

export const DEFAULT_IMPORTANCE_LEVELS: ImportanceLevel[] = [
  { value: 0, label: "未评级",   description: "刚捕获，还没判断" },
  { value: 1, label: "灵感碎片", description: "有点意思，先放着" },
  { value: 2, label: "有意思",   description: "值得回看" },
  { value: 3, label: "想做",     description: "想认真发展" },
  { value: 4, label: "必做",     description: "核心想法，必须实现" },
];

export function getImportanceLabel(levels: ImportanceLevel[], value: number): string {
  return levels.find(l => l.value === value)?.label ?? "未评级";
}

export function mergeImportanceLevels(custom: ImportanceLevel[] | null): ImportanceLevel[] {
  if (!custom) return DEFAULT_IMPORTANCE_LEVELS;
  return DEFAULT_IMPORTANCE_LEVELS.map(def => {
    const c = custom.find(c => c.value === def.value);
    return c ? { ...def, label: c.label, description: c.description } : def;
  });
}
