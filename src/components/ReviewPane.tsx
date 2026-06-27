'use client'

import { useState, useEffect } from 'react'
import { api } from '@/lib/api'
import type { Workspace, Goal, Review, ActionItem } from '@/lib/types'
import { getWeekStart, formatWeekLabel } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { ClipboardList, Plus, ChevronLeft, ChevronRight, Check } from 'lucide-react'

interface Props {
  workspace: Workspace
  selectedGoal: Goal | null
  reviews: Review[]
  actionItems: ActionItem[]
  onRefresh: () => Promise<void>
  readOnly: boolean
}

export default function ReviewPane({
  workspace, selectedGoal, reviews, actionItems, onRefresh, readOnly,
}: Props) {
  const [weekStart, setWeekStart] = useState(getWeekStart())
  const [reflection, setReflection] = useState('')
  const [savingReflection, setSavingReflection] = useState(false)
  const [newAction, setNewAction] = useState('')
  const [addingAction, setAddingAction] = useState(false)

  const currentReview = reviews.find(
    r => r.goal_id === (selectedGoal?.id ?? null) && r.week_start === weekStart
  ) ?? null

  useEffect(() => {
    setReflection(currentReview?.reflection ?? '')
  }, [currentReview?.id, weekStart, selectedGoal?.id])

  const currentActionItems = currentReview
    ? actionItems.filter(a => a.review_id === currentReview.id)
    : []

  const ensureReview = async (): Promise<string> => {
    if (currentReview) return currentReview.id
    const data = await api.post('/api/reviews', {
      workspace_id: workspace.id,
      goal_id: selectedGoal?.id ?? null,
      week_start: weekStart,
      reflection: '',
    })
    await onRefresh()
    return data.id
  }

  const handleSaveReflection = async () => {
    setSavingReflection(true)
    const reviewId = await ensureReview()
    await api.patch(`/api/reviews/${reviewId}`, { reflection })
    setSavingReflection(false)
    await onRefresh()
  }

  const handleAddAction = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newAction.trim()) return
    setAddingAction(true)
    const reviewId = await ensureReview()
    await api.post('/api/action-items', {
      review_id: reviewId,
      title: newAction.trim(),
      sort_order: currentActionItems.length,
    })
    setNewAction('')
    setAddingAction(false)
    await onRefresh()
  }

  const handleToggleAction = async (item: ActionItem) => {
    await api.patch(`/api/action-items/${item.id}`, { is_done: !item.is_done })
    await onRefresh()
  }

  const handleDeleteAction = async (id: string) => {
    await api.delete(`/api/action-items/${id}`)
    await onRefresh()
  }

  const shiftWeek = (delta: number) => {
    const d = new Date(weekStart + 'T00:00:00')
    d.setDate(d.getDate() + delta * 7)
    setWeekStart(d.toISOString().split('T')[0])
  }

  return (
    <div className="flex flex-col w-1/4 min-w-0 bg-background">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-amber-50 shrink-0">
        <div className="flex items-center gap-2">
          <ClipboardList className="w-4 h-4 text-amber-600" />
          <span className="text-sm font-semibold text-amber-800">Check / Action</span>
        </div>
      </div>

      {/* Context */}
      {selectedGoal && (
        <div className="px-4 py-2 border-b border-border bg-muted/30 shrink-0">
          <p className="text-xs text-muted-foreground truncate">▶ {selectedGoal.title}</p>
        </div>
      )}

      {/* Week navigation */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-border shrink-0">
        <Button variant="ghost" size="icon-xs" onClick={() => shiftWeek(-1)}>
          <ChevronLeft />
        </Button>
        <span className="text-xs font-medium text-foreground">{formatWeekLabel(weekStart)}</span>
        <Button variant="ghost" size="icon-xs" onClick={() => shiftWeek(1)}>
          <ChevronRight />
        </Button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto pane-scroll p-4 space-y-5">
        {!selectedGoal && (
          <p className="text-xs text-muted-foreground text-center py-8">← 目標を選択してください</p>
        )}

        {selectedGoal && (
          <>
            {/* Reflection */}
            <div>
              <h3 className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide">
                振り返り（Check）
              </h3>
              {readOnly ? (
                <div className="text-sm text-foreground whitespace-pre-wrap min-h-[80px] bg-muted/30 rounded-xl p-3">
                  {reflection || <span className="text-muted-foreground">記入なし</span>}
                </div>
              ) : (
                <div className="space-y-2">
                  <Textarea
                    value={reflection}
                    onChange={e => setReflection(e.target.value)}
                    onBlur={handleSaveReflection}
                    placeholder="今週の振り返りを書く..."
                    rows={4}
                    className="resize-none bg-amber-50/50 border-border focus:border-amber-400 placeholder:text-muted-foreground"
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleSaveReflection}
                    disabled={savingReflection}
                    className="text-xs text-amber-700 hover:text-amber-900 h-auto py-0.5"
                  >
                    {savingReflection ? '保存中...' : '保存'}
                  </Button>
                </div>
              )}
            </div>

            {/* Action Items */}
            <div>
              <h3 className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide">
                Actionアイテム
              </h3>
              <div className="space-y-2">
                {currentActionItems.length === 0 && (
                  <p className="text-xs text-muted-foreground">
                    {readOnly ? 'アイテムなし' : 'Actionアイテムを追加しましょう'}
                  </p>
                )}
                {currentActionItems.map(item => (
                  <div key={item.id} className="flex items-center gap-2 group">
                    <button
                      onClick={() => !readOnly && handleToggleAction(item)}
                      disabled={readOnly}
                      className={`w-5 h-5 rounded-md border-2 shrink-0 flex items-center justify-center transition-colors ${
                        item.is_done
                          ? 'bg-amber-500 border-amber-500'
                          : 'border-border hover:border-amber-400'
                      } ${readOnly ? 'cursor-default' : 'cursor-pointer'}`}
                    >
                      {item.is_done && <Check className="w-3 h-3 text-white" strokeWidth={3} />}
                    </button>
                    <span className={`text-sm flex-1 ${item.is_done ? 'line-through text-muted-foreground' : 'text-foreground'}`}>
                      {item.title}
                    </span>
                    {!readOnly && (
                      <Button
                        variant="ghost"
                        size="icon-xs"
                        onClick={() => handleDeleteAction(item.id)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity text-red-400 hover:text-red-600 hover:bg-red-50"
                      >
                        <span className="text-xs">✕</span>
                      </Button>
                    )}
                  </div>
                ))}

                {!readOnly && (
                  <form onSubmit={handleAddAction} className="flex gap-2 mt-2">
                    <Input
                      value={newAction}
                      onChange={e => setNewAction(e.target.value)}
                      placeholder="新しいActionを追加..."
                      className="flex-1 text-sm"
                    />
                    <Button
                      type="submit"
                      size="icon"
                      disabled={addingAction || !newAction.trim()}
                      className="bg-amber-500 hover:bg-amber-600 shrink-0"
                    >
                      <Plus />
                    </Button>
                  </form>
                )}
              </div>
            </div>
          </>
        )}
      </div>

      <div className="px-4 py-2 border-t border-border bg-muted/30 shrink-0">
        <p className="text-xs text-muted-foreground">
          {currentActionItems.filter(a => a.is_done).length} / {currentActionItems.length} 完了
        </p>
      </div>
    </div>
  )
}
