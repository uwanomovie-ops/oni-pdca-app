import type {
  Goal,
  Issue,
  Task,
  AdjustProposal,
  AdjustProposalType,
  CoachWeekHistory,
  Status,
} from './types'
import { getDueHealth, dueHealthLabel, formatWeekLabel } from './utils'

export interface CoachResponse {
  feedback: string
  proposals: AdjustProposal[]
}

export interface ReflectionDraftResponse {
  reflection: string
}

const VALID_TYPES: AdjustProposalType[] = [
  'add_kdi',
  'update_title',
  'update_due_date',
  'update_status',
]

const VALID_STATUSES: Status[] = ['todo', 'in_progress', 'done']

function statusLabel(status: Status): string {
  return { todo: 'TODO', in_progress: 'DO', done: 'DONE' }[status]
}

function formatTaskLine(task: Task): string {
  const health = getDueHealth(task)
  const healthText = dueHealthLabel(health) ? `, 納期ヘルス: ${dueHealthLabel(health)}` : ''
  const dueText = task.due_date ? `, 期限: ${task.due_date}` : ', 期限: 未設定'
  return `- [kdi_id: ${task.id}] ${task.title} | ${statusLabel(task.status)} | 達成率: ${task.achievement_rate}%${dueText}${healthText}`
}

function formatHistoryBlock(history: CoachWeekHistory[]): string {
  if (history.length === 0) return '（過去の週次データなし）'
  return history
    .map(h => {
      const actions = h.action_items.length
        ? h.action_items.map(a => `  - ${a.is_done ? '✓' : '✗'} ${a.title}`).join('\n')
        : '  （Adjustアイテムなし）'
      const coach = h.coach_feedback
        ? `  コーチ所見（要約）: ${h.coach_feedback.slice(0, 200)}${h.coach_feedback.length > 200 ? '…' : ''}`
        : '  コーチ所見: なし'
      const pending = h.pending_action_titles.length
        ? `  未完了が続いているAdjust: ${h.pending_action_titles.join(' / ')}`
        : ''
      return `### ${formatWeekLabel(h.week_start)}
振り返り: ${h.reflection?.trim() || '（未記入）'}
Adjust:
${actions}
${coach}
採用済みAdjust数: ${h.applied_count}${pending ? `\n${pending}` : ''}`
    })
    .join('\n\n')
}

export function buildCoachPrompt(
  goal: Pick<Goal, 'title' | 'due_date'>,
  issues: Issue[],
  tasks: Task[],
  weekStart: string,
  reflection: string,
  history: CoachWeekHistory[],
  feedback?: string,
  tone: 'standard' | 'strict' | 'supportive' = 'standard'
): string {
  const dueText = goal.due_date ? `達成期日: ${goal.due_date}` : '達成期日: 未設定'
  const issueBlocks = issues.map(issue => {
    const issueTasks = tasks.filter(t => t.issue_id === issue.id)
    const taskLines = issueTasks.length
      ? issueTasks.map(formatTaskLine).join('\n')
      : '  （KDIなし）'
    return `#### 課題 [issue_id: ${issue.id}] ${issue.title}\n${taskLines}`
  }).join('\n\n')

  const toneGuide = {
    standard: 'バランスよく、事実ベースでフィードバックする。',
    strict: '鬼速PDCAらしく厳しめ。言い訳を許さず、数値と行動のギャップを指摘する。',
    supportive: '達成できた点を先に認めてから、改善点を1〜2個に絞る。',
  }[tone]

  const feedbackText = feedback
    ? `\n\n## 再生成への指示\n${feedback}\nこの指示を反映してください。`
    : ''

  return `あなたは「鬼速PDCA」の専属コーチAIです。ユーザーの週次振り返り（Check）をレビューし、来週に向けたAdjust（KDIの調整）を提案してください。

## 口調
${toneGuide}

## 用語
- Check: 今週の振り返り
- Adjust: 来週のプラン調整（KDIの追加・期限・ステータス変更）
- KDI: 具体的な行動指標（tasks テーブル）

## 対象KGI
タイトル: ${goal.title}
${dueText}

## 今週（${formatWeekLabel(weekStart)}）の振り返り
${reflection.trim() || '（ユーザー未記入 — 数値データを中心にレビューすること）'}

## 現在の KPI / KDI 状態
${issueBlocks || '（課題・KDI未登録）'}

## 過去2〜3週の履歴
${formatHistoryBlock(history)}

## ルール
- 同じAdjustが2週以上未完了なら、より強く指摘する
- 提案は KDI レベルのみ（Phase 1）。KPI/KGIの変更はしない
- 提案は3〜6個、理由（reason）を必ず書く
- add_kdi には issue_id を必ず指定（上記の issue_id を使う）
- update_* には kdi_id を必ず指定
- status は todo / in_progress / done のいずれか
- due_date は YYYY-MM-DD 形式

## 出力形式（JSONのみ）
{
  "feedback": "コーチ所見（うまくいった点・ダメ出し・パターン指摘。200〜600字）",
  "proposals": [
    {
      "id": "p1",
      "type": "add_kdi",
      "issue_id": "uuid",
      "title": "来週やる具体的行動",
      "due_date": "2026-07-05",
      "status": "todo",
      "reason": "なぜこのAdjustが必要か"
    },
    {
      "id": "p2",
      "type": "update_status",
      "kdi_id": "uuid",
      "status": "in_progress",
      "reason": "理由"
    }
  ]
}

type は add_kdi | update_title | update_due_date | update_status のみ。
JSONのみ出力。説明文や\`\`\`は不要。${feedbackText}`
}

