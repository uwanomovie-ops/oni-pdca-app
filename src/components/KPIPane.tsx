'use client'

import { useState, useRef } from 'react'
import { api } from '@/lib/api'
import type { Goal, Issue, Task } from '@/lib/types'
import { computeIssueRate, getWorstDueHealth, dueHealthCardClass, cn } from '@/lib/utils'
import AchievementBar from './AchievementBar'
import DueHealthBadge from './DueHealthBadge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Plus, Layers } from 'lucide-react'
import ItemActionButtons from './ItemActionButtons'

interface Props {
  issues: Issue[]
  tasks: Task[]
  selectedGoal: Goal | null
  selectedIssueId: string | null
  onSelect: (id: string) => void
  onRefresh: () => Promise<void>
  readOnly: boolean
}

export default function KPIPane({
  issues, tasks, selectedGoal, selectedIssueId, onSelect, onRefresh, readOnly,
}: Props) {
  const [adding, setAdding] = useState(false)
  const [title, setTitle] = useState('')
  const [loading, setLoading] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingTitle, setEditingTitle] = useState('')
  const editInputRef = useRef<HTMLInputElement>(null)

  const startEdit = (issue: Issue, e: React.MouseEvent) => {
    if (readOnly) return
    e.stopPropagation()
    setEditingId(issue.id)
    setEditingTitle(issue.title)
    setTimeout(() => editInputRef.current?.select(), 0)
  }

  const saveEdit = async (id: string) => {
    if (editingTitle.trim()) {
      await api.patch(`/api/issues/${id}`, { title: editingTitle.trim() })
      await onRefresh()
    }
    setEditingId(null)
  }

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim() || !selectedGoal) return
    setLoading(true)
    await api.post('/api/issues', {
      goal_id: selectedGoal.id,
      title: title.trim(),
      sort_order: issues.length,
    })
    setTitle('')
    setAdding(false)
    setLoading(false)
    await onRefresh()
  }

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    if (!confirm('この課題を削除しますか？関連するタスクもすべて削除されます。')) return
    await api.delete(`/api/issues/${id}`)
    await onRefresh()
  }

  return (
    <div className="flex flex-col h-full w-full min-w-0 bg-background">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-blue-50 shrink-0">
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-blue-600" />
          <span className="text-sm font-semibold text-blue-800">KPI</span>
        </div>
        {!readOnly && selectedGoal && (
          <Button
            variant="ghost"
            size="icon-xs"
            onClick={() => setAdding(true)}
            className="text-blue-600 hover:bg-blue-100"
          >
            <Plus />
          </Button>
        )}
      </div>

      {/* Context */}
      {selectedGoal && (
        <div className="px-4 py-2 border-b border-border bg-muted/30 shrink-0">
          <p className="text-xs text-muted-foreground truncate">▶ {selectedGoal.title}</p>
        </div>
      )}

      {/* List */}
      <div className="flex-1 overflow-y-auto pane-scroll p-3 space-y-2">
        {!selectedGoal && (
          <p className="text-xs text-muted-foreground text-center py-8">← 目標を選択してください</p>
        )}
        {selectedGoal && issues.length === 0 && !adding && (
          <p className="text-xs text-muted-foreground text-center py-8">
            {readOnly ? 'KPIがありません' : '「+」からKPIを追加しましょう'}
          </p>
        )}

        {issues.map(issue => {
          const issueTasks = tasks.filter(t => t.issue_id === issue.id)
          const rate = computeIssueRate(issueTasks)
          const isSelected = issue.id === selectedIssueId
          const worstHealth = getWorstDueHealth(issueTasks)
          return (
            <div
              key={issue.id}
              onClick={() => onSelect(issue.id)}
              className={cn(
                'group p-3 rounded-xl cursor-pointer border transition-all',
                isSelected
                  ? 'bg-blue-600 border-blue-600 shadow-sm'
                  : 'bg-background border-border hover:border-blue-300 hover:shadow-sm',
                dueHealthCardClass(worstHealth)
              )}
            >
              <div className="flex items-start justify-between gap-1 mb-2">
                {editingId === issue.id ? (
                  <input
                    ref={editInputRef}
                    value={editingTitle}
                    onChange={e => setEditingTitle(e.target.value)}
                    onBlur={() => saveEdit(issue.id)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') saveEdit(issue.id)
                      if (e.key === 'Escape') setEditingId(null)
                    }}
                    onClick={e => e.stopPropagation()}
                    className={cn(
                      'flex-1 text-sm font-medium rounded px-1.5 py-0.5 outline-none',
                      isSelected
                        ? 'bg-white/20 border border-white/40 text-white'
                        : 'bg-white border border-blue-300 text-foreground',
                    )}
                    autoFocus
                  />
                ) : (
                  <p className={`text-sm font-medium leading-snug ${isSelected ? 'text-white' : 'text-foreground'}`}>
                    {issue.title}
                  </p>
                )}
                {!readOnly && (
                  <ItemActionButtons
                    tone="blue"
                    selected={isSelected}
                    onEdit={(e) => startEdit(issue, e)}
                    onDelete={(e) => handleDelete(issue.id, e)}
                  />
                )}
              </div>
              {worstHealth !== 'normal' && (
                <div className="mb-2">
                  <DueHealthBadge health={worstHealth} />
                </div>
              )}
              <AchievementBar rate={rate} size="sm" showLabel={true} />
              <p className={`text-xs mt-1 ${isSelected ? 'text-blue-200' : 'text-muted-foreground'}`}>
                {issueTasks.length} タスク
              </p>
            </div>
          )
        })}

        {adding && (
          <form onSubmit={handleAdd} className="p-3 rounded-xl border border-blue-200 bg-blue-50 space-y-2">
            <Input
              autoFocus
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="KPIタイトル（計測指標）"
              className="text-sm bg-background"
            />
            <div className="flex gap-2">
              <Button
                type="submit"
                size="sm"
                disabled={loading}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-xs"
              >
                追加
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => { setAdding(false); setTitle('') }}
                className="flex-1 text-xs"
              >
                キャンセル
              </Button>
            </div>
          </form>
        )}
      </div>

      <div className="px-4 py-2 border-t border-border bg-muted/30 shrink-0">
        <p className="text-xs text-muted-foreground">{issues.length} 件のKPI</p>
      </div>
    </div>
  )
}
