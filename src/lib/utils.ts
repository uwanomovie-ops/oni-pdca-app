import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import type { Task, Issue, Status } from './types'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function computeIssueRate(tasks: Task[]): number {
  if (tasks.length === 0) return 0
  return Math.round(tasks.reduce((sum, t) => sum + t.achievement_rate, 0) / tasks.length)
}

export function computeGoalRate(issues: Issue[], tasks: Task[]): number {
  if (issues.length === 0) return 0
  const rates = issues.map(i => computeIssueRate(tasks.filter(t => t.issue_id === i.id)))
  return Math.round(rates.reduce((sum, r) => sum + r, 0) / rates.length)
}

export function getWeekStart(date: Date = new Date()): string {
  const d = new Date(date)
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1)
  d.setDate(diff)
  return d.toISOString().split('T')[0]
}

export function formatWeekLabel(weekStart: string): string {
  const d = new Date(weekStart + 'T00:00:00')
  const end = new Date(d)
  end.setDate(d.getDate() + 6)
  return `${d.getMonth() + 1}/${d.getDate()} 〜 ${end.getMonth() + 1}/${end.getDate()}週`
}

export function statusLabel(status: Status): string {
  return { todo: 'TODO', in_progress: 'DO', done: 'DONE' }[status]
}

export function statusVariant(status: Status): 'secondary' | 'default' | 'outline' {
  return { todo: 'secondary', in_progress: 'default', done: 'outline' }[status] as 'secondary' | 'default' | 'outline'
}

export function nextStatus(status: Status): Status {
  return { todo: 'in_progress', in_progress: 'done', done: 'todo' }[status] as Status
}

export function rateColor(rate: number): string {
  if (rate >= 80) return 'bg-emerald-500'
  if (rate >= 50) return 'bg-blue-500'
  if (rate >= 20) return 'bg-amber-500'
  return 'bg-slate-300'
}

export type DueHealth = 'emergency' | 'caution' | 'good' | 'normal'

function parseDateOnly(dateStr: string): Date {
  return new Date(dateStr + 'T00:00:00')
}

function daysUntilDue(dueDate: string, now: Date): number {
  const due = parseDateOnly(dueDate)
  const today = new Date(now)
  today.setHours(0, 0, 0, 0)
  return Math.round((due.getTime() - today.getTime()) / (24 * 60 * 60 * 1000))
}

/** 納期×達成率によるヘルス（DONE・期限未設定は normal） */
export function getDueHealth(task: Task, now: Date = new Date()): DueHealth {
  if (task.status === 'done' || !task.due_date) return 'normal'

  const days = daysUntilDue(task.due_date, now)

  if (days < 0) return 'emergency'
  if (days <= 3 && task.achievement_rate < 70) return 'caution'
  if (days >= 7 && task.achievement_rate >= 50) return 'good'
  return 'normal'
}

const DUE_HEALTH_RANK: Record<DueHealth, number> = {
  emergency: 0,
  caution: 1,
  good: 2,
  normal: 3,
}

/** 配下タスクのうち最も悪い納期ヘルスを返す */
export function getWorstDueHealth(tasks: Task[], now: Date = new Date()): DueHealth {
  let worst: DueHealth = 'normal'
  for (const task of tasks) {
    const health = getDueHealth(task, now)
    if (DUE_HEALTH_RANK[health] < DUE_HEALTH_RANK[worst]) worst = health
  }
  return worst
}

export function dueHealthLabel(health: DueHealth): string {
  return { emergency: '緊急', caution: '注意', good: 'Good', normal: '' }[health]
}

export function dueHealthCardClass(health: DueHealth): string {
  if (health === 'emergency') return 'border-l-[9px] border-l-red-500'
  if (health === 'caution') return 'border-l-[9px] border-l-amber-400'
  if (health === 'good') return 'border-l-[9px] border-l-emerald-400'
  return ''
}
