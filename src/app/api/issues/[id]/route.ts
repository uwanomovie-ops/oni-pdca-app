import { NextResponse } from 'next/server'
import sql from '@/lib/db'

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { title } = await req.json()
  const rows = await sql.query(
    'UPDATE issues SET title = $1 WHERE id = $2 RETURNING *',
    [title, id]
  )
  return NextResponse.json(rows[0])
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  await sql.query('DELETE FROM issues WHERE id = $1', [id])
  return NextResponse.json({ ok: true })
}
