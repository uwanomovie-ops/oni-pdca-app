/**
 * Check/Adjust デモ用 — 今週の振り返り + AIコーチ結果を投入
 *
 * Usage: node scripts/seed-check-demo.mjs [goal keyword]
 * Example: node scripts/seed-check-demo.mjs 月商
 *
 * Requires: .env.local (DATABASE_URL, GEMINI_API_KEY)
 * Optional: npm run dev が http://localhost:3000 で起動中なら API 経由でコーチ生成
 */

import { readFileSync } from 'fs'
import { neon } from '@neondatabase/serverless'

const SOLO_USER_ID = '00000000-0000-0000-0000-000000000001'
const goalKeyword = process.argv[2] ?? '月商'

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

const REFLECTION = `今週の振り返り（Check）

BtoC伴走サービスは受注0件のまま。KDI「コンテンツ作成」は期限（6/26）を過ぎて未着手で、週次進捗記録だけ50%まで進んだ。BtoBは58%と数字上は良いが、実際の商談化までのプロセスが見えていない。

良かった点：BtoB側のKDIをDOに移せた。副次的なタスク整理はできた。
課題：BtoCのKDIが「緊急」状態なのに優先度が下がっている。言い訳として「時間がない」を使いがち。

来週：BtoCのKDIを最低2つDONEにする。期限切れKDIの再設定と、英会話ではなく「伴走サービスの提案文面」を1本仕上げる。`

loadEnv()
const sql = neon(process.env.DATABASE_URL)

async function getWorkspace() {
  const rows = await sql`
    SELECT * FROM workspaces WHERE user_id = ${SOLO_USER_ID} LIMIT 1
  `
  if (!rows[0]) {
    console.error('ワークスペースがありません。先に npm run dev で / を開いてください。')
    process.exit(1)
  }
  return rows[0]
}

async function callCoachViaApi(payload) {
  const res = await fetch('http://localhost:3000/api/ai/coach', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  if (!res.ok) {
    const text = await res.text()
    let msg = text
    try {
      msg = JSON.parse(text).error ?? text
    } catch { /* keep text */ }
    throw new Error(msg)
  }
  return res.json()
}

async function main() {
  const ws = await getWorkspace()
  const weekStart = getWeekStart()

  const goals = await sql`
    SELECT * FROM goals WHERE workspace_id = ${ws.id} ORDER BY sort_order
  `
  const goal =
    goals.find(g => g.title.includes(goalKeyword)) ??
    goals[0]

  if (!goal) {
    console.error('KGI がありません')
    process.exit(1)
  }

  console.log('Target KGI:', goal.title)
  console.log('Week:', weekStart)

  const issues = await sql`
    SELECT i.* FROM issues i
    JOIN goals g ON g.id = i.goal_id
    WHERE g.workspace_id = ${ws.id}
    ORDER BY i.sort_order
  `
  const tasks = await sql`
    SELECT t.* FROM tasks t
    JOIN issues i ON i.id = t.issue_id
    JOIN goals g ON g.id = i.goal_id
    WHERE g.workspace_id = ${ws.id}
    ORDER BY t.sort_order
  `

  const [review] = await sql`
    INSERT INTO reviews (workspace_id, goal_id, week_start, reflection)
    VALUES (${ws.id}, ${goal.id}, ${weekStart}, ${REFLECTION})
    ON CONFLICT (workspace_id, goal_id, week_start)
    DO UPDATE SET reflection = EXCLUDED.reflection
    RETURNING id
  `

  console.log('✓ 振り返り（Check）を投入しました')

  const actionCount = await sql`
    SELECT COUNT(*)::int AS c FROM action_items WHERE review_id = ${review.id}
  `
  if (actionCount[0].c === 0) {
    await sql`
      INSERT INTO action_items (review_id, title, is_done, sort_order) VALUES
        (${review.id}, 'BtoC提案文面を1本完成させる', false, 0),
        (${review.id}, '期限切れKDIの期限を来週に再設定', false, 1),
        (${review.id}, '週次進捗記録を金曜まで継続', true, 2)
    `
    console.log('✓ 手動 Adjust サンプルを追加しました')
  }

  console.log('AIコーチを生成中…（npm run dev が起動している必要があります）')
  const coach = await callCoachViaApi({
    mode: 'coach',
    goal: { id: goal.id, title: goal.title, due_date: goal.due_date },
    issues,
    tasks,
    week_start: weekStart,
    reflection: REFLECTION,
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

  console.log('✓ AIコーチ所見 + Adjust 提案', coach.proposals.length, '件を保存しました')
  console.log('')
  console.log('→ http://localhost:3000 を開き、KGI「' + goal.title + '」を選択してください')
  console.log('→ 右ペイン Check/Adjust に振り返りとコーチ結果が表示されます')
  console.log('→ 「AIコーチに今週をレビュー」で再生成も試せます')
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
