import { NextResponse } from 'next/server'
import sql from '@/lib/db'

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { title, due_date } = await req.json()
  const rows = await sql.query(
    'UPDATE goals SET title = COALESCE($1, title), due_date = COALESCE($2, due_date) WHERE id = $3 RETURNING *',
    [title ?? null, due_date ?? null, id]
  )
  return NextResponse.json(rows[0])
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  await sql.query('DELETE FROM goals WHERE id = $1', [id])
  return NextResponse.json({ ok: true })
}
