# 鬼速PDCA

『鬼速PDCA』の考え方に基づき、第二領域（重要だが緊急でない）の目標を **KGI → KPI → KDI → Check / Adjust** の4ペインで1画面管理する Web アプリです。

振り返りを「書いて終わり」にせず、**1週間単位でプランを Adjust（調整）** するループを回すことを目的としています。

## 提出用リンク

| 項目 | URL |
|------|-----|
| **本番アプリ** | https://oni-pdca-app.vercel.app |
| **プレビュー（DB不要）** | https://oni-pdca-app.vercel.app/preview |
| **発表用図解（4ヶ月目）** | https://oni-pdca-ads.surge.sh |
| **連携図解（2×4ヶ月目・おまけ）** | https://oni-pdca-time-system.surge.sh |
| **GitHub** | https://github.com/uwanomovie-ops/oni-pdca-app |

---

## 概要

- 目標（KGI）を選び、課題（KPI）・行動指標（KDI）・週次振り返りまでを**横並びの4ペイン**で一覧
- KDI の達成率が KPI / KGI に**自動集計**
- **週次で Check → Adjust** — 今週の結果を振り返り、来週の KDI プランを直す
- **共有 URL**で仲間に読み取り専用表示（ログイン不要）
- **Gemini API** による AI 支援（計画の分解 + 週次コーチング）

### 週次 PDCA ループ

```
Plan     … KGI を KPI / KDI に分解（手動 or AI分解）
Do       … KDI を TODO → DO → DONE で実行
Check    … 週次振り返り（数値 + 自由記述）
Adjust   … 来週に向けた KDI の調整（手動 or AIコーチ提案 → 採用）
```

左3ペイン（KGI / KPI / KDI）で「何をやるか」、右ペイン（Check / Adjust）で「うまくいったか・次どう直すか」を**同じ画面**で扱います。

---

## 主な機能

| 機能 | 説明 | 状態 |
|------|------|------|
| 4ペインボード | KGI＋課題 / KPI / KDI / Check・Adjust を1画面で操作 | ✅ |
| 達成率の自動集計 | KDI → KPI → KGI へ達成率が伝播 | ✅ |
| KDI ステータス | TODO / DO / DONE の3段階（タップで切替） | ✅ |
| 納期ヘルス | 期限×達成率で **緊急 / 注意 / Good** を表示（KPI に最悪値を集約） | ✅ |
| インライン編集 | KGI・KPI・KDI のタイトルをダブルクリックで修正 | ✅ |
| 期限編集 | KDI ごとにカレンダーで期限日を設定・変更 | ✅ |
| AI分解 | 選択中の KGI から Gemini が KPI / KDI を提案 → 採用で DB 保存 | ✅ |
| 週次 Check | 日曜始まりの週単位（日〜土）。日曜に振り返り → 当日は先週分をデフォルト表示 | ✅ |
| 手動 Adjust | 振り返りから次週の Adjust アイテムを追加・完了管理 | ✅ |
| AI週次コーチ | 達成率・履歴をもとにコーチ所見 + KDI 調整案を提案 → 採用 | ✅ |
| 共有 URL | `/share/[token]` で読み取り専用ビュー | ✅ |
| プレビュー | `/preview` でモックデータのデモ表示 | ✅ |

### 納期ヘルスの判定

| 表示 | 条件 |
|------|------|
| **緊急** | 期限を過ぎていて、まだ DONE でない |
| **注意** | 期限まで3日以内 かつ 達成率 &lt; 70% |
| **Good** | 期限まで7日以上 かつ 達成率 ≥ 50% |

KPI カードには、配下 KDI のうち**最も悪い**ステータスを表示します。

---

## AI 機能（2本柱）

鬼速PDCA の **Plan** と **Check / Adjust** を、それぞれ別の AI が支援します。

| AI | 役割 | タイミング | 状態 |
|----|------|-----------|------|
| **AI分解** | KGI から KPI / KDI の計画草案を生成 | 目標設定・計画見直し時 | ✅ 利用可能 |
| **AI週次コーチ** | 今週の結果をレビューし、Adjust 提案 + ダメ出し | 週次振り返り時 | ✅ 利用可能 |

### AI分解の流れ（実装済み）

1. KGI を選択
2. 「AIでKPI/KDIを提案」をクリック
3. Gemini が課題（KPI）と KDI の草案を生成
4. プレビューで確認 → **採用して追加** または **再生成**（修正指示付き）

### AI週次コーチの流れ（実装済み）

専属コーチ AI が、数値と振り返りをもとに**プランへのフィードバック**を返します。「書いて終わり」ではなく、**Adjust が KDI ボードに反映される**ことを狙います。

**入力（AI が参照する情報）**

- 選択中 KGI 配下の KPI / KDI（達成率・ステータス・期限・納期ヘルス）
- 今週の Check（振り返り）。空でもコーチは動作
- 直近 2〜3 週の振り返り・Adjust 完了状況
- 同じ Adjust が 2 週連続未達の場合は、より強めに指摘

**出力**

