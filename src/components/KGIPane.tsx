'use client'

import { useCallback, useMemo, useState, useRef } from 'react'
import { api } from '@/lib/api'
import type { Goal, Issue, Task } from '@/lib/types'
import { computeGoalRate } from '@/lib/utils'
import { useDragReorder } from '@/hooks/useDragReorder'
import { persistGoalOrder } from '@/lib/persist-order'
import AchievementBar from './AchievementBar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Plus, Target, Calendar, GripVertical } from 'lucide-react'
import ItemActionButtons from './ItemActionButtons'

interface Props {
  goals: Goal[]
  issues: Issue[]
  tasks: Task[]
  selectedGoalId: string | null
  onSelectGoal: (id: string) => void
  workspaceId: string
  onRefresh: () => Promise<void>
  readOnly: boolean
}

export default function KGIPane({
  goals, issues, tasks,
  selectedGoalId,
  onSelectGoal,
  workspaceId, onRefresh, readOnly,
}: Props) {
  const [addingGoal, setAddingGoal] = useState(false)
  const [goalTitle, setGoalTitle] = useState('')
  const [goalDueDate, setGoalDueDate] = useState('')
  const [loading, setLoading] = useState(false)
  const [editingGoalId, setEditingGoalId] = useState<string | null>(null)
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

  const handleDeleteGoal = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    if (!confirm('このKGIを削除しますか？関連するすべてのKPI・KDIも削除されます。')) return
    await api.delete(`/api/goals/${id}`)
    await onRefresh()
  }

  const sortedGoals = useMemo(
    () => [...goals].sort((a, b) => a.sort_order - b.sort_order),
    [goals],
  )

  const persistGoalOrderAndRefresh = useCallback(async (ordered: Goal[]) => {
    await persistGoalOrder(ordered)
    await onRefresh()
  }, [onRefresh])

  const {
    orderedItems: orderedGoals,
    dragIndex: goalDragIndex,
    overIndex: goalOverIndex,
    getItemDragProps: getGoalDragProps,
    getHandleProps: getGoalHandleProps,
  } = useDragReorder(sortedGoals, persistGoalOrderAndRefresh, readOnly)

  return (
    <div className="flex flex-col h-full w-full min-w-0 bg-background">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-indigo-50 shrink-0">
        <div className="flex items-center gap-2">
          <Target className="w-4 h-4 text-indigo-600" />
          <span className="text-sm font-semibold text-indigo-800">KGI</span>
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

        {orderedGoals.map((goal, goalIndex) => {
          const goalIssues = issues.filter(i => i.goal_id === goal.id)
          const rate = computeGoalRate(goalIssues, tasks)
          const isSelected = goal.id === selectedGoalId
          const isDragging = goalDragIndex === goalIndex
          const isDropTarget = goalOverIndex === goalIndex && goalDragIndex !== null && goalDragIndex !== goalIndex

          return (
            <div
              key={goal.id}
              {...getGoalDragProps(goalIndex)}
              className={isDragging ? 'opacity-40' : isDropTarget ? 'rounded-xl ring-2 ring-indigo-300' : ''}
            >
              <div
                onClick={() => onSelectGoal(goal.id)}
                className={`group p-3 rounded-xl cursor-pointer border transition-all ${
                  isSelected
                    ? 'bg-indigo-600 border-indigo-600 shadow-sm'
                    : 'bg-background border-border hover:border-indigo-300 hover:shadow-sm'
                }`}
              >
                <div className="flex items-start gap-2 mb-1.5">
                  {!readOnly && (
                    <div
                      {...getGoalHandleProps(goalIndex)}
                      aria-label="並び替え"
                      onClick={(e) => e.stopPropagation()}
                      className={`mt-0.5 shrink-0 cursor-grab active:cursor-grabbing touch-none transition-opacity opacity-0 group-hover:opacity-100 ${
                        isSelected ? 'text-indigo-200 hover:text-white' : 'text-muted-foreground hover:text-indigo-600'
                      }`}
                    >
                      <GripVertical className="w-4 h-4" />
                    </div>
                  )}
                  <div className="flex items-start justify-between gap-1 flex-1 min-w-0">
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
                </div>
                <AchievementBar rate={rate} size="sm" showLabel />
                {goal.due_date && (
                  <div className={`flex items-center gap-1 mt-1 ${isSelected ? 'text-indigo-200' : 'text-muted-foreground'}`}>
                    <Calendar className="w-3 h-3" /><span className="text-xs">{goal.due_date}</span>
                  </div>
                )}
              </div>
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
