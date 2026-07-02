-- AI KPI/KDI 提案の「採用して追加」で追加された KPI・KDI を識別
alter table issues
  add column if not exists ai_breakdown_added boolean not null default false;

alter table tasks
  add column if not exists ai_breakdown_added boolean not null default false;
