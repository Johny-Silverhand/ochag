-- Операционный снимок сети «Очаг».
-- Документ совпадает с клиентским Snapshot: филиалы, штат, склад, чеки, смены, банкеты.
-- Это рабочее хранилище на Postgres / Neon (OCHAG_STORE=postgres или DATABASE_URL).

create table if not exists ops_state (
  id         text primary key,
  payload    jsonb not null,
  updated_at timestamptz not null default now()
);

create index if not exists ops_state_updated_at_idx on ops_state (updated_at desc);
