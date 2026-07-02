'use client'

import { useState, useEffect } from 'react'
import { api } from '@/lib/api'
import type { Workspace, Goal, Issue, Task, Review, ActionItem } from '@/lib/types'
import { getWeekStart, formatWeekLabel, shiftWeekStart } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import AICoachPanel from '@/components/AICoachPanel'
import { ClipboardList, Plus, ChevronLeft, ChevronRight, Check } from 'lucide-react'

interface Props {
  workspace: Workspace
  selectedGoal: Goal | null
  selectedIssue: Issue | null
  issues: Issue[]
  tasks: Task[]
  reviews: Review[]
  actionItems: ActionItem[]
  onRefresh: () => Promise<void>
  onSelectIssue?: (issueId: string) => void
  readOnly: boolean
  hideCoach?: boolean
}

export default function ReviewPane({
  workspace,
  selectedGoal,
  selectedIssue,
  issues,
  tasks,
  reviews,
  actionItems,
  onRefresh,
  onSelectIssue,
  readOnly,
  hideCoach = false,
}: Props) {
  const [weekStart, setWeekStart] = useState(getWeekStart())
  const [reflection, setReflection] = useState('')
  const [savingReflection, setSavingReflection] = useState(false)
  const [newAdjust, setNewAdjust] = useState('')
  const [addingAdjust, setAddingAdjust] = useState(false)

  const currentReview = reviews.find(
    r => r.goal_id === (selectedGoal?.id ?? null) && r.week_start === weekStart
  ) ?? null

  useEffect(() => {
    setReflection(currentReview?.reflection ?? '')
  }, [currentReview?.id, weekStart, selectedGoal?.id])

  const currentAdjustItems = currentReview
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

  const handleAddAdjust = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newAdjust.trim()) return
    setAddingAdjust(true)
    const reviewId = await ensureReview()
    await api.post('/api/action-items', {
      review_id: reviewId,
      title: newAdjust.trim(),
      sort_order: currentAdjustItems.length,
    })
    setNewAdjust('')
    setAddingAdjust(false)
    await onRefresh()
  }

  const handleToggleAdjust = async (item: ActionItem) => {
    await api.patch(`/api/action-items/${item.id}`, { is_done: !item.is_done })
    await onRefresh()
  }

  const handleDeleteAdjust = async (id: string) => {
    await api.delete(`/api/action-items/${id}`)
    await onRefresh()
  }

  const shiftWeek = (delta: number) => {
    setWeekStart(shiftWeekStart(weekStart, delta))
  }

  return (
    <div className="flex flex-col h-full w-full min-w-0 bg-background">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-amber-50 shrink-0">
        <div className="flex items-center gap-2">
          <ClipboardList className="w-4 h-4 text-amber-600" />
          <span className="text-sm font-semibold text-amber-800">Check / Adjust</span>
        </div>
      </div>

      {selectedGoal && (
        <div className="px-4 py-2 border-b border-border bg-muted/30 shrink-0 space-y-1">
          <p className="text-xs text-muted-foreground truncate">▶ {selectedGoal.title}</p>
          <p className="text-[10px] text-amber-700/80">
            AIコーチは KGI 全体（全KPI・KDI）をレビューします
            {selectedIssue ? ` — 課題「${selectedIssue.title.length > 14 ? selectedIssue.title.slice(0, 14) + '…' : selectedIssue.title}」選択中` : ''}
          </p>
        </div>
      )}

      <div className="flex items-center justify-between px-3 py-2 border-b border-border shrink-0">
        <Button variant="ghost" size="icon-xs" onClick={() => shiftWeek(-1)}>
          <ChevronLeft />
        </Button>
        <span className="text-xs font-medium text-foreground">
          {formatWeekLabel(weekStart)}
          <span className="text-muted-foreground font-normal ml-1">（日〜土）</span>
        </span>
        <Button variant="ghost" size="icon-xs" onClick={() => shiftWeek(1)}>
          <ChevronRight />
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto pane-scroll p-4 space-y-5">
        {!selectedGoal && (
          <p className="text-xs text-muted-foreground text-center py-8">← 目標を選択してください</p>
        )}

        {selectedGoal && (
          <>
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

            {!readOnly && !hideCoach && (
              <AICoachPanel
                goal={selectedGoal}
                issues={issues}
                tasks={tasks}
                reviews={reviews}
                actionItems={actionItems}
                weekStart={weekStart}
                reflection={reflection}
                currentReview={currentReview}
                ensureReview={ensureReview}
                onRefresh={onRefresh}
                onSelectIssue={onSelectIssue}
                onReflectionChange={setReflection}
              />
            )}

            <div>
              <h3 className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide">
                手動 Adjust
              </h3>
              <div className="space-y-2">
                {currentAdjustItems.length === 0 && (
                  <p className="text-xs text-muted-foreground">
                    {readOnly ? 'アイテムなし' : '来週に向けた Adjust を追加しましょう'}
                  </p>
                )}
                {currentAdjustItems.map(item => (
                  <div key={item.id} className="flex items-center gap-2 group">
                    <button
                      onClick={() => !readOnly && handleToggleAdjust(item)}
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
                        onClick={() => handleDeleteAdjust(item.id)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity text-red-400 hover:text-red-600 hover:bg-red-50"
                      >
                        <span className="text-xs">✕</span>
                      </Button>
                    )}
                  </div>
                ))}

                {!readOnly && (
                  <form onSubmit={handleAddAdjust} className="flex gap-2 mt-2">
                    <Input
                      value={newAdjust}
                      onChange={e => setNewAdjust(e.target.value)}
                      placeholder="新しい Adjust を追加..."
                      className="flex-1 text-sm"
                    />
                    <Button
                      type="submit"
                      size="icon"
                      disabled={addingAdjust || !newAdjust.trim()}
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
          {currentAdjustItems.filter(a => a.is_done).length} / {currentAdjustItems.length} 完了
        </p>
      </div>
    </div>
  )
}
