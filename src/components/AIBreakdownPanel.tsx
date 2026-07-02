'use client'

import { useState } from 'react'
import { api } from '@/lib/api'
import type { Goal, Issue } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Sparkles, Loader2 } from 'lucide-react'
import AIBreakdownBadge from './AIBreakdownBadge'

interface DraftIssue {
  title: string
  tasks: string[]
}

interface Props {
  goal: Goal
  issues: Issue[]
  onRefresh: () => Promise<void>
}

function allIssueIndices(draft: DraftIssue[]): Set<number> {
  return new Set(draft.map((_, i) => i))
}

export default function AIBreakdownPanel({ goal, issues, onRefresh }: Props) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [adopting, setAdopting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [feedback, setFeedback] = useState('')
  const [draft, setDraft] = useState<DraftIssue[] | null>(null)
  const [selectedIndices, setSelectedIndices] = useState<Set<number>>(() => new Set())

  const existingIssues = issues.filter(i => i.goal_id === goal.id).map(i => i.title)

  const generate = async (withFeedback = false) => {
    setLoading(true)
    setError(null)
    try {
      const result = await api.post('/api/ai/breakdown', {
        goal_title: goal.title,
        due_date: goal.due_date,
        existing_issues: existingIssues,
        feedback: withFeedback ? feedback.trim() : undefined,
      }) as { issues: DraftIssue[] }
      setDraft(result.issues)
      setSelectedIndices(allIssueIndices(result.issues))
      if (!withFeedback) setFeedback('')
    } catch (e) {
      setError(e instanceof Error ? e.message : '生成に失敗しました')
    } finally {
      setLoading(false)
    }
  }

  const handleOpen = () => {
    setOpen(true)
    setDraft(null)
    setSelectedIndices(new Set())
    setError(null)
    setFeedback('')
    generate(false)
  }

  const toggleIssue = (idx: number) => {
    setSelectedIndices(prev => {
      const next = new Set(prev)
      if (next.has(idx)) next.delete(idx)
      else next.add(idx)
      return next
    })
  }

  const handleAdopt = async () => {
    if (!draft) return
    const selectedDraft = draft.filter((_, i) => selectedIndices.has(i))
    if (selectedDraft.length === 0) return

    setAdopting(true)
    setError(null)
    try {
      const baseIssueCount = existingIssues.length
      for (let i = 0; i < selectedDraft.length; i++) {
        const issue = selectedDraft[i]
        const created = await api.post('/api/issues', {
          goal_id: goal.id,
          title: issue.title,
          sort_order: baseIssueCount + i,
          ai_breakdown_added: true,
        }) as Issue
        for (let j = 0; j < issue.tasks.length; j++) {
          await api.post('/api/tasks', {
            issue_id: created.id,
            title: issue.tasks[j],
            sort_order: j,
            ai_breakdown_added: true,
          })
        }
      }
      await onRefresh()
      setOpen(false)
      setDraft(null)
      setSelectedIndices(new Set())
    } catch (e) {
      setError(e instanceof Error ? e.message : '保存に失敗しました')
    } finally {
      setAdopting(false)
    }
  }

  if (!open) {
    return (
      <Button
        type="button"
        variant="outline"
        size="xs"
        onClick={handleOpen}
        className="w-full border-indigo-200 text-indigo-700 hover:bg-indigo-50"
      >
        <Sparkles className="w-3 h-3" />
        AIでKPI/KDIを提案
      </Button>
    )
  }

  return (
    <div className="p-2.5 rounded-lg border border-indigo-200 bg-white space-y-2">
      <div className="flex items-center gap-1.5">
        <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
        <span className="text-xs font-semibold text-indigo-800">AI提案（プレビュー）</span>
      </div>

      {loading && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground py-2">
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
          生成中…
        </div>
      )}

      {error && (
        <p className="text-xs text-red-600 bg-red-50 border border-red-100 rounded px-2 py-1.5">{error}</p>
      )}

      {draft && !loading && (
        <div className="space-y-2 max-h-48 overflow-y-auto pane-scroll">
          <p className="text-[10px] text-muted-foreground">
            追加するKPIを選択（不要なものはチェックを外してください）
          </p>
          {draft.map((issue, idx) => {
            const selected = selectedIndices.has(idx)
            return (
              <label
                key={idx}
                className={`flex gap-2 rounded-md border p-2 cursor-pointer transition-colors ${
                  selected
                    ? 'border-indigo-200 bg-indigo-50/60'
                    : 'border-slate-200 bg-slate-50/40 opacity-75'
                }`}
              >
                <input
                  type="checkbox"
                  checked={selected}
                  onChange={() => toggleIssue(idx)}
                  className="mt-0.5 shrink-0"
                />
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <p className="text-xs font-semibold text-indigo-800">KPI: {issue.title}</p>
                    <AIBreakdownBadge />
                  </div>
                  {issue.tasks.length > 0 && (
                    <ul className="mt-1 space-y-0.5">
                      {issue.tasks.map((task, ti) => (
                        <li key={ti} className="text-[11px] text-slate-600 pl-2">・{task}</li>
                      ))}
                    </ul>
                  )}
                </div>
              </label>
            )
          })}
        </div>
      )}

      <Textarea
        value={feedback}
        onChange={e => setFeedback(e.target.value)}
        placeholder="修正指示（例：もっと具体的に、KDIを増やして）"
        className="text-xs min-h-[52px] bg-white"
        rows={2}
      />

      <div className="flex flex-wrap gap-1.5">
        <Button
          type="button"
          size="xs"
          variant="outline"
          disabled={loading || adopting}
          onClick={() => generate(true)}
          className="flex-1"
        >
          再生成
        </Button>
        <Button
          type="button"
          size="xs"
          disabled={!draft || loading || adopting || selectedIndices.size === 0}
          onClick={handleAdopt}
          className="flex-1 bg-indigo-600 hover:bg-indigo-700"
        >
          {adopting
            ? '保存中…'
            : draft
              ? `採用して追加 (${selectedIndices.size}件)`
              : '採用して追加'}
        </Button>
        <Button
          type="button"
          size="xs"
          variant="ghost"
          disabled={adopting}
          onClick={() => {
            setOpen(false)
            setDraft(null)
            setSelectedIndices(new Set())
            setError(null)
          }}
        >
          閉じる
        </Button>
      </div>
    </div>
  )
}
