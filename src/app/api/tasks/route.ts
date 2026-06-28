import { NextResponse } from 'next/server'
import sql from '@/lib/db'

export async function POST(req: Request) {

  const { issue_id, title, due_date, sort_order, ai_coach_added } = await req.json()
  const rows = await sql.query(
    `INSERT INTO tasks (issue_id, title, due_date, sort_order, ai_coach_added)
     VALUES ($1, $2, $3, $4, $5) RETURNING *`,
    [issue_id, title, due_date ?? null, sort_order ?? 0, ai_coach_added === true]
  )
  return NextResponse.json(rows[0])
}
