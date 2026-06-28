'use client'

import { useState, useMemo, useEffect } from 'react'
import { api } from '@/lib/api'
import { proposalSummary } from '@/lib/coach'
import type {
  Goal,
  Issue,
  Task,
  Review,
  ActionItem,
  AdjustProposal,
  AppliedAdjustLog,
  CoachWeekHistory,
} from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { MessageSquareHeart, Loader2, Sparkles } from 'lucide-react'

interface Props {
  goal: Goal
  issues: Issue[]
  tasks: Task[]
  reviews: Review[]
  actionItems: ActionItem[]
  weekStart: string
  reflection: string
  currentReview: Review | null
  ensureReview: () => Promise<string>
  onRefresh: () => Promise<void>
  onSelectIssue?: (issueId: string) => void
  onReflectionChange: (text: string) => void
}

function parseJsonField<T>(value: unknown): T | null {
  if (value == null) return null
  if (typeof value === 'string') {
    try {
      return JSON.parse(value) as T
    } catch {
      return null
    }
  }
  return value as T
}

function buildWeekHistory(
  goalId: string,
  weekStart: string,
  reviews: Review[],
  actionItems: ActionItem[]
): CoachWeekHistory[] {
  return reviews
    .filter(r => r.goal_id === goalId && r.week_start < weekStart)
    .sort((a, b) => b.week_start.localeCompare(a.week_start))
    .slice(0, 3)
    .map(r => {
      const items = actionItems.filter(a => a.review_id === r.id)
      const applied = parseJsonField<AppliedAdjustLog[]>(r.coach_applied_log) ?? []
      return {
        week_start: r.week_start,
        reflection: r.reflection,
        action_items: items.map(a => ({ title: a.title, is_done: a.is_done })),
        coach_feedback: r.coach_feedback,
        applied_count: applied.length,
        pending_action_titles: items.filter(a => !a.is_done).map(a => a.title),
      }
    })
}

function proposalTypeLabel(type: AdjustProposal['type']): string {
  return {
    add_kdi: 'KDI追加',
    update_title: '名称変更',
    update_due_date: '期限変更',
    update_status: 'ステータス',
  }[type]
}

function isNewKdiProposal(p: AdjustProposal): boolean {
  return p.type === 'add_kdi'
}

/** 新規 KDI 追加のみ初期選択（既存 KDI の更新はオプトイン） */
function defaultSelectedIds(proposals: AdjustProposal[], applied: Set<string>): Set<string> {
  return new Set(
    proposals.filter(p => isNewKdiProposal(p) && !applied.has(p.id)).map(p => p.id)
  )
}

