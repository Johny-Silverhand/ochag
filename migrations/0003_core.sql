-- Normalized schema for the café network (TZ stage 1).
-- Not opened at runtime yet: the app uses the in-memory / JSON repository.
-- Apply these when DATABASE_URL is plugged in, then implement src/lib/repo/postgres.ts.

create table if not exists branches (
  id         text primary key,
  name       text not null,
  short      text not null,
  city       text not null,
  address    text not null,
  seats      integer not null default 0,
  phone      text not null default ''
);

create table if not exists staff_users (
  id            text primary key,
  name          text not null,
  email         text not null unique,
  password_hash text not null,
  pin_hash      text not null,
  role          text not null check (role in ('owner', 'manager', 'cook', 'waiter')),
  position      text not null,
  branch_id     text references branches(id),
  shift_pay     numeric(12,2) not null default 0,
  sales_percent numeric(6,2) not null default 0,
  phone         text not null default ''
);

create table if not exists products (
  id       text primary key,
  name     text not null,
  category text not null,
  unit     text not null,
  min_qty  numeric(12,3) not null default 0,
  avg_cost numeric(12,4) not null default 0
);

create table if not exists recipes (
  id             text primary key,
  name           text not null,
  category       text not null,
  price          numeric(12,2) not null,
  yield_portions numeric(12,3) not null default 1
);

create table if not exists recipe_items (
  recipe_id  text not null references recipes(id) on delete cascade,
  product_id text not null references products(id),
  qty        numeric(12,4) not null,
  primary key (recipe_id, product_id)
);

create table if not exists stock_levels (
  branch_id  text not null references branches(id),
  product_id text not null references products(id),
  qty        numeric(14,3) not null default 0,
  avg_cost   numeric(12,4) not null default 0,
  primary key (branch_id, product_id)
);

create table if not exists stock_movements (
  id                     text primary key,
  at                     timestamptz not null,
  branch_id              text not null references branches(id),
  product_id             text not null references products(id),
  type                   text not null,
  qty                    numeric(14,3) not null,
  cost                   numeric(14,4) not null,
  reason                 text,
  note                   text,
  ref_id                 text,
  user_id                text not null,
  counterpart_branch_id  text references branches(id)
);

create index if not exists stock_movements_branch_at_idx on stock_movements (branch_id, at desc);

create table if not exists invoices (
  id          text primary key,
  number      text not null,
  branch_id   text not null references branches(id),
  supplier    text not null,
  date        date not null,
  total       numeric(14,2) not null,
  user_id     text not null
);

create table if not exists invoice_lines (
  invoice_id text not null references invoices(id) on delete cascade,
  product_id text not null references products(id),
  qty        numeric(14,3) not null,
  price      numeric(12,4) not null,
  primary key (invoice_id, product_id)
);

create table if not exists shifts (
  id            text primary key,
  branch_id     text not null references branches(id),
  date          date not null,
  status        text not null check (status in ('open', 'closed')),
  opened_at     timestamptz not null,
  closed_at     timestamptz,
  opened_by     text not null,
  closed_by     text,
  open_cash     numeric(14,2) not null default 0,
  close_cash    numeric(14,2),
  expected_cash numeric(14,2),
  discrepancy   numeric(14,2),
  cash_total    numeric(14,2) not null default 0,
  card_total    numeric(14,2) not null default 0,
  qr_total      numeric(14,2) not null default 0,
  staff_ids     jsonb not null default '[]'::jsonb,
  note          text
);

create table if not exists sales (
  id         text primary key,
  number     text not null,
  branch_id  text not null references branches(id),
  shift_id   text not null references shifts(id),
  at         timestamptz not null,
  total      numeric(14,2) not null,
  waiter_id  text not null,
  source     text not null,
  payments   jsonb not null
);

create table if not exists sale_items (
  sale_id      text not null references sales(id) on delete cascade,
  line_no      integer not null,
  recipe_id    text not null,
  name         text not null,
  qty          numeric(12,3) not null,
  price        numeric(12,2) not null,
  sum          numeric(14,2) not null,
  cost_at_sale numeric(14,4) not null,
  primary key (sale_id, line_no)
);

create table if not exists purchase_requests (
  id         text primary key,
  number     text not null,
  branch_id  text not null references branches(id),
  date       date not null,
  status     text not null,
  note       text,
  user_id    text not null,
  lines      jsonb not null
);

create table if not exists banquets (
  id           text primary key,
  number       text not null,
  branch_id    text not null references branches(id),
  title        text not null,
  client_name  text not null,
  client_phone text not null default '',
  date         date not null,
  start_time   text not null,
  end_time     text not null,
  guests       integer not null,
  hall         text not null,
  total        numeric(14,2) not null,
  deposit      numeric(14,2) not null default 0,
  deposit_paid boolean not null default false,
  status       text not null,
  notes        text not null default '',
  waiter_notes text not null default '',
  grill_items  jsonb not null default '[]'::jsonb,
  kitchen_items jsonb not null default '[]'::jsonb,
  service_items jsonb not null default '[]'::jsonb,
  timeline     jsonb not null default '[]'::jsonb
);

create table if not exists expenses (
  id         text primary key,
  branch_id  text not null references branches(id),
  date       date not null,
  category   text not null,
  amount     numeric(14,2) not null,
  note       text not null default '',
  kind       text not null check (kind in ('fixed', 'variable'))
);

create table if not exists payroll_accruals (
  id         text primary key,
  user_id    text not null,
  branch_id  text not null references branches(id),
  date       date not null,
  shift_id   text not null,
  hours      numeric(8,2) not null,
  base       numeric(14,2) not null,
  bonus      numeric(14,2) not null,
  total      numeric(14,2) not null
);

create table if not exists revisions (
  id         text primary key,
  branch_id  text not null references branches(id),
  date       date not null,
  status     text not null,
  user_id    text not null,
  note       text,
  lines      jsonb not null
);

create table if not exists stop_list (
  id          text primary key,
  branch_id   text not null references branches(id),
  recipe_id   text not null,
  reason      text not null,
  note        text,
  created_at  timestamptz not null,
  created_by  text not null,
  cleared_at  timestamptz,
  cleared_by  text
);

create index if not exists stop_list_active_idx on stop_list (branch_id) where cleared_at is null;
