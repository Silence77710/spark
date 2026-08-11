import { NextResponse } from "next/server";
import { getDb, releaseDb, IdeaRow, RowDataPacket } from "@spark/db";

export async function GET() {
  const conn = await getDb();
  try {
    const [rows] = await conn.query<IdeaRow[] & RowDataPacket[]>(
      "SELECT DISTINCT collection FROM ideas WHERE collection IS NOT NULL AND collection != '' ORDER BY collection ASC"
    );
    return NextResponse.json(rows.map((r: any) => r.collection));
  } finally {
    releaseDb(conn);
  }
}