export default function AICoachPanel({
  goal,
  issues,
  tasks,
  reviews,
  actionItems,
  weekStart,
  reflection,
  currentReview,
  ensureReview,
  onRefresh,
  onSelectIssue,
  onReflectionChange,
}: Props) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [draftingReflection, setDraftingReflection] = useState(false)
  const [adopting, setAdopting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [applySuccess, setApplySuccess] = useState<string | null>(null)
  const [feedback, setFeedback] = useState('')
  const [coachFeedback, setCoachFeedback] = useState<string | null>(
    currentReview?.coach_feedback ?? null
  )
  const [proposals, setProposals] = useState<AdjustProposal[]>(() =>
    parseJsonField<AdjustProposal[]>(currentReview?.coach_proposals) ?? []
  )
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set())

  const goalIssues = useMemo(
    () => issues.filter(i => i.goal_id === goal.id),
    [issues, goal.id]
  )
  const goalTasks = useMemo(
    () => tasks.filter(t => goalIssues.some(i => i.id === t.issue_id)),
    [tasks, goalIssues]
  )

  const appliedIds = useMemo(() => {
    const log = parseJsonField<AppliedAdjustLog[]>(currentReview?.coach_applied_log) ?? []
    return new Set(log.map(l => l.proposal_id))
  }, [currentReview?.coach_applied_log])

  useEffect(() => {
    const log = parseJsonField<AppliedAdjustLog[]>(currentReview?.coach_applied_log) ?? []
    const applied = new Set(log.map(l => l.proposal_id))
    setCoachFeedback(currentReview?.coach_feedback ?? null)
    const saved = parseJsonField<AdjustProposal[]>(currentReview?.coach_proposals) ?? []
    setProposals(saved)
    setSelectedIds(defaultSelectedIds(saved, applied))
  }, [
    currentReview?.id,
    currentReview?.coach_feedback,
    currentReview?.coach_proposals,
    currentReview?.coach_applied_log,
  ])

  const pendingProposals = proposals.filter(p => !appliedIds.has(p.id))

  const saveCoachToReview = async (reviewId: string, fb: string, props: AdjustProposal[]) => {
    await api.patch(`/api/reviews/${reviewId}`, {
      coach_feedback: fb,
      coach_proposals: props,
      coach_applied_log: null,
    })
  }

  const generate = async (opts?: { withFeedback?: boolean; tone?: 'standard' | 'strict' | 'supportive' }) => {
    setLoading(true)
    setError(null)
    try {
      const history = buildWeekHistory(goal.id, weekStart, reviews, actionItems)
      const result = await api.post('/api/ai/coach', {
        mode: 'coach',
        goal: { id: goal.id, title: goal.title, due_date: goal.due_date },
        issues: goalIssues,
        tasks: goalTasks,
        week_start: weekStart,
        reflection,
        history,
        feedback: opts?.withFeedback ? feedback.trim() : undefined,
        tone: opts?.tone ?? (opts?.withFeedback && feedback.includes('厳し') ? 'strict' : 'standard'),
      }) as { feedback: string; proposals: AdjustProposal[] }

      setCoachFeedback(result.feedback)
      setProposals(result.proposals)
      setSelectedIds(defaultSelectedIds(result.proposals, new Set()))

      const reviewId = await ensureReview()
      await saveCoachToReview(reviewId, result.feedback, result.proposals)
      if (!opts?.withFeedback) setFeedback('')
      await onRefresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : '生成に失敗しました')
    } finally {
      setLoading(false)
    }
  }

  const handleOpen = () => {
    setOpen(true)
    const saved = parseJsonField<AdjustProposal[]>(currentReview?.coach_proposals) ?? []
    const log = parseJsonField<AppliedAdjustLog[]>(currentReview?.coach_applied_log) ?? []
    const applied = new Set(log.map(l => l.proposal_id))
    const hasPending = saved.some(p => !applied.has(p.id))
    if (saved.length === 0 || !hasPending) {
      generate()
    }
  }

  const draftReflection = async () => {
    setDraftingReflection(true)
    setError(null)
    try {
      const result = await api.post('/api/ai/coach', {
        mode: 'reflection_draft',
        goal: { id: goal.id, title: goal.title, due_date: goal.due_date },
        issues: goalIssues,
        tasks: goalTasks,
        week_start: weekStart,
      }) as { reflection: string }
      onReflectionChange(result.reflection)
      const reviewId = await ensureReview()
      await api.patch(`/api/reviews/${reviewId}`, { reflection: result.reflection })
      await onRefresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : '下書き生成に失敗しました')
    } finally {
      setDraftingReflection(false)
    }
  }

  const toggleProposal = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const applySelected = async () => {
    const toApply = pendingProposals.filter(p => selectedIds.has(p.id))
    if (toApply.length === 0) return

    setAdopting(true)
    setError(null)
    setApplySuccess(null)
    try {
      const reviewId = await ensureReview()
      const existingLog = parseJsonField<AppliedAdjustLog[]>(currentReview?.coach_applied_log) ?? []
      const newLog: AppliedAdjustLog[] = [...existingLog]
      let added = 0
      let updated = 0
      let skipped = 0
      let focusIssueId: string | null = null

      for (const p of toApply) {
        switch (p.type) {
          case 'add_kdi': {
            const issueTasks = goalTasks.filter(t => t.issue_id === p.issue_id)
            const duplicate = issueTasks.some(
              t => t.title === p.title && t.ai_coach_added
            )
            if (!duplicate) {
              const created = await api.post('/api/tasks', {
                issue_id: p.issue_id,
                title: p.title,
                due_date: p.due_date ?? null,
                sort_order: issueTasks.length,
                ai_coach_added: true,
              }) as { id: string }
              if (p.status && p.status !== 'todo') {
                await api.patch(`/api/tasks/${created.id}`, { status: p.status })
              }
              added++
              if (p.issue_id) focusIssueId = p.issue_id
            } else {
              skipped++
            }
            break
          }
          case 'update_title': {
            const task = goalTasks.find(t => t.id === p.kdi_id)
            if (task && task.title !== p.title) {
              await api.patch(`/api/tasks/${p.kdi_id}`, { title: p.title })
              updated++
              focusIssueId = task.issue_id
            } else {
              skipped++
            }
            break
          }
          case 'update_due_date': {
            const task = goalTasks.find(t => t.id === p.kdi_id)
            const nextDue = p.due_date ?? null
            if (task && task.due_date !== nextDue) {
              await api.patch(`/api/tasks/${p.kdi_id}`, { due_date: nextDue })
              updated++
              focusIssueId = task.issue_id
            } else {
              skipped++
            }
            break
          }
          case 'update_status': {
            const task = goalTasks.find(t => t.id === p.kdi_id)
            if (task && task.status !== p.status) {
              await api.patch(`/api/tasks/${p.kdi_id}`, { status: p.status })
              updated++
              focusIssueId = task.issue_id
            } else {
              skipped++
            }
            break
          }
        }
        newLog.push({
          proposal_id: p.id,
          type: p.type,
          applied_at: new Date().toISOString(),
          summary: proposalSummary(p, goalTasks, goalIssues),
        })
      }

      await api.patch(`/api/reviews/${reviewId}`, { coach_applied_log: newLog })
      await onRefresh()
      if (focusIssueId) onSelectIssue?.(focusIssueId)

      const parts: string[] = []
      if (added > 0) parts.push(`KDI追加 ${added}件`)
      if (updated > 0) parts.push(`更新 ${updated}件`)
      if (skipped > 0) parts.push(`変更なし ${skipped}件`)
      if (parts.length === 0) {
        setApplySuccess('反映できる変更はありませんでした（すでに同じ状態です）')
      } else {
        setApplySuccess(`左の KDI ペインに反映しました（${parts.join('・')}）`)
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : '採用に失敗しました')
    } finally {
      setAdopting(false)
    }
  }

  if (!open) {
    return (
      <div className="space-y-2">
        {coachFeedback && (
          <div className="rounded-lg border border-amber-200 bg-amber-50/60 p-2.5">
            <p className="text-[10px] font-semibold text-amber-800 uppercase tracking-wide mb-1">
              前回のコーチ所見
            </p>
            <p className="text-xs text-amber-950 whitespace-pre-wrap line-clamp-4">{coachFeedback}</p>
          </div>
        )}
        <Button
          type="button"
          variant="outline"
          size="xs"
          onClick={handleOpen}
          className="w-full border-amber-300 text-amber-800 hover:bg-amber-50"
        >
          <MessageSquareHeart className="w-3 h-3" />
          AIコーチに今週をレビュー
        </Button>
      </div>
    )
  }

  return (
    <div className="p-2.5 rounded-lg border border-amber-300 bg-white space-y-2">
      <div className="flex items-center gap-1.5">
        <MessageSquareHeart className="w-3.5 h-3.5 text-amber-700" />
        <span className="text-xs font-semibold text-amber-900">AI週次コーチ</span>
      </div>

      {loading && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground py-2">
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
          レビュー中…
        </div>
      )}

      {error && (
        <p className="text-xs text-red-600 bg-red-50 border border-red-100 rounded px-2 py-1.5">{error}</p>
      )}

      {applySuccess && (
        <p className="text-xs text-emerald-700 bg-emerald-50 border border-emerald-100 rounded px-2 py-1.5">
          {applySuccess}
        </p>
      )}

      {coachFeedback && !loading && (
        <div className="rounded-md border border-amber-100 bg-amber-50/80 p-2">
          <p className="text-[10px] font-semibold text-amber-800 mb-1">コーチ所見</p>
          <p className="text-xs text-amber-950 whitespace-pre-wrap">{coachFeedback}</p>
        </div>
      )}

      {proposals.length > 0 && !loading && (
        <div className="space-y-1.5 max-h-40 overflow-y-auto pane-scroll">
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
            Adjust 提案
          </p>
          <p className="text-[10px] text-muted-foreground">
            KDI追加のみ初期選択。既存KDIの変更は必要な場合のみチェック
          </p>
          {proposals.map(p => {
            const adopted = appliedIds.has(p.id)
            const isNew = isNewKdiProposal(p)
            const selected = adopted || selectedIds.has(p.id)
            return (
            <label
              key={p.id}
              className={`flex gap-2 rounded-md border p-2 cursor-pointer transition-colors ${
                adopted
                  ? 'border-emerald-200 bg-emerald-50/60 cursor-default'
                  : isNew
                    ? selected
                      ? 'border-amber-300 bg-amber-50/80'
                      : 'border-amber-200 bg-amber-50/40'
                    : selected
                      ? 'border-slate-300 bg-slate-100'
                      : 'border-slate-200 bg-slate-50/40 opacity-75'
              }`}
            >
              <input
                type="checkbox"
                checked={selected}
                disabled={adopted}
                onChange={() => !adopted && toggleProposal(p.id)}
                className={`mt-0.5 shrink-0 ${!isNew && !adopted ? 'accent-slate-400' : ''}`}
              />
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <p className={`text-[10px] font-medium ${isNew ? 'text-amber-800' : 'text-slate-500'}`}>
                    {proposalTypeLabel(p.type)}
                  </p>
                  {!adopted && isNew && (
                    <span className="text-[9px] font-semibold text-amber-700 bg-amber-100 px-1 rounded">
                      新規
                    </span>
                  )}
                  {!adopted && !isNew && (
                    <span className="text-[9px] font-semibold text-slate-500 bg-slate-100 px-1 rounded">
                      既存KDI
                    </span>
                  )}
                  {adopted && (
                    <span className="text-[9px] font-semibold text-emerald-700 bg-emerald-100 px-1 rounded">
                      採用済
                    </span>
                  )}
                </div>
                <p className={`text-xs ${isNew ? 'text-slate-800' : 'text-slate-600'}`}>
                  {proposalSummary(p, goalTasks, goalIssues)}
                </p>
                <p className="text-[10px] text-slate-500 mt-0.5">{p.reason}</p>
              </div>
            </label>
            )
          })}
        </div>
      )}

      {proposals.length > 0 && pendingProposals.length === 0 && !loading && (
        <p className="text-xs text-emerald-700 bg-emerald-50 border border-emerald-100 rounded px-2 py-1.5">
          すべて採用済みです。「再生成」または「厳しめ」で新しい提案を出せます
        </p>
      )}

      <Textarea
        value={feedback}
        onChange={e => setFeedback(e.target.value)}
        placeholder="再生成指示（例：もっと厳しく、KDI追加を増やして）"
        className="text-xs min-h-[48px] bg-white"
        rows={2}
      />

      <div className="flex flex-wrap gap-1.5">
        <Button
          type="button"
          size="xs"
          variant="outline"
          disabled={loading || adopting}
          onClick={() => generate({ withFeedback: true })}
          className="flex-1"
        >
          再生成
        </Button>
        <Button
          type="button"
          size="xs"
          variant="outline"
          disabled={loading || adopting}
          onClick={() => generate({ tone: 'strict' })}
          className="flex-1"
        >
          厳しめ
        </Button>
        <Button
          type="button"
          size="xs"
          disabled={pendingProposals.length === 0 || loading || adopting || selectedIds.size === 0}
          onClick={applySelected}
          className="flex-1 bg-amber-600 hover:bg-amber-700"
        >
          {adopting ? '反映中…' : '採用して反映'}
        </Button>
        <Button
          type="button"
          size="xs"
          variant="ghost"
          disabled={adopting}
          onClick={() => setOpen(false)}
        >
          閉じる
        </Button>
      </div>

      <Button
        type="button"
        size="xs"
        variant="ghost"
        disabled={draftingReflection || loading}
        onClick={draftReflection}
        className="w-full text-indigo-700 hover:text-indigo-900 hover:bg-indigo-50 h-auto py-1"
      >
        {draftingReflection ? (
          <>
            <Loader2 className="w-3 h-3 animate-spin" />
            下書き生成中…
          </>
        ) : (
          <>
            <Sparkles className="w-3 h-3" />
            振り返りの下書き（Check）
          </>
        )}
      </Button>
    </div>
  )
}
