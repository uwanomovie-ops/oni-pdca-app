-- AI週次コーチ採用で追加された KDI を識別
alter table tasks
  add column if not exists ai_coach_added boolean not null default false;
