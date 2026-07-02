'use client'

import { useState, useRef } from 'react'
import { api } from '@/lib/api'
import type { Goal, Issue, Task } from '@/lib/types'
import { computeGoalRate, computeIssueRate } from '@/lib/utils'
import AchievementBar from './AchievementBar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Plus, Target, Layers, Calendar, ChevronDown } from 'lucide-react'
import AIBreakdownPanel from './AIBreakdownPanel'
import ItemActionButtons from './ItemActionButtons'

interface Props {
  goals: Goal[]
  issues: Issue[]
  tasks: Task[]
  selectedGoalId: string | null
  selectedIssueId: string | null
  onSelectGoal: (id: string) => void
  onSelectIssue: (id: string) => void
  workspaceId: string
  onRefresh: () => Promise<void>
  readOnly: boolean
}

export default function KGIPane({
  goals, issues, tasks,
  selectedGoalId, selectedIssueId,
  onSelectGoal, onSelectIssue,
  workspaceId, onRefresh, readOnly,
}: Props) {
  const [addingGoal, setAddingGoal] = useState(false)
  const [addingIssueForGoalId, setAddingIssueForGoalId] = useState<string | null>(null)
  const [goalTitle, setGoalTitle] = useState('')
  const [goalDueDate, setGoalDueDate] = useState('')
  const [issueTitle, setIssueTitle] = useState('')
  const [loading, setLoading] = useState(false)
  const [editingGoalId, setEditingGoalId] = useState<string | null>(null)
  const [editingIssueId, setEditingIssueId] = useState<string | null>(null)
  const [editingTitle, setEditingTitle] = useState('')
  const editInputRef = useRef<HTMLInputElement>(null)

  const startEditGoal = (goal: Goal, e: React.MouseEvent) => {
    if (readOnly) return
    e.stopPropagation()
    setEditingGoalId(goal.id)
    setEditingTitle(goal.title)
    setTimeout(() => editInputRef.current?.select(), 0)
  }

  const saveEditGoal = async (id: string) => {
    if (editingTitle.trim()) {
      await api.patch(`/api/goals/${id}`, { title: editingTitle.trim() })
      await onRefresh()
    }
    setEditingGoalId(null)
  }

  const startEditIssue = (issue: Issue, e: React.MouseEvent) => {
    if (readOnly) return
    e.stopPropagation()
    setEditingIssueId(issue.id)
    setEditingTitle(issue.title)
    setTimeout(() => editInputRef.current?.select(), 0)
  }

  const saveEditIssue = async (id: string) => {
    if (editingTitle.trim()) {
      await api.patch(`/api/issues/${id}`, { title: editingTitle.trim() })
      await onRefresh()
    }
    setEditingIssueId(null)
  }

  const handleAddGoal = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!goalTitle.trim()) return
    setLoading(true)
    await api.post('/api/goals', {
      workspace_id: workspaceId,
      title: goalTitle.trim(),
      due_date: goalDueDate || null,
      sort_order: goals.length,
    })
    setGoalTitle(''); setGoalDueDate(''); setAddingGoal(false)
    setLoading(false)
    await onRefresh()
  }

  const handleAddIssue = async (e: React.FormEvent, goalId: string) => {
    e.preventDefault()
    if (!issueTitle.trim()) return
    setLoading(true)
    const goalIssues = issues.filter(i => i.goal_id === goalId)
    await api.post('/api/issues', {
      goal_id: goalId,
      title: issueTitle.trim(),
      sort_order: goalIssues.length,
    })
    setIssueTitle(''); setAddingIssueForGoalId(null)
    setLoading(false)
    await onRefresh()
  }

  const handleDeleteGoal = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    if (!confirm('このKGIを削除しますか？関連するすべての課題・KPI・KDIも削除されます。')) return
    await api.delete(`/api/goals/${id}`)
    await onRefresh()
  }

  const handleDeleteIssue = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    if (!confirm('この課題を削除しますか？')) return
    await api.delete(`/api/issues/${id}`)
    await onRefresh()
  }

  return (
    <div className="flex flex-col h-full w-full min-w-0 bg-background">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-indigo-50 shrink-0">
        <div className="flex items-center gap-2">
          <Target className="w-4 h-4 text-indigo-600" />
          <span className="text-sm font-semibold text-indigo-800">KGI＋課題</span>
        </div>
        {!readOnly && (
          <Button variant="ghost" size="icon-xs" onClick={() => setAddingGoal(true)} className="text-indigo-600 hover:bg-indigo-100">
            <Plus />
          </Button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto pane-scroll p-3 space-y-1">
        {goals.length === 0 && !addingGoal && (
          <p className="text-xs text-muted-foreground text-center py-8">
            {readOnly ? 'KGIがありません' : '「+」からKGIを追加しましょう'}
          </p>
        )}

        {goals.map(goal => {
          const goalIssues = issues.filter(i => i.goal_id === goal.id)
          const rate = computeGoalRate(goalIssues, tasks)
          const isSelected = goal.id === selectedGoalId

          return (
            <div key={goal.id}>
              {/* KGI Card */}
              <div
                onClick={() => onSelectGoal(goal.id)}
                className={`group p-3 rounded-xl cursor-pointer border transition-all ${
                  isSelected
                    ? 'bg-indigo-600 border-indigo-600 shadow-sm'
                    : 'bg-background border-border hover:border-indigo-300 hover:shadow-sm'
                }`}
              >
                <div className="flex items-start justify-between gap-1 mb-1.5">
                  <div className="flex-1 min-w-0">
                    <span className={`text-[10px] font-bold tracking-widest uppercase ${isSelected ? 'text-indigo-200' : 'text-indigo-500'}`}>KGI</span>
                    {editingGoalId === goal.id ? (
                      <input
                        ref={editInputRef}
                        value={editingTitle}
                        onChange={e => setEditingTitle(e.target.value)}
                        onBlur={() => saveEditGoal(goal.id)}
                        onKeyDown={e => {
                          if (e.key === 'Enter') saveEditGoal(goal.id)
                          if (e.key === 'Escape') setEditingGoalId(null)
                        }}
                        onClick={e => e.stopPropagation()}
                        className="mt-0.5 w-full text-sm font-semibold bg-white/20 border border-white/40 rounded px-1.5 py-0.5 text-white outline-none"
                        autoFocus
                      />
                    ) : (
                      <p className={`text-sm font-semibold leading-snug mt-0.5 ${isSelected ? 'text-white' : 'text-foreground'}`}>
                        {goal.title}
                      </p>
                    )}
                  </div>
                  {!readOnly && (
                    <ItemActionButtons
                      tone="indigo"
                      selected={isSelected}
                      onEdit={(e) => startEditGoal(goal, e)}
                      onDelete={(e) => handleDeleteGoal(goal.id, e)}
                    />
                  )}
                </div>
                <AchievementBar rate={rate} size="sm" showLabel />
                {goal.due_date && (
                  <div className={`flex items-center gap-1 mt-1 ${isSelected ? 'text-indigo-200' : 'text-muted-foreground'}`}>
                    <Calendar className="w-3 h-3" /><span className="text-xs">{goal.due_date}</span>
                  </div>
                )}
              </div>

              {/* 課題 list (shown when KGI is selected) */}
              {isSelected && (
                <div className="ml-3 mt-1 space-y-1">
                  {!readOnly && (
                    <AIBreakdownPanel goal={goal} issues={issues} onRefresh={onRefresh} />
                  )}
                  <div className="flex items-center gap-1 px-2 py-1">
                    <Layers className="w-3 h-3 text-indigo-400" />
                    <span className="text-[10px] font-bold tracking-widest uppercase text-indigo-400">課題</span>
                    {!readOnly && (
                      <Button variant="ghost" size="icon-xs"
                        onClick={() => { setAddingIssueForGoalId(goal.id); setIssueTitle('') }}
                        className="ml-auto text-indigo-500 hover:bg-indigo-50 h-5 w-5">
                        <Plus className="w-3 h-3" />
                      </Button>
                    )}
                  </div>

                  {goalIssues.length === 0 && addingIssueForGoalId !== goal.id && (
                    <p className="text-xs text-muted-foreground px-2 pb-2">
                      {readOnly ? '課題がありません' : '「+」から課題を追加'}
                    </p>
                  )}

                  {goalIssues.map(issue => {
                    const issueTasks = tasks.filter(t => t.issue_id === issue.id)
                    const issueRate = computeIssueRate(issueTasks)
                    const isIssueSelected = issue.id === selectedIssueId
                    return (
                      <div
                        key={issue.id}
                        onClick={(e) => { e.stopPropagation(); onSelectIssue(issue.id) }}
                        className={`group flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer border transition-all ${
                          isIssueSelected
                            ? 'bg-indigo-100 border-indigo-300 text-indigo-800'
                            : 'bg-background border-border hover:border-indigo-200'
                        }`}
                      >
                        <ChevronDown className={`w-3 h-3 shrink-0 ${isIssueSelected ? 'text-indigo-500' : 'text-muted-foreground'}`} />
                      <div className="flex-1 min-w-0">
                          {editingIssueId === issue.id ? (
                            <input
                              ref={editInputRef}
                              value={editingTitle}
                              onChange={e => setEditingTitle(e.target.value)}
                              onBlur={() => saveEditIssue(issue.id)}
                              onKeyDown={e => {
                                if (e.key === 'Enter') saveEditIssue(issue.id)
                                if (e.key === 'Escape') setEditingIssueId(null)
                              }}
                              onClick={e => e.stopPropagation()}
                              className="w-full text-xs font-medium bg-white border border-indigo-300 rounded px-1.5 py-0.5 outline-none"
                              autoFocus
                            />
                          ) : (
                            <p className="text-xs font-medium leading-snug truncate">
                              {issue.title}
                            </p>
                          )}
                          <div className="flex items-center gap-1 mt-0.5">
                            <div className="flex-1 h-1 bg-slate-100 rounded-full overflow-hidden">
                              <div className="h-full bg-indigo-400 rounded-full" style={{ width: `${issueRate}%` }} />
                            </div>
                            <span className="text-[10px] text-muted-foreground">{issueRate}%</span>
                          </div>
                        </div>
                        {!readOnly && (
                          <ItemActionButtons
                            tone="indigo"
                            compact
                            onEdit={(e) => startEditIssue(issue, e)}
                            onDelete={(e) => handleDeleteIssue(issue.id, e)}
                          />
                        )}
                      </div>
                    )
                  })}

                  {addingIssueForGoalId === goal.id && (
                    <form onSubmit={(e) => handleAddIssue(e, goal.id)}
                      className="p-2 rounded-lg border border-indigo-200 bg-indigo-50 space-y-1.5 mx-1">
                      <Input autoFocus value={issueTitle} onChange={e => setIssueTitle(e.target.value)}
                        placeholder="課題を入力" className="text-xs h-7 bg-white" />
                      <div className="flex gap-1.5">
                        <Button type="submit" size="xs" disabled={loading} className="flex-1 bg-indigo-600 hover:bg-indigo-700">追加</Button>
                        <Button type="button" variant="outline" size="xs" onClick={() => setAddingIssueForGoalId(null)} className="flex-1">キャンセル</Button>
                      </div>
                    </form>
                  )}
                </div>
              )}
            </div>
          )
        })}

        {/* Add KGI form */}
        {addingGoal && (
          <form onSubmit={handleAddGoal} className="p-3 rounded-xl border border-indigo-200 bg-indigo-50 space-y-2 mt-2">
            <div className="text-[10px] font-bold tracking-widest uppercase text-indigo-500">新しいKGI</div>
            <Input autoFocus value={goalTitle} onChange={e => setGoalTitle(e.target.value)}
              placeholder="最終目標タイトル" className="text-sm bg-background" />
            <Input type="date" value={goalDueDate} onChange={e => setGoalDueDate(e.target.value)}
              className="text-xs bg-background text-muted-foreground" />
            <div className="flex gap-2">
              <Button type="submit" size="sm" disabled={loading} className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-xs">追加</Button>
              <Button type="button" variant="outline" size="sm" onClick={() => { setAddingGoal(false); setGoalTitle('') }} className="flex-1 text-xs">キャンセル</Button>
            </div>
          </form>
        )}
      </div>

      <div className="px-4 py-2 border-t border-border bg-muted/30 shrink-0">
        <p className="text-xs text-muted-foreground">{goals.length} 件のKGI</p>
      </div>
    </div>
  )
}
