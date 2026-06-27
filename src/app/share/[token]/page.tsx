import { notFound } from 'next/navigation'
import sql from '@/lib/db'
import type { Workspace, Goal, Issue, Task, Review, ActionItem } from '@/lib/types'
import Board from '@/components/Board'

interface Props {
  params: Promise<{ token: string }>
}

export default async function SharePage({ params }: Props) {
  const { token } = await params

  const workspaceRows = await sql.query(
    'SELECT * FROM workspaces WHERE share_token = $1 LIMIT 1',
    [token]
  )
  const workspace = workspaceRows[0] as unknown as Workspace
  if (!workspace) notFound()

  const [goals, issues, tasks, reviews, actionItems] = await Promise.all([
    sql.query('SELECT * FROM goals WHERE workspace_id = $1 ORDER BY sort_order, created_at', [workspace.id]),
    sql.query(
      `SELECT i.* FROM issues i
       JOIN goals g ON g.id = i.goal_id
       WHERE g.workspace_id = $1
       ORDER BY i.sort_order, i.created_at`,
      [workspace.id]
    ),
    sql.query(
      `SELECT t.* FROM tasks t
       JOIN issues i ON i.id = t.issue_id
       JOIN goals g ON g.id = i.goal_id
       WHERE g.workspace_id = $1
       ORDER BY t.sort_order, t.created_at`,
      [workspace.id]
    ),
    sql.query(
      'SELECT * FROM reviews WHERE workspace_id = $1 ORDER BY week_start DESC',
      [workspace.id]
    ),
    sql.query(
      `SELECT ai.* FROM action_items ai
       JOIN reviews r ON r.id = ai.review_id
       WHERE r.workspace_id = $1
       ORDER BY ai.sort_order, ai.created_at`,
      [workspace.id]
    ),
  ])

  return (
    <div className="flex flex-col h-screen">
      <header className="flex items-center justify-between px-5 py-3 bg-white border-b border-slate-200 shrink-0 shadow-sm">
        <span className="text-lg font-bold text-slate-800">⚡️ {workspace.name}</span>
        <span className="text-xs bg-slate-100 text-slate-500 px-3 py-1 rounded-full">閲覧専用</span>
      </header>
      <div className="flex-1 overflow-hidden">
        <Board
          workspace={workspace}
          initialGoals={goals as unknown as Goal[]}
          initialIssues={issues as unknown as Issue[]}
          initialTasks={tasks as unknown as Task[]}
          initialReviews={reviews as unknown as Review[]}
          initialActionItems={actionItems as unknown as ActionItem[]}
          readOnly
        />
      </div>
    </div>
  )
}
