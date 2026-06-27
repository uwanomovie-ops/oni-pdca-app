import { NextResponse } from 'next/server'
import sql from '@/lib/db'

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {

  const { id } = await params
  const { reflection } = await req.json()
  const rows = await sql.query(
    'UPDATE reviews SET reflection = $1 WHERE id = $2 RETURNING *',
    [reflection, id]
  )
  return NextResponse.json(rows[0])
}