export function buildReflectionDraftPrompt(
  goal: Pick<Goal, 'title' | 'due_date'>,
  issues: Issue[],
  tasks: Task[],
  weekStart: string
): string {
  const issueBlocks = issues.map(issue => {
    const issueTasks = tasks.filter(t => t.issue_id === issue.id)
    return `- ${issue.title}: ${issueTasks.map(t => `${t.title}(${t.achievement_rate}%, ${statusLabel(t.status)})`).join(', ') || 'KDIなし'}`
  }).join('\n')

  return `あなたは「鬼速PDCA」のコーチです。今週の数値データをもとに、ユーザーが編集する振り返り（Check）の下書きを書いてください。

KGI: ${goal.title}
週: ${formatWeekLabel(weekStart)}

KPI/KDIの状態:
${issueBlocks || 'データなし'}

## ルール
- 200〜400字、一人称（「私は」）で書く
- うまくいった点・うまくいかなかった点・来週への意気込みを含める
- 数値や具体的KDI名を引用する
- 説教やAdjust提案は書かない（振り返りのみ）

JSONのみ:
{ "reflection": "振り返り本文" }`
}

function normalizeProposal(
  raw: Record<string, unknown>,
  index: number,
  issues: Issue[],
  tasks: Task[]
): AdjustProposal | null {
  const type = raw.type as AdjustProposalType
  if (!VALID_TYPES.includes(type)) return null

  const proposal: AdjustProposal = {
    id: String(raw.id ?? `p${index + 1}`),
    type,
    reason: String(raw.reason ?? '').trim() || '調整が必要です',
  }

  if (type === 'add_kdi') {
    const title = String(raw.title ?? '').trim()
    let issueId = String(raw.issue_id ?? '').trim()
    if (!issueId || !issues.some(i => i.id === issueId)) {
      const issueTitle = String(raw.issue_title ?? raw.issue ?? '').trim()
      const matched = issues.find(i =>
        i.title === issueTitle || i.title.includes(issueTitle) || issueTitle.includes(i.title)
      )
      if (matched) issueId = matched.id
    }
    if (!title || !issueId) return null
    proposal.issue_id = issueId
    proposal.title = title
    if (raw.due_date) proposal.due_date = String(raw.due_date)
    const status = raw.status as Status
    if (status && VALID_STATUSES.includes(status)) proposal.status = status
  } else {
    let kdiId = String(raw.kdi_id ?? '').trim()
    if (!kdiId || !tasks.some(t => t.id === kdiId)) {
      const kdiTitle = String(raw.kdi_title ?? raw.task_title ?? '').trim()
      const matched = tasks.find(t =>
        t.title === kdiTitle || t.title.includes(kdiTitle) || kdiTitle.includes(t.title)
      )
      if (matched) kdiId = matched.id
    }
    if (!kdiId) return null
    proposal.kdi_id = kdiId
    if (type === 'update_title') {
      const title = String(raw.title ?? '').trim()
      if (!title) return null
      proposal.title = title
    }
    if (type === 'update_due_date') {
      if (!raw.due_date) return null
      proposal.due_date = String(raw.due_date)
    }
    if (type === 'update_status') {
      const status = raw.status as Status
      if (!status || !VALID_STATUSES.includes(status)) return null
      proposal.status = status
    }
  }

  return proposal
}

