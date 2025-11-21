-- App Store Connect credentials and finance data schema
-- 1) Table: app_store_connect_credentials
create table if not exists public.app_store_connect_credentials (
  id                    bigserial primary key,
  copany_id             bigint not null,
  iv                    text not null,  -- Encryption IV
  encrypted_private_key text not null,  -- Encrypted private key
  encrypted_key_id      text not null,  -- Encrypted Key ID
  encrypted_issuer_id   text not null,  -- Encrypted Issuer ID
  encrypted_vendor_number text not null,  -- Encrypted Vendor Number
  encrypted_app_sku     text not null,  -- Encrypted App SKU
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

-- Unique constraint: one credential per copany
create unique index if not exists idx_app_store_connect_credentials_copany_unique
  on public.app_store_connect_credentials(copany_id);

-- Foreign key
alter table public.app_store_connect_credentials
  drop constraint if exists app_store_connect_credentials_copany_fkey,
  add constraint app_store_connect_credentials_copany_fkey
  foreign key (copany_id) references public.copany(id) on update cascade on delete cascade;

-- Index
create index if not exists idx_app_store_connect_credentials_copany
  on public.app_store_connect_credentials(copany_id);

-- Updated_at trigger
create trigger set_updated_at_app_store_connect_credentials
before update on public.app_store_connect_credentials
for each row execute function public.set_updated_at();

-- 2) Table: app_store_finance_data
create table if not exists public.app_store_finance_data (
  id            bigserial primary key,
  copany_id     bigint not null,
  report_type   text not null,  -- Report type (e.g., FINANCE_DETAIL)
  region_code   text not null,  -- Region code (e.g., Z1)
  report_date   text not null,  -- Report date (YYYY-MM)
  raw_data      text,  -- Raw TSV data
  parsed_data   jsonb,  -- Parsed data {headers: string[], rows: string[][]}
  filtered_data jsonb,  -- Filtered data {headers: string[], rows: string[][]}
  created_at    timestamptz not null default now()
);

-- Foreign key
alter table public.app_store_finance_data
  drop constraint if exists app_store_finance_data_copany_fkey,
  add constraint app_store_finance_data_copany_fkey
  foreign key (copany_id) references public.copany(id) on update cascade on delete cascade;

-- Index
create index if not exists idx_app_store_finance_data_copany_date
  on public.app_store_finance_data(copany_id, report_date);

-- 3) Table: app_store_finance_chart_data
create table if not exists public.app_store_finance_chart_data (
  id                bigserial primary key,
  copany_id         bigint not null,
  date              text not null,  -- Date (YYYY-MM)
  amount_usd        numeric(18,2) not null,  -- Total amount in USD
  transaction_count integer not null,  -- Transaction count
  transactions      jsonb not null,  -- Transaction details array
  created_at        timestamptz not null default now()
);

-- Foreign key
alter table public.app_store_finance_chart_data
  drop constraint if exists app_store_finance_chart_data_copany_fkey,
  add constraint app_store_finance_chart_data_copany_fkey
  foreign key (copany_id) references public.copany(id) on update cascade on delete cascade;

-- Unique constraint: one record per copany per date
create unique index if not exists idx_app_store_finance_chart_data_copany_date_unique
  on public.app_store_finance_chart_data(copany_id, date);

-- Index
create index if not exists idx_app_store_finance_chart_data_copany_date
  on public.app_store_finance_chart_data(copany_id, date);

-- 4) RLS Policies
-- app_store_connect_credentials: No SELECT for authenticated users, only service_role can access
-- INSERT/UPDATE/DELETE: Only copany owner can modify (verified server-side)
alter table public.app_store_connect_credentials enable row level security;

-- Disable all SELECT for authenticated users (only service_role can access)
drop policy if exists "app_store_connect_credentials_no_select" on public.app_store_connect_credentials;
create policy "app_store_connect_credentials_no_select" on public.app_store_connect_credentials
  for select to authenticated using (false);

-- Disable INSERT/UPDATE/DELETE for authenticated users (only service_role can modify)
drop policy if exists "app_store_connect_credentials_no_modify" on public.app_store_connect_credentials;
create policy "app_store_connect_credentials_no_modify" on public.app_store_connect_credentials
  for all to authenticated using (false) with check (false);

-- app_store_finance_data: Public read, only service_role can modify
alter table public.app_store_finance_data enable row level security;

-- Public SELECT
drop policy if exists "app_store_finance_data_select_public" on public.app_store_finance_data;
create policy "app_store_finance_data_select_public" on public.app_store_finance_data
  for select to public using (true);

-- Disable INSERT/UPDATE/DELETE for authenticated users (only service_role can modify)
drop policy if exists "app_store_finance_data_no_modify" on public.app_store_finance_data;
create policy "app_store_finance_data_no_modify" on public.app_store_finance_data
  for all to authenticated using (false) with check (false);

-- app_store_finance_chart_data: Public read, only service_role can modify
alter table public.app_store_finance_chart_data enable row level security;

-- Public SELECT
drop policy if exists "app_store_finance_chart_data_select_public" on public.app_store_finance_chart_data;
create policy "app_store_finance_chart_data_select_public" on public.app_store_finance_chart_data
  for select to public using (true);

-- Disable INSERT/UPDATE/DELETE for authenticated users (only service_role can modify)
drop policy if exists "app_store_finance_chart_data_no_modify" on public.app_store_finance_chart_data;
create policy "app_store_finance_chart_data_no_modify" on public.app_store_finance_chart_data
  for all to authenticated using (false) with check (false);

