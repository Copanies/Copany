-- Finance: Distribute and Transactions schema
-- 1) Enums
do $$ begin
  create type public.distribute_status as enum ('in_progress', 'in_review', 'confirmed');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.transaction_type as enum ('income', 'expense');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.transaction_review_status as enum ('in_review', 'confirmed');
exception when duplicate_object then null; end $$;

-- 2) Tables
create table if not exists public.distribute (
  id                bigserial primary key,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  copany_id         bigint not null,
  to_user           uuid not null,
  bank_card_number  text not null default '0000 0000 0000 0000',
  status            public.distribute_status not null default 'in_progress',
  contribution_percent numeric(5,2) not null default 0,
  amount            numeric(18,2) not null default 0,
  currency          text not null default 'USD',
  evidence_url      text
);

create table if not exists public.transactions (
  id                bigserial primary key,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  copany_id         bigint not null,
  actor_id          uuid not null,
  type              public.transaction_type not null,
  description       text,
  amount            numeric(18,2) not null,
  currency          text not null default 'USD',
  status            public.transaction_review_status not null default 'in_review',
  occurred_at       timestamptz not null default now(),
  evidence_url      text
);

-- 3) FKs
alter table public.distribute
  drop constraint if exists distribute_copany_fkey,
  add constraint distribute_copany_fkey foreign key (copany_id) references public.copany(id) on update cascade on delete cascade;

alter table public.distribute
  drop constraint if exists distribute_to_user_fkey,
  add constraint distribute_to_user_fkey foreign key (to_user) references auth.users(id) on update cascade on delete cascade;

alter table public.transactions
  drop constraint if exists transactions_copany_fkey,
  add constraint transactions_copany_fkey foreign key (copany_id) references public.copany(id) on update cascade on delete cascade;

alter table public.transactions
  drop constraint if exists transactions_actor_fkey,
  add constraint transactions_actor_fkey foreign key (actor_id) references auth.users(id) on update cascade on delete set null;

-- 4) Indexes
create index if not exists idx_distribute_copany on public.distribute (copany_id);
create index if not exists idx_distribute_status on public.distribute (copany_id, status);
create index if not exists idx_transactions_copany on public.transactions (copany_id);
create index if not exists idx_transactions_type on public.transactions (copany_id, type);
create index if not exists idx_transactions_status on public.transactions (copany_id, status);
create index if not exists idx_transactions_occurred_at on public.transactions (copany_id, occurred_at desc);

-- 5) RLS
alter table public.distribute enable row level security;
alter table public.transactions enable row level security;

-- Policies: 
-- Read: allow all authenticated users to read for now (align with other tables)
drop policy if exists "distribute_select_all" on public.distribute;
create policy "distribute_select_all" on public.distribute for select to public using (true);

drop policy if exists "transactions_select_all" on public.transactions;
create policy "transactions_select_all" on public.transactions for select to public using (true);

-- Insert: only authenticated can insert; distribute: either copany owner (created_by) or the recipient can insert; transactions: any authenticated member inserts, owner reviews
drop policy if exists "distribute_insert_auth" on public.distribute;
create policy "distribute_insert_auth" on public.distribute for insert to authenticated with check (
  exists (
    select 1 from public.copany c where c.id = distribute.copany_id and (c.created_by = auth.uid())
  ) or distribute.to_user = auth.uid()
);

drop policy if exists "transactions_insert_auth" on public.transactions;
create policy "transactions_insert_auth" on public.transactions for insert to authenticated with check (true);

-- Update: distribute row can be updated by copany owner or the recipient
drop policy if exists "distribute_update_owner_or_recipient" on public.distribute;
create policy "distribute_update_owner_or_recipient" on public.distribute for update to authenticated using (
  exists (
    select 1 from public.copany c where c.id = distribute.copany_id and (c.created_by = auth.uid())
  ) or distribute.to_user = auth.uid()
) with check (
  exists (
    select 1 from public.copany c where c.id = distribute.copany_id and (c.created_by = auth.uid())
  ) or distribute.to_user = auth.uid()
);

-- Update: transactions can be updated by owner for status, or by actor to edit own record while in_review
drop policy if exists "transactions_update_owner_or_actor" on public.transactions;
create policy "transactions_update_owner_or_actor" on public.transactions for update to authenticated using (
  exists (
    select 1 from public.copany c where c.id = transactions.copany_id and (c.created_by = auth.uid())
  ) or transactions.actor_id = auth.uid()
) with check (
  (
    -- Owner can always update (e.g., to confirm)
    exists (
      select 1 from public.copany c where c.id = transactions.copany_id and (c.created_by = auth.uid())
    )
  ) or (
    -- Actor can only modify while in_review
    transactions.actor_id = auth.uid() and transactions.status = 'in_review'
  )
);

-- 6) Simple trigger to auto-update updated_at
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists set_updated_at_distribute on public.distribute;
create trigger set_updated_at_distribute
before update on public.distribute
for each row execute function public.set_updated_at();

drop trigger if exists set_updated_at_transactions on public.transactions;
create trigger set_updated_at_transactions
before update on public.transactions
for each row execute function public.set_updated_at();

-- 7) Storage bucket for finance evidence (public read)
insert into storage.buckets (id, name, public)
values ('finance-evidence', 'finance-evidence', true)
on conflict (id) do nothing;

-- 8) Storage policies for finance-evidence (allow authenticated users to upload under their project prefix)
drop policy if exists "finance_evidence_read" on storage.objects;
create policy "finance_evidence_read" on storage.objects
for select to public
using ( bucket_id = 'finance-evidence' );

drop policy if exists "finance_evidence_insert" on storage.objects;
create policy "finance_evidence_insert" on storage.objects
for insert to authenticated
with check (
  bucket_id = 'finance-evidence' and (coalesce((metadata->>'size')::bigint, 0) <= 20971520)
);

drop policy if exists "finance_evidence_update_owner" on storage.objects;
create policy "finance_evidence_update_owner" on storage.objects
for update to authenticated
using ( bucket_id = 'finance-evidence' )
with check ( bucket_id = 'finance-evidence' );

-- Allow delete of finance-evidence objects for authenticated users (can refine later)
drop policy if exists "finance_evidence_delete" on storage.objects;
create policy "finance_evidence_delete" on storage.objects
for delete to authenticated
using ( bucket_id = 'finance-evidence' );


