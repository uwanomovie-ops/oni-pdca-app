'use client'

import { useCallback, useState, useRef } from 'react'
import { api } from '@/lib/api'
import type { Issue, Task, Status } from '@/lib/types'
import { getDueHealth, dueHealthCardClass, cn } from '@/lib/utils'
import { useDragReorder } from '@/hooks/useDragReorder'
import AchievementBar from './AchievementBar'
import StatusSelect from './StatusSelect'
import DueHealthBadge from './DueHealthBadge'
import AICoachKdiBadge from './AICoachKdiBadge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Slider } from '@/components/ui/slider'
import { Plus, CheckSquare, Calendar, GripVertical } from 'lucide-react'
import ItemActionButtons from './ItemActionButtons'

interface Props {
  tasks: Task[]
  selectedIssue: Issue | null
  onRefresh: () => Promise<void>
  readOnly: boolean
}

export default function KDIPane({ tasks, selectedIssue, onRefresh, readOnly }: Props) {
  const [adding, setAdding] = useState(false)
  const [title, setTitle] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [loading, setLoading] = useState(false)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingTitle, setEditingTitle] = useState('')
  const editInputRef = useRef<HTMLInputElement>(null)

  const startEdit = (task: Task, e: React.MouseEvent) => {
    if (readOnly) return
    e.stopPropagation()
    setEditingId(task.id)
    setEditingTitle(task.title)
    setTimeout(() => editInputRef.current?.select(), 0)
  }

  const saveEdit = async (id: string) => {
    if (editingTitle.trim()) {
      await api.patch(`/api/tasks/${id}`, { title: editingTitle.trim() })
      await onRefresh()
    }
    setEditingId(null)
  }

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim() || !selectedIssue) return
    setLoading(true)
    await api.post('/api/tasks', {
      issue_id: selectedIssue.id,
      title: title.trim(),
      due_date: dueDate || null,
      sort_order: tasks.length,
    })
    setTitle('')
    setDueDate('')
    setAdding(false)
    setLoading(false)
    await onRefresh()
  }

  const handleStatusChange = async (task: Task, newStatus: Status) => {
    if (newStatus === task.status) return
    const update: Partial<Task> = { status: newStatus }
    if (newStatus === 'done') update.achievement_rate = 100
    if (newStatus === 'todo') update.achievement_rate = 0
    await api.patch(`/api/tasks/${task.id}`, update)
    await onRefresh()
  }

  const handleRateChange = async (task: Task, rate: number) => {
    const update: Partial<Task> = { achievement_rate: rate }
    if (rate === 100) update.status = 'done'
    else if (rate > 0 && task.status === 'todo') update.status = 'in_progress'
    else if (rate === 0) update.status = 'todo'
    await api.patch(`/api/tasks/${task.id}`, update)
    await onRefresh()
  }

  const handleDueDateChange = async (taskId: string, value: string) => {
    await api.patch(`/api/tasks/${taskId}`, { due_date: value || null })
    await onRefresh()
  }

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    if (!confirm('このタスクを削除しますか？')) return
    await api.delete(`/api/tasks/${id}`)
    await onRefresh()
  }

  const persistTaskOrder = useCallback(async (ordered: Task[]) => {
    await Promise.all(
      ordered.map((task, index) =>
        task.sort_order === index
          ? Promise.resolve()
          : api.patch(`/api/tasks/${task.id}`, { sort_order: index }),
      ),
    )
    await onRefresh()
  }, [onRefresh])

  const {
    orderedItems: orderedTasks,
    dragIndex,
    overIndex,
    getItemDragProps,
    getHandleProps,
  } = useDragReorder(tasks, persistTaskOrder, readOnly)

  return (
    <div className="flex flex-col h-full w-full min-w-0 bg-background">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-emerald-50 shrink-0">
        <div className="flex items-center gap-2">
          <CheckSquare className="w-4 h-4 text-emerald-600" />
          <span className="text-sm font-semibold text-emerald-800">KDI｜行動指標</span>
        </div>
        {!readOnly && selectedIssue && (
          <Button
            variant="ghost"
            size="icon-xs"
            onClick={() => setAdding(true)}
            className="text-emerald-600 hover:bg-emerald-100"
          >
            <Plus />
          </Button>
        )}
      </div>

      {/* Context */}
      {selectedIssue && (
        <div className="px-4 py-2 border-b border-border bg-muted/30 shrink-0">
          <p className="text-xs text-muted-foreground truncate">▶ {selectedIssue.title}</p>
        </div>
      )}

      {/* List */}
      <div className="flex-1 overflow-y-auto pane-scroll p-3 space-y-2">
        {!selectedIssue && (
          <p className="text-xs text-muted-foreground text-center py-8">← 課題を選択してください</p>
        )}
        {selectedIssue && tasks.length === 0 && !adding && (
          <p className="text-xs text-muted-foreground text-center py-8">
            {readOnly ? 'KDIがありません' : '「+」からKDIを追加しましょう'}
          </p>
        )}

        {orderedTasks.map((task, index) => {
          const isExpanded = expandedId === task.id
          const dueHealth = getDueHealth(task)
          const isDragging = dragIndex === index
          const isDropTarget = overIndex === index && dragIndex !== null && dragIndex !== index
          return (
            <div
              key={task.id}
              {...getItemDragProps(index)}
              className={cn(
                'group p-3 rounded-xl border border-border bg-background hover:border-emerald-200 hover:shadow-sm transition-all',
                dueHealthCardClass(dueHealth),
                isDragging && 'opacity-40',
                isDropTarget && 'border-emerald-400 ring-2 ring-emerald-200',
              )}
            >
              <div className="flex items-start gap-2">
                {!readOnly && (
                  <div
                    {...getHandleProps(index)}
                    aria-label="並び替え"
                    className="mt-0.5 shrink-0 cursor-grab active:cursor-grabbing text-muted-foreground opacity-0 group-hover:opacity-100 hover:text-emerald-600 transition-opacity touch-none"
                  >
                    <GripVertical className="w-4 h-4" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-1">
                    {editingId === task.id ? (
                      <input
                        ref={editInputRef}
                        value={editingTitle}
                        onChange={e => setEditingTitle(e.target.value)}
                        onBlur={() => saveEdit(task.id)}
                        onKeyDown={e => {
                          if (e.key === 'Enter') saveEdit(task.id)
                          if (e.key === 'Escape') setEditingId(null)
                        }}
                        className="flex-1 text-sm font-medium bg-white border border-emerald-300 rounded px-1.5 py-0.5 outline-none"
                        autoFocus
                      />
                    ) : (
                      <p
                        className="text-sm font-medium text-foreground leading-snug cursor-pointer"
                        onClick={() => !readOnly && setExpandedId(isExpanded ? null : task.id)}
                      >
                        {task.title}
                      </p>
                    )}
                    {!readOnly && (
                      <ItemActionButtons
                        tone="emerald"
                        onEdit={(e) => startEdit(task, e)}
                        onDelete={(e) => handleDelete(task.id, e)}
                      />
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                    <StatusSelect
                      status={task.status as Status}
                      readOnly={readOnly}
                      onChange={readOnly ? undefined : (s) => handleStatusChange(task, s)}
                    />
                    {task.ai_coach_added === true && <AICoachKdiBadge />}
                    <DueHealthBadge health={dueHealth} />
                    {readOnly ? (
                      task.due_date && (
                        <span className="flex items-center gap-0.5 text-xs text-muted-foreground">
                          <Calendar className="w-3 h-3" />
                          {task.due_date}
                        </span>
                      )
                    ) : (
                      <div className="flex items-center gap-1 min-w-0">
                        <Calendar className="w-3 h-3 text-muted-foreground shrink-0" />
                        <Input
                          type="date"
                          value={task.due_date ?? ''}
                          onChange={e => handleDueDateChange(task.id, e.target.value)}
                          className="h-7 w-[8.5rem] text-xs bg-background text-muted-foreground px-1.5"
                          aria-label="期限日"
                        />
                      </div>
                    )}
                  </div>
                  <div className="mt-2">
                    <AchievementBar rate={task.achievement_rate} size="sm" />
                  </div>
                </div>
              </div>

              {/* Expanded rate editor */}
              {isExpanded && !readOnly && (
                <div className="mt-3 pt-3 border-t border-border">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-xs text-muted-foreground w-12 shrink-0">達成率</span>
                    <Slider
                      value={[task.achievement_rate]}
                      min={0}
                      max={100}
                      step={5}
                      onValueChange={(vals) => handleRateChange(task, Array.isArray(vals) ? vals[0] : vals)}
                      className="flex-1"
                    />
                    <span className="text-xs font-medium text-foreground w-8 text-right">{task.achievement_rate}%</span>
                  </div>
                  <div className="flex gap-1.5">
                    {([0, 25, 50, 75, 100] as const).map(v => (
                      <Button
                        key={v}
                        size="xs"
                        variant={task.achievement_rate === v ? 'default' : 'outline'}
                        onClick={() => handleRateChange(task, v)}
                        className="flex-1 text-xs"
                      >
                        {v}%
                      </Button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )
        })}

        {adding && (
          <form onSubmit={handleAdd} className="p-3 rounded-xl border border-emerald-200 bg-emerald-50 space-y-2">
            <Input
              autoFocus
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="KDIタイトル（具体的な行動）"
              className="text-sm bg-background"
            />
            <Input
              type="date"
              value={dueDate}
              onChange={e => setDueDate(e.target.value)}
              className="text-xs bg-background text-muted-foreground"
            />
            <div className="flex gap-2">
              <Button
                type="submit"
                size="sm"
                disabled={loading}
                className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-xs"
              >
                追加
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => { setAdding(false); setTitle(''); setDueDate('') }}
                className="flex-1 text-xs"
              >
                キャンセル
              </Button>
            </div>
          </form>
        )}
      </div>

      <div className="px-4 py-2 border-t border-border bg-muted/30 shrink-0">
        <p className="text-xs text-muted-foreground">
          {tasks.filter(t => t.status === 'done').length} / {tasks.length} 完了
        </p>
      </div>
    </div>
  )
}
