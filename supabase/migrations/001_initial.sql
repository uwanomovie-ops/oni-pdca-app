-- 鬼速PDCA App - Initial Schema

create extension if not exists "pgcrypto";

-- Workspaces (one per user, auto-created on sign up)
create table if not exists workspaces (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  name text not null default '鬼速PDCAボード',
  share_token text unique not null default encode(gen_random_bytes(16), 'hex'),
  created_at timestamptz not null default now()
);

-- Goals (第二領域の目標)
create table if not exists goals (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid references workspaces(id) on delete cascade not null,
  title text not null,
  description text,
  due_date date,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

-- Issues (課題: Goal を達成するための課題)
create table if not exists issues (
  id uuid primary key default gen_random_uuid(),
  goal_id uuid references goals(id) on delete cascade not null,
  title text not null,
  description text,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

-- Tasks (タスク: Issue を解決するための具体的アクション)
create table if not exists tasks (
  id uuid primary key default gen_random_uuid(),
  issue_id uuid references issues(id) on delete cascade not null,
  title text not null,
  description text,
  status text not null default 'todo' check (status in ('todo', 'in_progress', 'done')),
  achievement_rate int not null default 0 check (achievement_rate >= 0 and achievement_rate <= 100),
  due_date date,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

-- Weekly Reviews (週次振り返り)
create table if not exists reviews (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid references workspaces(id) on delete cascade not null,
  goal_id uuid references goals(id) on delete cascade,
  week_start date not null,
  reflection text,
  created_at timestamptz not null default now(),
  unique (workspace_id, goal_id, week_start)
);

-- Action Items (Actionアイテム: 振り返りから生まれた次の行動)
create table if not exists action_items (
  id uuid primary key default gen_random_uuid(),
  review_id uuid references reviews(id) on delete cascade not null,
  title text not null,
  is_done boolean not null default false,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

-- ───── Row Level Security ─────

alter table workspaces enable row level security;
alter table goals enable row level security;
alter table issues enable row level security;
alter table tasks enable row level security;
alter table reviews enable row level security;
alter table action_items enable row level security;

create policy "owner_all_workspaces" on workspaces
  for all using (user_id = auth.uid());

create policy "owner_all_goals" on goals
  for all using (
    workspace_id in (select id from workspaces where user_id = auth.uid())
  );

create policy "owner_all_issues" on issues
  for all using (
    goal_id in (
      select g.id from goals g
      join workspaces w on w.id = g.workspace_id
      where w.user_id = auth.uid()
    )
  );

create policy "owner_all_tasks" on tasks
  for all using (
    issue_id in (
      select i.id from issues i
      join goals g on g.id = i.goal_id
      join workspaces w on w.id = g.workspace_id
      where w.user_id = auth.uid()
    )
  );

create policy "owner_all_reviews" on reviews
  for all using (
    workspace_id in (select id from workspaces where user_id = auth.uid())
  );

create policy "owner_all_action_items" on action_items
  for all using (
    review_id in (
      select r.id from reviews r
      join workspaces w on w.id = r.workspace_id
      where w.user_id = auth.uid()
    )
  );

-- Auto-create workspace on first sign in
create or replace function handle_new_user()
returns trigger as $$
begin
  insert into workspaces (user_id, name)
  values (new.id, '鬼速PDCAボード');
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure handle_new_user();
