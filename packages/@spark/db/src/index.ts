import mysql, { Pool, PoolConnection } from "mysql2/promise";

const pool: Pool = mysql.createPool({
  host: "127.0.0.1",
  port: 3306,
  user: "root",
  password: "spark123",
  database: "spark",
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
