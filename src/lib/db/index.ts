import { neon } from '@neondatabase/serverless'

const client = neon(process.env.DATABASE_URL!)

/** PostgreSQL date → JS Date は JST 深夜境界になり得るため、カレンダー日付は JST で正規化 */
function toDateOnlyString(value: Date): string {
  return value.toLocaleDateString('en-CA', { timeZone: 'Asia/Tokyo' })
}

function serializeRow(row: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(row)) {
    if (value instanceof Date) {
      result[key] = toDateOnlyString(value)
    } else {
      result[key] = value
    }
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
