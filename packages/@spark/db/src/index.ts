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
