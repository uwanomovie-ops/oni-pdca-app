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
