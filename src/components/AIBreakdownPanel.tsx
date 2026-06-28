'use client'

import { useState } from 'react'
import { api } from '@/lib/api'
import type { Goal, Issue } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Sparkles, Loader2 } from 'lucide-react'

interface DraftIssue {
  title: string
  tasks: string[]
}

interface Props {
  goal: Goal
  issues: Issue[]
  onRefresh: () => Promise<void>
}

export default function AIBreakdownPanel({ goal, issues, onRefresh }: Props) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [adopting, setAdopting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [feedback, setFeedback] = useState('')
  const [draft, setDraft] = useState<DraftIssue[] | null>(null)

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
    setError(null)
    setFeedback('')
    generate(false)
  }

  const handleAdopt = async () => {
    if (!draft) return
    setAdopting(true)
    setError(null)
    try {
      const baseIssueCount = existingIssues.length
      for (let i = 0; i < draft.length; i++) {
        const issue = draft[i]
        const created = await api.post('/api/issues', {
          goal_id: goal.id,
          title: issue.title,
          sort_order: baseIssueCount + i,
        }) as Issue
        for (let j = 0; j < issue.tasks.length; j++) {
          await api.post('/api/tasks', {
            issue_id: created.id,
            title: issue.tasks[j],
            sort_order: j,
          })
        }
      }
      setOpen(false)
      setDraft(null)
      await onRefresh()
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
        className="w-full mt-2 border-indigo-200 text-indigo-700 hover:bg-indigo-50"
      >
        <Sparkles className="w-3 h-3" />
        AIでKPI/KDIを提案
      </Button>
    )
  }

  return (
    <div className="mt-2 mx-1 p-2.5 rounded-lg border border-indigo-200 bg-white space-y-2">
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
          {draft.map((issue, idx) => (
            <div key={idx} className="rounded-md border border-slate-200 p-2 bg-slate-50">
              <p className="text-xs font-semibold text-indigo-800">課題: {issue.title}</p>
              <ul className="mt-1 space-y-0.5">
                {issue.tasks.map((task, ti) => (
                  <li key={ti} className="text-[11px] text-slate-600 pl-2">・{task}</li>
                ))}
              </ul>
            </div>
          ))}
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
          disabled={!draft || loading || adopting}
          onClick={handleAdopt}
          className="flex-1 bg-indigo-600 hover:bg-indigo-700"
        >
          {adopting ? '保存中…' : '採用して追加'}
        </Button>
        <Button
          type="button"
          size="xs"
          variant="ghost"
          disabled={adopting}
          onClick={() => { setOpen(false); setDraft(null); setError(null) }}
        >
          閉じる
        </Button>
      </div>
    </div>
  )
}
