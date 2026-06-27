/**
 * Demo data seeder for 鬼速PDCA
 *
 * Usage:
 *   node scripts/seed-demo.mjs enrich   # keep existing goals, add tasks/reviews (default)
 *   node scripts/seed-demo.mjs preview  # replace workspace content with /preview mock data
 */

import { readFileSync } from 'fs'
import { neon } from '@neondatabase/serverless'

const SOLO_USER_ID = '00000000-0000-0000-0000-000000000001'
const mode = process.argv[2] ?? 'enrich'

function loadEnv() {
  try {
    const raw = readFileSync('.env.local', 'utf8')
    for (const line of raw.split('\n')) {
      const m = line.match(/^([A-Z_]+)=(.*)$/)
      if (m) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '')
    }
  } catch {
    console.error('Missing .env.local — set DATABASE_URL first.')
    process.exit(1)
  }
}

function getWeekStart(date = new Date()) {
  const d = new Date(date)
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1)
  d.setDate(diff)
  return d.toISOString().split('T')[0]
}

loadEnv()
const sql = neon(process.env.DATABASE_URL)

async function getWorkspace() {
  await sql`
    INSERT INTO users (id, google_id, email, name)
    VALUES (${SOLO_USER_ID}, 'solo', 'solo@local', '自分')
    ON CONFLICT (id) DO NOTHING
  `
  let rows = await sql`
    SELECT * FROM workspaces WHERE user_id = ${SOLO_USER_ID} LIMIT 1
  `
  if (!rows[0]) {
    rows = await sql`
      INSERT INTO workspaces (user_id, name)
      VALUES (${SOLO_USER_ID}, '鬼速PDCAボード')
      RETURNING *
    `
  }
  return rows[0]
}

async function seedPreview(workspaceId) {
  await sql`DELETE FROM goals WHERE workspace_id = ${workspaceId}`

  await sql`
    INSERT INTO goals (workspace_id, title, due_date, sort_order)
    VALUES
      (${workspaceId}, '英語スピーキング力を上げる', '2026-06-30', 0),
      (${workspaceId}, '副業で月10万円を達成する', '2026-09-30', 1)
  `

  const goals = await sql`
    SELECT id, title FROM goals WHERE workspace_id = ${workspaceId} ORDER BY sort_order
  `
  const gEnglish = goals.find(g => g.title.includes('英語')).id
  const gSide = goals.find(g => g.title.includes('副業')).id

  const issueRows = await sql`
    INSERT INTO issues (goal_id, title, sort_order) VALUES
      (${gEnglish}, '毎日10分シャドーイング', 0),
      (${gEnglish}, 'オンライン英会話を週3回受ける', 1),
      (${gSide}, 'ポートフォリオサイトを完成させる', 0)
    RETURNING id
  `
  const [i1, i2, i3] = issueRows.map(r => r.id)

  await sql`
    INSERT INTO tasks (issue_id, title, status, achievement_rate, due_date, sort_order) VALUES
      (${i1}, 'CNNの音声素材をダウンロード', 'done', 100, NULL, 0),
      (${i1}, 'シャドーイング用アプリを設定', 'done', 100, NULL, 1),
      (${i1}, '毎朝7時にリマインダーを設定', 'in_progress', 60, '2026-06-15', 2),
      (${i2}, 'DMM英会話のプラン契約', 'done', 100, NULL, 0),
      (${i2}, '予約カレンダーに週3枠をブロック', 'in_progress', 25, '2026-06-16', 1),
      (${i3}, 'デザインカンプをFigmaで作成', 'in_progress', 50, '2026-06-20', 0),
      (${i3}, 'Next.jsでコーディング', 'todo', 0, '2026-06-25', 1)
  `

  const weekStart = getWeekStart()
  const [review] = await sql`
    INSERT INTO reviews (workspace_id, goal_id, week_start, reflection)
    VALUES (
      ${workspaceId},
      ${gEnglish},
      ${weekStart},
      'シャドーイングは継続できている。英会話は1回しかできなかった。来週は必ず3回やる。'
    )
    ON CONFLICT (workspace_id, goal_id, week_start)
    DO UPDATE SET reflection = EXCLUDED.reflection
    RETURNING id
  `

  await sql`
    INSERT INTO action_items (review_id, title, is_done, sort_order) VALUES
      (${review.id}, '英会話の予約を今週中に3枠入れる', false, 0),
      (${review.id}, 'シャドーイング素材を来週分も準備する', true, 1)
  `

  console.log('Preview demo data seeded.')
}

