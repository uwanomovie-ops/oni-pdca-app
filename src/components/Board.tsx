'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { api } from '@/lib/api'
import type { Workspace, Goal, Issue, Task, Review, ActionItem } from '@/lib/types'
import KGIPane from './KGIPane'
import KPIPane from './KPIPane'
import KDIPane from './KDIPane'
import ReviewPane from './ReviewPane'
import PaneResizeHandle from './PaneResizeHandle'

const DEFAULT_WIDTHS = [25, 25, 25, 25] as const
const MIN_PANE_PX = 180

function loadPaneWidths(workspaceId: string): number[] {
  if (typeof window === 'undefined') return [...DEFAULT_WIDTHS]
  try {
    const saved = localStorage.getItem(`pdca-pane-widths-${workspaceId}`)
    if (!saved) return [...DEFAULT_WIDTHS]
    const parsed: unknown = JSON.parse(saved)
    if (
      Array.isArray(parsed) &&
      parsed.length === 4 &&
      parsed.every((v) => typeof v === 'number' && v > 0) &&
      Math.abs(parsed.reduce((sum, v) => sum + v, 0) - 100) < 0.1
    ) {
      return parsed as number[]
    }
  } catch {
    // ignore invalid storage
  }
  return [...DEFAULT_WIDTHS]
}

interface Props {
  workspace: Workspace
  initialGoals: Goal[]
  initialIssues: Issue[]
  initialTasks: Task[]
  initialReviews: Review[]
  initialActionItems: ActionItem[]
  readOnly?: boolean
}

export default function Board({
  workspace,
  initialGoals, initialIssues, initialTasks, initialReviews, initialActionItems,
  readOnly = false,
}: Props) {
  const [goals, setGoals] = useState<Goal[]>(initialGoals)
  const [issues, setIssues] = useState<Issue[]>(initialIssues)
  const [tasks, setTasks] = useState<Task[]>(initialTasks)
  const [reviews, setReviews] = useState<Review[]>(initialReviews)
  const [actionItems, setActionItems] = useState<ActionItem[]>(initialActionItems)

  const [selectedGoalId, setSelectedGoalId] = useState<string | null>(initialGoals[0]?.id ?? null)
  const [selectedIssueId, setSelectedIssueId] = useState<string | null>(null)
  const [paneWidths, setPaneWidths] = useState<number[]>(() => loadPaneWidths(workspace.id))
  const boardRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    localStorage.setItem(`pdca-pane-widths-${workspace.id}`, JSON.stringify(paneWidths))
  }, [workspace.id, paneWidths])

  const handleResize = useCallback((index: number, deltaPx: number) => {
    const totalWidth = boardRef.current?.offsetWidth
    if (!totalWidth) return

    const minPct = (MIN_PANE_PX / totalWidth) * 100
    const deltaPct = (deltaPx / totalWidth) * 100

    setPaneWidths((prev) => {
      const next = [...prev]
      const maxLeft = prev[index] + prev[index + 1] - minPct
      const newLeft = Math.max(minPct, Math.min(prev[index] + deltaPct, maxLeft))
      const actualDelta = newLeft - prev[index]
      next[index] = newLeft
      next[index + 1] = prev[index + 1] - actualDelta
      return next
    })
  }, [])

  const loadData = useCallback(async () => {
    if (readOnly) return
    const data = await api.get(`/api/workspace/${workspace.id}`)
    setGoals(data.goals)
    setIssues(data.issues)
    setTasks(data.tasks)
    setReviews(data.reviews)
    setActionItems(data.actionItems)
  }, [workspace.id, readOnly])

  const visibleIssues = selectedGoalId ? issues.filter(i => i.goal_id === selectedGoalId) : []
  const visibleTasks = selectedIssueId ? tasks.filter(t => t.issue_id === selectedIssueId) : []
  const selectedGoal = goals.find(g => g.id === selectedGoalId) ?? null
  const selectedIssue = issues.find(i => i.id === selectedIssueId) ?? null

  return (
    <div ref={boardRef} className="flex h-full overflow-hidden">
      <div className="min-w-0 shrink-0 h-full" style={{ width: `${paneWidths[0]}%` }}>
        <KGIPane
          goals={goals}
          issues={issues}
          tasks={tasks}
          selectedGoalId={selectedGoalId}
          selectedIssueId={selectedIssueId}
          onSelectGoal={(id) => { setSelectedGoalId(id); setSelectedIssueId(null) }}
          onSelectIssue={setSelectedIssueId}
          workspaceId={workspace.id}
          onRefresh={loadData}
          readOnly={readOnly}
        />
      </div>
      <PaneResizeHandle onResize={(delta) => handleResize(0, delta)} />
      <div className="min-w-0 shrink-0 h-full" style={{ width: `${paneWidths[1]}%` }}>
        <KPIPane
          issues={visibleIssues}
          tasks={tasks}
          selectedGoal={selectedGoal}
          selectedIssueId={selectedIssueId}
          onSelect={setSelectedIssueId}
          onRefresh={loadData}
          readOnly={readOnly}
        />
      </div>
      <PaneResizeHandle onResize={(delta) => handleResize(1, delta)} />
      <div className="min-w-0 shrink-0 h-full" style={{ width: `${paneWidths[2]}%` }}>
        <KDIPane
          tasks={visibleTasks}
          selectedIssue={selectedIssue}
          onRefresh={loadData}
          readOnly={readOnly}
        />
      </div>
      <PaneResizeHandle onResize={(delta) => handleResize(2, delta)} />
      <div className="min-w-0 shrink-0 h-full" style={{ width: `${paneWidths[3]}%` }}>
        <ReviewPane
          workspace={workspace}
          selectedGoal={selectedGoal}
          selectedIssue={selectedIssue}
          issues={issues}
          tasks={tasks}
          reviews={reviews}
          actionItems={actionItems}
          onRefresh={loadData}
          onSelectIssue={setSelectedIssueId}
          readOnly={readOnly}
          hideCoach={readOnly}
        />
      </div>
    </div>
  )
}
