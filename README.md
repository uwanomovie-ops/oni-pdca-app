# 鬼速PDCA

第二領域（重要だが緊急でない）の目標を、**KGI → KPI → KDI → Check/Action** の4ペインで1画面管理する Web アプリです。

## 機能

- **4ペインボード** — 最終目標（KGI）・課題（KPI）・行動指標（KDI）・週次振り返りを横並びで表示
- **達成率の自動集計** — KDI の達成率が KPI / KGI に自動反映
- **KDI ステータス** — TODO / DO / DONE の3段階
- **インライン編集** — タイトルをダブルクリックで修正
- **共有 URL** — 読み取り専用ビュー（ログイン不要）
- **プレビューモード** — `/preview` で DB なしのデモ表示

## 技術スタック

| 項目 | 技術 |
|------|------|
| フレームワーク | Next.js 16（App Router） |
| UI | React 19, Tailwind CSS 4, shadcn/ui |
| データベース | Neon PostgreSQL |
| 認証 | NextAuth + Google OAuth（コード実装済み、メイン画面はソロユーザー運用） |

## セットアップ

### 1. 依存関係のインストール

```bash
npm install
```

### 2. 環境変数

`.env.example` をコピーして `.env.local` を作成し、値を設定します。

```bash
cp .env.example .env.local
```

**最低限必要な変数**

| 変数 | 説明 |
|------|------|
| `DATABASE_URL` | Neon の接続文字列 |

`/login`（Google ログイン）を使う場合は `NEXTAUTH_*` と `GOOGLE_*` も設定してください。

### 3. データベース

[Neon](https://neon.tech) でプロジェクトを作成し、SQL Editor で `db/schema.sql` を実行します。

### 4. 開発サーバー

```bash
npm run dev
```

http://localhost:3000 を開きます。

### 5. デモデータ（任意）

```bash
npm run seed:demo      # 既存データにタスク・レビューを追加
npm run seed:preview   # /preview と同じ内容に差し替え
```

## ルート一覧

| パス | 説明 |
|------|------|
| `/` | メインボード（編集可能） |
| `/preview` | モックデータの読み取り専用プレビュー |
| `/share/[token]` | 共有トークンによる読み取り専用表示 |
| `/login` | Google ログイン |

## 公開 URL

- **本番:** https://oni-pdca-app.vercel.app
- **プレビュー（DB不要）:** https://oni-pdca-app.vercel.app/preview

## デプロイ（Vercel）

1. GitHub リポジトリを Vercel にインポート
2. 環境変数に `DATABASE_URL`（および必要なら NextAuth / Google 関連）を設定
3. デプロイ

## ライセンス

個人学習・課題提出用プロジェクト
