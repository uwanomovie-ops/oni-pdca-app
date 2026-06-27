import { NextResponse } from 'next/server'
import sql from '@/lib/db'

export async function POST(req: Request) {

  const { review_id, title, sort_order } = await req.json()
  const rows = await sql.query(
    `INSERT INTO action_items (review_id, title, sort_order)
     VALUES ($1, $2, $3) RETURNING *`,
    [review_id, title, sort_order ?? 0]
  )
  return NextResponse.json(rows[0])
}
