-- AI週次コーチ用カラム（reviews テーブル）
alter table reviews
  add column if not exists coach_feedback text,
  add column if not exists coach_proposals jsonb,
  add column if not exists coach_applied_log jsonb;