async function seedEnrich(workspaceId) {
  const goals = await sql`
    SELECT id, title FROM goals WHERE workspace_id = ${workspaceId} ORDER BY sort_order
  `
  if (goals.length === 0) {
    console.log('No goals found — falling back to preview seed.')
    await seedPreview(workspaceId)
    return
  }

  const issues = await sql`
    SELECT i.id, i.title, i.goal_id, g.title AS goal_title
    FROM issues i
    JOIN goals g ON g.id = i.goal_id
    WHERE g.workspace_id = ${workspaceId}
    ORDER BY g.sort_order, i.sort_order
  `

  for (const issue of issues) {
    const existing = await sql`
      SELECT COUNT(*)::int AS c FROM tasks WHERE issue_id = ${issue.id}
    `
    if (existing[0].c >= 3) continue

    const extras = [
      ['週次進捗を記録する', 'in_progress', 40],
      ['改善点を1つメモする', 'todo', 0],
      ['完了条件を確認する', 'done', 100],
    ]
    for (let i = 0; i < extras.length && existing[0].c + i < 3; i++) {
      const [title, status, rate] = extras[i]
      await sql`
        INSERT INTO tasks (issue_id, title, status, achievement_rate, sort_order)
        VALUES (${issue.id}, ${title}, ${status}, ${rate}, ${existing[0].c + i})
      `
    }
  }

  await sql`
    UPDATE tasks SET status = 'in_progress', achievement_rate = 35
    WHERE id = (
      SELECT t.id FROM tasks t
      JOIN issues i ON i.id = t.issue_id
      JOIN goals g ON g.id = i.goal_id
      WHERE g.workspace_id = ${workspaceId} AND t.status = 'todo' AND t.achievement_rate = 0
      LIMIT 1
    )
  `

  const weekStart = getWeekStart()
  for (const goal of goals.slice(0, 2)) {
    const [review] = await sql`
      INSERT INTO reviews (workspace_id, goal_id, week_start, reflection)
      VALUES (
        ${workspaceId},
        ${goal.id},
        ${weekStart},
        ${'今週の振り返り: ' + goal.title + ' に向けて進められたことと、来週のActionを整理する。'}
      )
      ON CONFLICT (workspace_id, goal_id, week_start)
      DO UPDATE SET reflection = EXCLUDED.reflection
      RETURNING id
    `

    const actionCount = await sql`
      SELECT COUNT(*)::int AS c FROM action_items WHERE review_id = ${review.id}
    `
    if (actionCount[0].c === 0) {
      await sql`
        INSERT INTO action_items (review_id, title, is_done, sort_order) VALUES
          (${review.id}, '来週のKDIを3つ以上DOにする', false, 0),
          (${review.id}, '達成率50%未満のKDIを見直す', true, 1)
      `
    }
  }

  console.log('Enriched existing workspace with tasks, reviews, and action items.')
}

async function main() {
  const ws = await getWorkspace()
  console.log('Workspace:', ws.name)
  console.log('Share URL path: /share/' + ws.share_token)

  if (mode === 'preview') {
    await seedPreview(ws.id)
  } else if (mode === 'enrich') {
    await seedEnrich(ws.id)
  } else {
    console.error('Unknown mode:', mode, '— use enrich or preview')
    process.exit(1)
  }

  const counts = await sql`
    SELECT 'goals' AS t, COUNT(*)::int AS c FROM goals WHERE workspace_id = ${ws.id}
    UNION ALL SELECT 'issues', COUNT(*)::int FROM issues i JOIN goals g ON g.id = i.goal_id WHERE g.workspace_id = ${ws.id}
    UNION ALL SELECT 'tasks', COUNT(*)::int FROM tasks t JOIN issues i ON i.id = t.issue_id JOIN goals g ON g.id = i.goal_id WHERE g.workspace_id = ${ws.id}
    UNION ALL SELECT 'reviews', COUNT(*)::int FROM reviews WHERE workspace_id = ${ws.id}
    UNION ALL SELECT 'action_items', COUNT(*)::int FROM action_items ai JOIN reviews r ON r.id = ai.review_id WHERE r.workspace_id = ${ws.id}
  `
  console.log('Counts:', counts)
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
