import { neon } from '@neondatabase/serverless'

const client = neon(process.env.DATABASE_URL!)

function serializeRow(row: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(row)) {
    if (value instanceof Date) {
      result[key] = value.toISOString().split('T')[0]
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
