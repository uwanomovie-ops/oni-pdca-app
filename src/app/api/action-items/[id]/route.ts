import { NextResponse } from 'next/server'
import sql from '@/lib/db'

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {

  const { id } = await params
  const { is_done } = await req.json()
  const rows = await sql.query(
    'UPDATE action_items SET is_done = $1 WHERE id = $2 RETURNING *',
    [is_done, id]
  )
  return NextResponse.json(rows[0])
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {

  const { id } = await params
  await sql.query('DELETE FROM action_items WHERE id = $1', [id])
  return NextResponse.json({ ok: true })
}
