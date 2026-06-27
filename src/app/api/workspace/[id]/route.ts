import { NextResponse } from 'next/server'
import sql from '@/lib/db'

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {

  const { id } = await params
  const [goals, issues, tasks, reviews, actionItems] = await Promise.all([
    sql.query('SELECT * FROM goals WHERE workspace_id = $1 ORDER BY sort_order, created_at', [id]),
    sql.query(
      `SELECT i.* FROM issues i JOIN goals g ON g.id = i.goal_id
       WHERE g.workspace_id = $1 ORDER BY i.sort_order, i.created_at`, [id]
    ),
    sql.query(
      `SELECT t.* FROM tasks t JOIN issues i ON i.id = t.issue_id JOIN goals g ON g.id = i.goal_id
       WHERE g.workspace_id = $1 ORDER BY t.sort_order, t.created_at`, [id]
    ),
    sql.query('SELECT * FROM reviews WHERE workspace_id = $1 ORDER BY week_start DESC', [id]),
    sql.query(
      `SELECT ai.* FROM action_items ai JOIN reviews r ON r.id = ai.review_id
       WHERE r.workspace_id = $1 ORDER BY ai.sort_order, ai.created_at`, [id]
    ),
  ])
  return NextResponse.json({ goals, issues, tasks, reviews, actionItems })
}
