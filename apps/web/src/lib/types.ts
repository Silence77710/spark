// 列表页及其组件共享的数据类型；字段与 /api/ideas 返回保持一致
export interface Idea {
  id: string; title: string; content: string; status: string;
  collection: string;
  importance: number;
  is_capsule: boolean;
  unlock_at: string | null;
  epitaph: string | null;
  emotion: string | null;
  created_at: string; updated_at: string; last_reviewed_at: string | null;
}

export interface ApiResponse {
  ideas: Idea[];
  total: number;
  page: number;
  pageSize: number;
}

export interface CollectionInfo { name: string; count: number; }

export interface ConnectionPair {
  sourceId: string; sourceTitle: string;
  targetId: string; targetTitle: string;
  explanation: string;
}

export interface CatalystIdea { id: string; title: string; content: string; collection: string; }
export interface CatalystPair { ideaA: CatalystIdea; ideaB: CatalystIdea; catalyst: string; }

export interface IdeaGroup { key: string; label: string; ideas: Idea[]; }
