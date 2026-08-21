import mysql, { Pool, PoolConnection, RowDataPacket } from "mysql2/promise";
export type { RowDataPacket };


const pool: Pool = mysql.createPool({
  host: process.env.MYSQL_HOST ?? "127.0.0.1",
  port: Number(process.env.MYSQL_PORT ?? 3306),
  user: process.env.MYSQL_USER ?? "root",
  password: process.env.MYSQL_PASSWORD ?? "spark123",
  database: process.env.MYSQL_DATABASE ?? "spark",
  waitForConnections: true,
  connectionLimit: 5,
  queueLimit: 0,
});

export async function getDb(): Promise<PoolConnection> {
  return pool.getConnection();
}

export interface IdeaRow {
  id: string;
  title: string;
  content: string | null;
  status: string;
  collection: string | null;
 importance: number;
 is_capsule: boolean;
 unlock_at: string | null;
 epitaph: string | null;
 parent_a_id: string | null;
 parent_b_id: string | null;
 emotion: string | null;
 created_at: string;
 updated_at: string;
 last_reviewed_at: string | null;
}

export function releaseDb(conn: PoolConnection): void {
  conn.release();
}

export interface ActivityRow {
  id: string;
  idea_id: string;
  type: string;
  content: string;
  created_at: string;
}

export interface SettingRow {
 key: string;
 value: string | null;
}

export interface AiInteractionRow {
  id: string;
  feature: string;
  idea_id: string | null;
  request_summary: string | null;
  response_summary: string | null;
 tokens_used: number | null;
 created_at: string;
}

export interface IdeaAnalysisRow {
  id: string;
  idea_id: string;
  // JSON 列；mysql2 可能返回已解析的对象，调用方需兼容 string | 已解析数组两种情况
  dimensions: unknown;
  model: string | null;
  tokens_used: number | null;
  created_at: string;
}

export interface IdeaRelationshipRow {
  id: string;
  source_id: string;
  target_id: string;
  type: string;
  created_by: string;
  ai_explanation: string | null;
  created_at: string;
}
