import { NextResponse } from 'next/server'
import sql from '@/lib/db'

export async function POST(req: Request) {

  const { goal_id, title, sort_order } = await req.json()
  const rows = await sql.query(
    `INSERT INTO issues (goal_id, title, sort_order)
     VALUES ($1, $2, $3) RETURNING *`,
    [goal_id, title, sort_order ?? 0]
  )
  return NextResponse.json(rows[0])
}
