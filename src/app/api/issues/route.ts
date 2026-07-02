import { NextResponse } from 'next/server'
import sql from '@/lib/db'

export async function POST(req: Request) {
  try {
    const { goal_id, title, sort_order, ai_breakdown_added } = await req.json()
    const rows = await sql.query(
      `INSERT INTO issues (goal_id, title, sort_order, ai_breakdown_added)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [goal_id, title, sort_order ?? 0, ai_breakdown_added === true]
    )
    return NextResponse.json(rows[0])
  } catch (e) {
    const message = e instanceof Error ? e.message : '保存に失敗しました'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
