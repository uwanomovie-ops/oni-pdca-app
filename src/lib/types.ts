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
  created_at: string
}

export interface Review {
  id: string
  workspace_id: string
  goal_id: string | null
  week_start: string
  reflection: string | null
  created_at: string
}

export interface ActionItem {
  id: string
  review_id: string
  title: string
  is_done: boolean
  sort_order: number
  created_at: string
}