1. **コーチ所見** — うまくいった点・ダメ出し・パターン指摘
2. **Adjust 提案リスト** — KDI の追加・期限変更・ステータス変更など（Phase 1 は KDI のみ）

**操作フロー（AI分解と同型）**

1. Check を書く（任意で「振り返り下書き」ボタン）
2. 「AIコーチに今週をレビュー」をクリック
3. 所見 + 提案をプレビュー
4. **個別 / 一括で採用** → KDI ボードに反映、または **再生成**（「もっと厳しく」等）

**保存**

- 週ごとにコーチ所見・提案 JSON を DB に保存
- 採用した Adjust はログとして残し、翌週以降のコーチが参照

**共有時のプライバシー**

- 共有 URL（`/share/...`）では **Check（振り返り）は表示**
- **AI コーチの所見・ダメ出しは非公開**（個人のコーチング空間として扱う）

---

## 技術スタック

| レイヤ | 技術 |
|--------|------|
| フロントエンド | Next.js 16（App Router）, React 19, Tailwind CSS 4, shadcn/ui |
| バックエンド | Next.js API Routes |
| データベース | Neon PostgreSQL（`@neondatabase/serverless`） |
| AI | Google Gemini 2.5 Flash（`GEMINI_API_KEY`） |
| 認証 | NextAuth + Google OAuth（実装済み。メイン画面はソロユーザー運用） |
| ホスティング | Vercel |

---

## 画面・ルート

| パス | 説明 |
|------|------|
| `/` | メインボード（編集可能） |
| `/preview` | モックデータの読み取り専用プレビュー |
| `/share/[token]` | 共有トークンによる読み取り専用表示 |
| `/login` | Google ログイン |

---

## ローカル開発

### 1. クローンとインストール

```bash
git clone https://github.com/uwanomovie-ops/oni-pdca-app.git
cd oni-pdca-app
npm install
```

### 2. 環境変数

```bash
cp .env.example .env.local
```

| 変数 | 必須 | 説明 |
|------|------|------|
| `DATABASE_URL` | ✅ | Neon の接続文字列 |
| `GEMINI_API_KEY` | AI利用時 | [Google AI Studio](https://aistudio.google.com/apikey) で取得 |
| `NEXTAUTH_URL` | ログイン時 | 例: `http://localhost:3000` |
| `NEXTAUTH_SECRET` | ログイン時 | 任意の長いランダム文字列 |
| `GOOGLE_CLIENT_ID` | ログイン時 | Google OAuth |
| `GOOGLE_CLIENT_SECRET` | ログイン時 | Google OAuth |

### 3. データベース

1. [Neon](https://neon.tech) でプロジェクトを作成
2. SQL Editor で `db/schema.sql` を実行
3. 既存 DB を使っている場合は `db/migrations/002_coach_columns.sql` と `003_ai_coach_kdi_mark.sql` も実行

### 4. 起動

```bash
npm run dev
```

http://localhost:3000 を開きます。

### 5. デモデータ（任意）

```bash
npm run seed:demo        # 既存ワークスペースにタスク・レビューを追加
npm run seed:preview     # /preview と同じ内容に差し替え
npm run seed:check-demo  # Check/Adjust デモ（振り返り + AIコーチ提案）
npm run seed:coach-reset # AIコーチ採用ログリセット + 提案再生成
```

### その他のコマンド

```bash
npm run build    # 本番ビルド
npm run start    # 本番サーバー起動
npm run lint     # ESLint
```

---

## Vercel デプロイ

1. GitHub リポジトリを Vercel にインポート
2. 環境変数を設定（最低限 `DATABASE_URL`、AI 利用時は `GEMINI_API_KEY`）
3. デプロイ

本番環境変数は GitHub にコミットしないでください（`.env.local` は `.gitignore` 済み）。

---

## プロジェクト構成（主要ファイル）

```
src/
  app/
    api/ai/breakdown/   # AI分解 API（実装済み）
    api/ai/coach/       # AI週次コーチ API
  components/           # 4ペイン UI（Board, KGIPane, KPIPane, KDIPane, ReviewPane）
  lib/                  # DB, 型, ユーティリティ（達成率・納期ヘルス）
db/schema.sql           # Neon 用スキーマ
scripts/seed-demo.mjs   # デモデータ投入
docs-site/              # 設計・振り返り用静的ドキュメント（任意）
```

---

## 開発ロードマップ

| Phase | 内容 |
|-------|------|
| **1（提出 MVP）** | ✅ AI週次コーチ、Check / Adjust UI |
| **2** | 手動 Adjust の KDI 紐づけ、AI コーチの KPI レベル提案 |
| **3** | 共有画面での公開範囲設定、コーチ口調のカスタム |

---

## スクリーンショット

提出用の画面キャプチャは、本番 URL を開いて4ペインが見える状態で撮影してください。

- メインボード: https://oni-pdca-app.vercel.app
- 画像をリポジトリに追加する場合は `public/readme-board.png` に置き、以下のように参照できます:

```markdown
![メインボード](./public/readme-board.png)
```

---

## ライセンス

個人学習・課題提出用プロジェクト
