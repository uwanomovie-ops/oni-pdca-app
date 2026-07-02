import { NextResponse } from 'next/server'
import {
  buildCoachPrompt,
  buildReflectionDraftPrompt,
  parseCoachJson,
  parseReflectionDraftJson,
  validateProposals,
} from '@/lib/coach'
import { callGemini } from '@/lib/gemini'
import type { CoachWeekHistory, Goal, Issue, Task } from '@/lib/types'

export async function POST(req: Request) {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: 'GEMINI_API_KEY が設定されていません' }, { status: 500 })
  }

  const body = await req.json()
  const {
    mode = 'coach',
    goal,
    issues,
    tasks,
    week_start,
    reflection,
    history,
    feedback,
    tone,
  } = body as {
    mode?: 'coach' | 'reflection_draft'
    goal?: Pick<Goal, 'id' | 'title' | 'due_date'>
    issues?: Issue[]
    tasks?: Task[]
    week_start?: string
    reflection?: string
    history?: CoachWeekHistory[]
    feedback?: string
    tone?: 'standard' | 'strict' | 'supportive'
  }

  if (!goal?.title?.trim() || !goal.id) {
    return NextResponse.json({ error: 'goal は必須です' }, { status: 400 })
  }

  const goalIssues = (issues ?? []).filter(i => i.goal_id === goal.id)
  const goalTasks = (tasks ?? []).filter(t => goalIssues.some(i => i.id === t.issue_id))

  try {
    if (mode === 'reflection_draft') {
      if (!week_start) {
        return NextResponse.json({ error: 'week_start は必須です' }, { status: 400 })
      }
      const prompt = buildReflectionDraftPrompt(goal, goalIssues, goalTasks, week_start)
      const { text: raw } = await callGemini(apiKey, prompt)
      const result = parseReflectionDraftJson(raw)
      return NextResponse.json(result)
    }

    if (!week_start) {
      return NextResponse.json({ error: 'week_start は必須です' }, { status: 400 })
    }

    const prompt = buildCoachPrompt(
      goal,
      goalIssues,
      goalTasks,
      week_start,
      reflection ?? '',
      history ?? [],
      feedback?.trim(),
      tone ?? 'standard'
    )
    const { text: raw } = await callGemini(apiKey, prompt)
    const parsed = parseCoachJson(raw, goalIssues, goalTasks)
    const proposals = validateProposals(parsed.proposals, goalIssues, goalTasks, goal.id)

    return NextResponse.json({
      feedback: parsed.feedback,
      proposals,
    })
  } catch (e) {
    console.error('AI coach failed:', e)
    const message = e instanceof Error ? e.message : '生成に失敗しました'
    return NextResponse.json(
      { error: message.includes('Gemini') ? message : 'AIの出力を処理できませんでした。もう一度お試しください。' },
      { status: 500 }
    )
  }
}