function extractJsonObject(raw: string): string {
  let jsonStr = raw.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim()
  const match = jsonStr.match(/\{[\s\S]*\}/)
  if (match) jsonStr = match[0]
  return jsonStr
}

function parseJsonLoose(raw: string): Record<string, unknown> {
  const jsonStr = extractJsonObject(raw)
  try {
    return JSON.parse(jsonStr) as Record<string, unknown>
  } catch {
    // 途中で切れた JSON から feedback だけ救済
    const fbMatch = jsonStr.match(/"feedback"\s*:\s*"((?:[^"\\]|\\.)*)"/)
    if (fbMatch) {
      return {
        feedback: fbMatch[1].replace(/\\n/g, '\n').replace(/\\"/g, '"'),
        proposals: [],
      }
    }
    throw new Error('invalid json')
  }
}

function readFeedback(parsed: Record<string, unknown>): string {
  return String(
    parsed.feedback ?? parsed.comment ?? parsed.coaching ?? parsed.message ?? ''
  ).trim()
}

export function parseCoachJson(raw: string, issues: Issue[] = [], tasks: Task[] = []): CoachResponse {
  if (!raw.trim()) throw new Error('empty response')
  const parsed = parseJsonLoose(raw)
  const feedback = readFeedback(parsed)
  if (!feedback) throw new Error('empty feedback')

  const proposalList = parsed.proposals ?? parsed.adjust_proposals ?? parsed.adjusts ?? []
  const proposals = (Array.isArray(proposalList) ? proposalList : [])
    .map((p, i) => normalizeProposal(p as Record<string, unknown>, i, issues, tasks))
    .filter((p): p is AdjustProposal => p !== null)

  return { feedback, proposals }
}

export function parseReflectionDraftJson(raw: string): ReflectionDraftResponse {
  let jsonStr = raw.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim()
  const match = jsonStr.match(/\{[\s\S]*\}/)
  if (match) jsonStr = match[0]
  const parsed = JSON.parse(jsonStr) as { reflection?: string }
  const reflection = String(parsed.reflection ?? '').trim()
  if (!reflection) throw new Error('empty reflection')
  return { reflection }
}

export function validateProposals(
  proposals: AdjustProposal[],
  issues: Issue[],
  tasks: Task[],
  goalId: string
): AdjustProposal[] {
  const goalIssueIds = new Set(issues.filter(i => i.goal_id === goalId).map(i => i.id))
  const taskIds = new Set(tasks.filter(t => goalIssueIds.has(t.issue_id)).map(t => t.id))

  return proposals.filter(p => {
    if (p.type === 'add_kdi') {
      return p.issue_id && goalIssueIds.has(p.issue_id) && p.title
    }
    return p.kdi_id && taskIds.has(p.kdi_id)
  })
}

export function proposalSummary(p: AdjustProposal, tasks: Task[], issues: Issue[]): string {
  if (p.type === 'add_kdi') {
    const issue = issues.find(i => i.id === p.issue_id)
    return `KDI追加: ${p.title}（${issue?.title ?? '課題'}）`
  }
  const task = tasks.find(t => t.id === p.kdi_id)
  const base = task?.title ?? p.kdi_id
  if (p.type === 'update_title') return `KDI名称変更: ${base} → ${p.title}`
  if (p.type === 'update_due_date') return `期限変更: ${base} → ${p.due_date}`
  if (p.type === 'update_status') return `ステータス: ${base} → ${statusLabel(p.status!)}`
  return p.type
}
