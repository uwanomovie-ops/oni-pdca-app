import { NextResponse } from 'next/server'
import sql from '@/lib/db'

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const body = await req.json()
  const fields = Object.keys(body)
  const values = Object.values(body)
  const setClause = fields.map((f, i) => `${f} = $${i + 1}`).join(', ')
  const rows = await sql.query(
    `UPDATE goals SET ${setClause} WHERE id = $${fields.length + 1} RETURNING *`,
    [...values, id]
  )
  return NextResponse.json(rows[0])
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  await sql.query('DELETE FROM goals WHERE id = $1', [id])
  return NextResponse.json({ ok: true })
}
