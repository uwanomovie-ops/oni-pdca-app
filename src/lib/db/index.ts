import { neon } from '@neondatabase/serverless'

const client = neon(process.env.DATABASE_URL!)

/** PostgreSQL date → JS Date は JST 深夜境界になり得るため、カレンダー日付は JST で正規化 */
function toDateOnlyString(value: Date): string {
  return value.toLocaleDateString('en-CA', { timeZone: 'Asia/Tokyo' })
}

function normalizeDateField(value: unknown): unknown {
  if (value instanceof Date) return toDateOnlyString(value)
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}/.test(value)) {
    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value
    const parsed = new Date(value)
    if (!Number.isNaN(parsed.getTime())) return toDateOnlyString(parsed)
  }
  return value
}

function serializeRow(row: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(row)) {
    result[key] = normalizeDateField(value)
  }
  return result
}

const sql = {
  query: async (query: string, params?: unknown[]) => {
    const rows = await client.query(query, params)
    return (rows as Record<string, unknown>[]).map(serializeRow)
  },
}

export default sql
