import Board from '@/components/Board'
import type { Workspace, Goal, Issue, Task, Review, ActionItem } from '@/lib/types'
import { getWeekStart } from '@/lib/utils'

const workspace: Workspace = {
  id: 'w1', user_id: 'u1', name: '鬼速PDCAボード（プレビュー）',
  share_token: 'demo', created_at: '',
}

const goals: Goal[] = [
  { id: 'g1', workspace_id: 'w1', title: '英語スピーキング力を上げる', description: null, due_date: '2026-06-30', sort_order: 0, created_at: '' },
  { id: 'g2', workspace_id: 'w1', title: '副業で月10万円を達成する', description: null, due_date: '2026-09-30', sort_order: 1, created_at: '' },
]

const issues: Issue[] = [
  { id: 'i1', goal_id: 'g1', title: '毎日10分シャドーイング', description: null, sort_order: 0, ai_breakdown_added: false, created_at: '' },
  { id: 'i2', goal_id: 'g1', title: 'オンライン英会話を週3回受ける', description: null, sort_order: 1, ai_breakdown_added: false, created_at: '' },
  { id: 'i3', goal_id: 'g2', title: 'ポートフォリオサイトを完成させる', description: null, sort_order: 0, ai_breakdown_added: false, created_at: '' },
]

const tasks: Task[] = [
  { id: 't1', issue_id: 'i1', title: 'CNNの音声素材をダウンロード', description: null, status: 'done', achievement_rate: 100, due_date: null, sort_order: 0, ai_coach_added: false, ai_breakdown_added: false, created_at: '' },
  { id: 't2', issue_id: 'i1', title: 'シャドーイング用アプリを設定', description: null, status: 'done', achievement_rate: 100, due_date: null, sort_order: 1, ai_coach_added: false, ai_breakdown_added: false, created_at: '' },
  { id: 't3', issue_id: 'i1', title: '毎朝7時にリマインダーを設定', description: null, status: 'in_progress', achievement_rate: 60, due_date: '2026-05-15', sort_order: 2, ai_coach_added: false, ai_breakdown_added: false, created_at: '' },
  { id: 't4', issue_id: 'i2', title: 'DMM英会話のプラン契約', description: null, status: 'done', achievement_rate: 100, due_date: null, sort_order: 0, ai_coach_added: false, ai_breakdown_added: false, created_at: '' },
  { id: 't5', issue_id: 'i2', title: '予約カレンダーに週3枠をブロック', description: null, status: 'in_progress', achievement_rate: 25, due_date: '2026-05-16', sort_order: 1, ai_coach_added: false, ai_breakdown_added: false, created_at: '' },
  { id: 't6', issue_id: 'i3', title: 'デザインカンプをFigmaで作成', description: null, status: 'in_progress', achievement_rate: 50, due_date: '2026-05-20', sort_order: 0, ai_coach_added: false, ai_breakdown_added: false, created_at: '' },
  { id: 't7', issue_id: 'i3', title: 'Next.jsでコーディング', description: null, status: 'todo', achievement_rate: 0, due_date: '2026-05-25', sort_order: 1, ai_coach_added: false, ai_breakdown_added: false, created_at: '' },
]

const weekStart = getWeekStart()
const reviews: Review[] = [
  {
    id: 'r1',
    workspace_id: 'w1',
    goal_id: 'g1',
    week_start: weekStart,
    reflection: 'シャドーイングは継続できている。英会話は1回しかできなかった。来週は必ず3回やる。',
    coach_feedback: null,
    coach_proposals: null,
    coach_applied_log: null,
    created_at: '',
  },
]

const actionItems: ActionItem[] = [
  { id: 'a1', review_id: 'r1', title: '英会話の予約を今週中に3枠入れる', is_done: false, sort_order: 0, created_at: '' },
  { id: 'a2', review_id: 'r1', title: 'シャドーイング素材を来週分も準備する', is_done: true, sort_order: 1, created_at: '' },
]

export default function PreviewPage() {
  return (
    <div className="flex flex-col h-screen">
      <header className="flex items-center justify-between px-5 py-3 bg-white border-b border-slate-200 shrink-0 shadow-sm">
        <span className="text-lg font-bold text-slate-800">⚡️ {workspace.name}</span>
        <span className="text-xs bg-amber-100 text-amber-700 px-3 py-1 rounded-full font-medium">プレビューモード</span>
      </header>
      <div className="flex-1 overflow-hidden">
        <Board
          workspace={workspace}
          initialGoals={goals}
          initialIssues={issues}
          initialTasks={tasks}
          initialReviews={reviews}
          initialActionItems={actionItems}
          readOnly
        />
      </div>
    </div>
  )
}
