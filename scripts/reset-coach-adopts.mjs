/**
 * AIコーチの採用ログをリセットし、「採用して反映」を再度使える状態にする
 *
 * Usage: node scripts/reset-coach-adopts.mjs [goal keyword] [--regenerate]
 *
 * - 採用ログ (coach_applied_log) をクリア
 * - --regenerate: 新しい提案を API で再生成（npm run dev 必須）
 * - AIコーチ採用で追加した KDI (ai_coach_added) を削除（再採用時の重複防止）
 */

import { readFileSync } from 'fs'
import { neon } from '@neondatabase/serverless'

const SOLO_USER_ID = '00000000-0000-0000-0000-000000000001'
const args = process.argv.slice(2)
const regenerate = args.includes('--regenerate')
const goalKeyword = args.find(a => a !== '--regenerate') ?? '月商'

function loadEnv() {
  try {
    const raw = readFileSync('.env.local', 'utf8')
    for (const line of raw.split('\n')) {
      const m = line.match(/^([A-Z_]+)=(.*)$/)
      if (m) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '')
    }
  } catch {
    console.error('Missing .env.local')
    process.exit(1)
  }
}

function getWeekStart(date = new Date()) {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  const day = d.getDay()
  d.setDate(d.getDate() - day)
  if (day === 0) d.setDate(d.getDate() - 7)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${dd}`
}

loadEnv()
const sql = neon(process.env.DATABASE_URL)

async function callCoachViaApi(payload) {
  const res = await fetch('http://localhost:3000/api/ai/coach', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  if (!res.ok) {
    const text = await res.text()
    try {
      throw new Error(JSON.parse(text).error ?? text)
    } catch (e) {
      if (e instanceof Error && e.message !== text) throw e
      throw new Error(text.slice(0, 200))
    }
  }
  return res.json()
}

async function main() {
  const ws = await sql`
    SELECT * FROM workspaces WHERE user_id = ${SOLO_USER_ID} LIMIT 1
  `
  if (!ws[0]) {
    console.error('ワークスペースがありません')
    process.exit(1)
  }

  const weekStart = getWeekStart()
  const goals = await sql`
    SELECT * FROM goals WHERE workspace_id = ${ws[0].id} ORDER BY sort_order
  `
  const goal = goals.find(g => g.title.includes(goalKeyword)) ?? goals[0]
  if (!goal) {
    console.error('KGI がありません')
    process.exit(1)
  }

  const reviewRows = await sql`
    SELECT r.* FROM reviews r
    WHERE r.workspace_id = ${ws[0].id} AND r.goal_id = ${goal.id} AND r.week_start = ${weekStart}
    LIMIT 1
  `
  let review = reviewRows[0]
  if (!review) {
    const fallback = await sql`
      SELECT r.* FROM reviews r
      WHERE r.workspace_id = ${ws[0].id} AND r.goal_id = ${goal.id}
      ORDER BY r.week_start DESC
      LIMIT 1
    `
    review = fallback[0]
  }
  if (!review) {
    console.error('今週の review がありません。先に npm run seed:check-demo を実行してください')
    process.exit(1)
  }

  const deleted = await sql`
    DELETE FROM tasks t
    USING issues i
    WHERE t.issue_id = i.id AND i.goal_id = ${goal.id} AND t.ai_coach_added = true
    RETURNING t.id, t.title
  `
  if (deleted.length > 0) {
    console.log(`✓ AIコーチ採用KDIを ${deleted.length} 件削除（再デモ用）`)
    deleted.forEach(t => console.log('  -', t.title))
  }

  await sql`
    UPDATE reviews SET coach_applied_log = NULL WHERE id = ${review.id}
  `
  console.log('✓ 採用ログをクリアしました')

  let proposalCount = 0
  const existing = review.coach_proposals
  if (existing && (Array.isArray(existing) ? existing.length : JSON.parse(existing).length)) {
    proposalCount = Array.isArray(existing) ? existing.length : JSON.parse(existing).length
  }

  if (regenerate || proposalCount === 0) {
    console.log('AIコーチ提案を再生成中…（npm run dev 必須）')
    const issues = await sql`
      SELECT i.* FROM issues i JOIN goals g ON g.id = i.goal_id
      WHERE g.workspace_id = ${ws[0].id} ORDER BY i.sort_order
    `
    const tasks = await sql`
      SELECT t.* FROM tasks t
      JOIN issues i ON i.id = t.issue_id
      JOIN goals g ON g.id = i.goal_id
      WHERE g.workspace_id = ${ws[0].id}
      ORDER BY t.sort_order
    `
    const coach = await callCoachViaApi({
      mode: 'coach',
      goal: { id: goal.id, title: goal.title, due_date: goal.due_date },
      issues,
      tasks,
      week_start: weekStart,
      reflection: review.reflection ?? '',
      history: [],
      tone: 'standard',
    })
    await sql`
      UPDATE reviews SET
        coach_feedback = ${coach.feedback},
        coach_proposals = ${JSON.stringify(coach.proposals)},
        coach_applied_log = NULL
      WHERE id = ${review.id}
    `
    proposalCount = coach.proposals.length
    console.log(`✓ 新しい Adjust 提案 ${proposalCount} 件`)
  } else {
    console.log(`✓ 既存の Adjust 提案 ${proposalCount} 件が未採用状態に戻りました`)
  }

  console.log('')
  console.log('→ http://localhost:3000 を再読み込み')
  console.log('→ 「AIコーチに今週をレビュー」を開くと Adjust 提案が表示され「採用して反映」が有効になります')
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
