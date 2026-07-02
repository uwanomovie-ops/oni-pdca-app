-- 鬼速PDCA App — Neon Schema

-- Users (managed by NextAuth + Google OAuth)
create table if not exists users (
  id          uuid primary key default gen_random_uuid(),
  google_id   text unique not null,
  email       text unique not null,
  name        text,
  created_at  timestamptz not null default now()
);

-- Workspaces (one per user)
create table if not exists workspaces (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid references users(id) on delete cascade not null,
  name         text not null default '鬼速PDCAボード',
  share_token  text unique not null default replace(gen_random_uuid()::text, '-', ''),
  created_at   timestamptz not null default now()
);

-- Goals (KGI: 最終目標)
create table if not exists goals (
  id            uuid primary key default gen_random_uuid(),
  workspace_id  uuid references workspaces(id) on delete cascade not null,
  title         text not null,
  description   text,
  due_date      date,
  sort_order    int not null default 0,
  created_at    timestamptz not null default now()
);

-- Issues (課題: KGIを阻む課題)
create table if not exists issues (
  id          uuid primary key default gen_random_uuid(),
  goal_id     uuid references goals(id) on delete cascade not null,
  title       text not null,
  description text,
  sort_order  int not null default 0,
  ai_breakdown_added boolean not null default false,
  created_at  timestamptz not null default now()
);

-- Tasks (KDI: 具体的な行動指標)
create table if not exists tasks (
  id               uuid primary key default gen_random_uuid(),
  issue_id         uuid references issues(id) on delete cascade not null,
  title            text not null,
  description      text,
  status           text not null default 'todo' check (status in ('todo', 'in_progress', 'done')),
  achievement_rate int not null default 0 check (achievement_rate >= 0 and achievement_rate <= 100),
  due_date         date,
  sort_order       int not null default 0,
  ai_coach_added   boolean not null default false,
  ai_breakdown_added boolean not null default false,
  created_at       timestamptz not null default now()
);

-- Weekly Reviews (週次振り返り + AIコーチ)
create table if not exists reviews (
  id                 uuid primary key default gen_random_uuid(),
  workspace_id       uuid references workspaces(id) on delete cascade not null,
  goal_id            uuid references goals(id) on delete cascade,
  week_start         date not null,
  reflection         text,
  coach_feedback     text,
  coach_proposals    jsonb,
  coach_applied_log  jsonb,
  created_at         timestamptz not null default now(),
  unique (workspace_id, goal_id, week_start)
);

-- Action Items (Actionアイテム)
create table if not exists action_items (
  id          uuid primary key default gen_random_uuid(),
  review_id   uuid references reviews(id) on delete cascade not null,
  title       text not null,
  is_done     boolean not null default false,
  sort_order  int not null default 0,
  created_at  timestamptz not null default now()
);
