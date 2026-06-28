import { NextResponse } from 'next/server'
import sql from '@/lib/db'

const ALLOWED_FIELDS = [
  'reflection',
  'coach_feedback',
  'coach_proposals',
  'coach_applied_log',
] as const

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const body = await req.json() as Record<string, unknown>

  const fields = ALLOWED_FIELDS.filter(f => f in body)
  if (fields.length === 0) {
    return NextResponse.json({ error: '更新フィールドがありません' }, { status: 400 })
  }

  const values = fields.map(f => {
    const value = body[f]
    if (f === 'coach_proposals' || f === 'coach_applied_log') {
      return value == null ? null : JSON.stringify(value)
    }
    return value
  })

  const setClause = fields.map((f, i) => `${f} = $${i + 1}`).join(', ')
  const rows = await sql.query(
    `UPDATE reviews SET ${setClause} WHERE id = $${fields.length + 1} RETURNING *`,
    [...values, id]
  )

  const row = rows[0]
  if (!row) {
    return NextResponse.json({ error: 'review not found' }, { status: 404 })
  }

  return NextResponse.json(row)
}
