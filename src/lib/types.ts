export type Status = 'todo' | 'in_progress' | 'done'

export interface Workspace {
  id: string
  user_id: string
  name: string
  share_token: string
  created_at: string
}

export interface Goal {
  id: string
  workspace_id: string
  title: string
  description: string | null
  due_date: string | null
  sort_order: number
  created_at: string
}

export interface Issue {
  id: string
  goal_id: string
  title: string
  description: string | null
  sort_order: number
  ai_breakdown_added: boolean
  created_at: string
}

export interface Task {
  id: string
  issue_id: string
  title: string
  description: string | null
  status: Status
  achievement_rate: number
  due_date: string | null
  sort_order: number
  ai_coach_added: boolean
  ai_breakdown_added: boolean
  created_at: string
}

export type AdjustProposalType = 'add_kdi' | 'update_title' | 'update_due_date' | 'update_status'

export interface AdjustProposal {
  id: string
  type: AdjustProposalType
  kdi_id?: string
  issue_id?: string
  title?: string
  due_date?: string | null
  status?: Status
  reason: string
}

export interface AppliedAdjustLog {
  proposal_id: string
  type: AdjustProposalType
  applied_at: string
  summary: string
}

export interface Review {
  id: string
  workspace_id: string
  goal_id: string | null
  week_start: string
  reflection: string | null
  coach_feedback: string | null
  coach_proposals: AdjustProposal[] | null
  coach_applied_log: AppliedAdjustLog[] | null
  created_at: string
}

export interface CoachWeekHistory {
  week_start: string
  reflection: string | null
  action_items: { title: string; is_done: boolean }[]
  coach_feedback: string | null
  applied_count: number
  pending_action_titles: string[]
}

export interface ActionItem {
  id: string
  review_id: string
  title: string
  is_done: boolean
  sort_order: number
  created_at: string
}
