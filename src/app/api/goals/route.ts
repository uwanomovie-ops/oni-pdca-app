import { NextResponse } from 'next/server'
import sql from '@/lib/db'

export async function POST(req: Request) {

  const { workspace_id, title, due_date, sort_order } = await req.json()
  const rows = await sql.query(
    `INSERT INTO goals (workspace_id, title, due_date, sort_order)
     VALUES ($1, $2, $3, $4) RETURNING *`,
    [workspace_id, title, due_date ?? null, sort_order ?? 0]
  )
  return NextResponse.json(rows[0])
}
