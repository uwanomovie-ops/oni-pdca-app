'use client'

import { useState, useCallback } from 'react'
import { api } from '@/lib/api'
import type { Workspace, Goal, Issue, Task, Review, ActionItem } from '@/lib/types'
import KGIPane from './KGIPane'
import KPIPane from './KPIPane'
import KDIPane from './KDIPane'
import ReviewPane from './ReviewPane'

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
    <div className="flex h-full overflow-hidden">
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
      <KPIPane
        issues={visibleIssues}
        tasks={tasks}
        selectedGoal={selectedGoal}
        selectedIssueId={selectedIssueId}
        onSelect={setSelectedIssueId}
        onRefresh={loadData}
        readOnly={readOnly}
      />
      <KDIPane
        tasks={visibleTasks}
        selectedIssue={selectedIssue}
        onRefresh={loadData}
        readOnly={readOnly}
      />
      <ReviewPane
        workspace={workspace}
        selectedGoal={selectedGoal}
        reviews={reviews}
        actionItems={actionItems}
        onRefresh={loadData}
        readOnly={readOnly}
      />
    </div>
  )
}
