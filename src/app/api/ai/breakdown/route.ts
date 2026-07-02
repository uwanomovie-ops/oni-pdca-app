import { NextResponse } from 'next/server'
import { callGemini } from '@/lib/gemini'

export interface AIBreakdownIssue {
  title: string
  tasks: string[]
}

export interface AIBreakdownResult {
  issues: AIBreakdownIssue[]
}

function buildPrompt(
  goalTitle: string,
  dueDate: string | null,
  existingIssues: string[],
  feedback?: string
): string {
  const dueText = dueDate ? `達成期日：${dueDate}` : '達成期日：未設定'
  const existingText =
    existingIssues.length > 0
      ? `\n既に登録されている課題（重複しない新しい提案を優先）：\n${existingIssues.map(t => `- ${t}`).join('\n')}`
      : ''
  const feedbackText = feedback
    ? `\n\n前回の草案へのフィードバック：${feedback}\nこのフィードバックを反映して改善してください。`
    : ''

  return `あなたは「鬼速PDCA」のコーチです。第二領域（重要だが緊急でない）の目標を、実行可能な階層に分解してください。

## 用語
- KGI（最終目標）：ユーザーが達成したいゴール
- 課題（KPI）：そのゴールを阻む課題・障壁
- KDI（行動指標）：今週〜今月にやる具体的な行動（TODO/DO/DONEで管理）

## 対象のKGI
タイトル：${goalTitle}
${dueText}${existingText}${feedbackText}

## 出力ルール
- 課題は2〜3個
- 各課題にKDI（行動指標）を2〜4個
- KDIは「〜する」など具体的な行動で書く
- 抽象的な精神論は避ける

出力形式（JSONのみ）：
{
  "issues": [
    {
      "title": "課題のタイトル",
      "tasks": ["KDI1", "KDI2"]
    }
  ]
}

JSONのみを出力。説明文や\`\`\`は不要です。`
}

function parseGeminiJson(raw: string): AIBreakdownResult {
  let jsonStr = raw
    .replace(/```json\s*/gi, '')
    .replace(/```\s*/g, '')
    .trim()
  const match = jsonStr.match(/\{[\s\S]*\}/)
  if (match) jsonStr = match[0]
  const parsed = JSON.parse(jsonStr) as AIBreakdownResult
  if (!Array.isArray(parsed.issues)) throw new Error('invalid shape')
  parsed.issues = parsed.issues
    .filter(i => i.title?.trim())
    .map(i => ({
      title: i.title.trim(),
      tasks: (i.tasks ?? []).map(t => String(t).trim()).filter(Boolean),
    }))
  if (parsed.issues.length === 0) throw new Error('empty issues')
  return parsed
}

export async function POST(req: Request) {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: 'GEMINI_API_KEY が設定されていません' }, { status: 500 })
  }

  const body = await req.json()
  const { goal_title, due_date, existing_issues, feedback } = body as {
    goal_title?: string
    due_date?: string | null
    existing_issues?: string[]
    feedback?: string
  }

  if (!goal_title?.trim()) {
    return NextResponse.json({ error: 'goal_title は必須です' }, { status: 400 })
  }

  const prompt = buildPrompt(
    goal_title.trim(),
    due_date ?? null,
    existing_issues ?? [],
    feedback?.trim()
  )

  try {
    const { text: raw } = await callGemini(apiKey, prompt, 4096)
    const result = parseGeminiJson(raw)
    return NextResponse.json(result)
  } catch (e) {
    const message = e instanceof Error ? e.message : '生成に失敗しました'
    if (message.includes('Gemini')) {
      return NextResponse.json({ error: message }, { status: 500 })
    }
    console.error('AI breakdown parse failed:', e)
    return NextResponse.json(
      { error: 'AIの出力をパースできませんでした。もう一度お試しください。' },
      { status: 500 }
    )
  }
}
