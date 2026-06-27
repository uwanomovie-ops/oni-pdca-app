import { NextResponse } from 'next/server'
import sql from '@/lib/db'

export async function POST(req: Request) {

  const { workspace_id, goal_id, week_start, reflection } = await req.json()
  const rows = await sql.query(
    `INSERT INTO reviews (workspace_id, goal_id, week_start, reflection)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (workspace_id, goal_id, week_start) DO UPDATE SET reflection = $4
     RETURNING *`,
    [workspace_id, goal_id ?? null, week_start, reflection ?? '']
  )
  return NextResponse.json(rows[0])
}
