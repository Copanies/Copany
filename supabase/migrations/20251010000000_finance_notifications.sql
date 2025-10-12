-- Finance Notifications Migration
-- Add notification support for Distribute and Transaction features

-- 1) Add new notification types
alter type public.notification_type add value if not exists 'distribute_created';
alter type public.notification_type add value if not exists 'distribute_submitted';
alter type public.notification_type add value if not exists 'distribute_confirmed';
alter type public.notification_type add value if not exists 'transaction_created';
alter type public.notification_type add value if not exists 'transaction_confirmed';

-- 2) Add finance-related columns to notification table
alter table public.notification 
  add column if not exists distribute_id bigint,
  add column if not exists transaction_id bigint;

-- 3) Add foreign key constraints
alter table public.notification
  drop constraint if exists notification_distribute_fkey,
  add constraint notification_distribute_fkey
  foreign key (distribute_id) references public.distribute(id) on update cascade on delete cascade;

alter table public.notification
  drop constraint if exists notification_transaction_fkey,
  add constraint notification_transaction_fkey
  foreign key (transaction_id) references public.transactions(id) on update cascade on delete cascade;

-- 4) Add indexes for performance
create index if not exists idx_notification_distribute on public.notification (distribute_id);
create index if not exists idx_notification_transaction on public.notification (transaction_id);

-- 5) Update context constraint to include finance fields
alter table public.notification
  drop constraint if exists notification_context_check,
  add constraint notification_context_check
  check (
    copany_id is not null or 
    issue_id is not null or 
    comment_id is not null or 
    discussion_id is not null or 
    discussion_comment_id is not null or
    distribute_id is not null or
    transaction_id is not null
  );

-- 6) Distribute notification triggers

-- Function: notify on distribute create
create or replace function public.fn_notify_on_distribute_create()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor uuid := auth.uid();
begin
  -- 通知收款用户（to_user）
  -- 注意：当使用 admin 客户端时，auth.uid() 可能为 null
  if new.to_user is not null and (v_actor is null or new.to_user <> v_actor) then
    insert into public.notification(user_id, actor_id, copany_id, distribute_id, type, payload)
    values (
      new.to_user,
      v_actor,
      new.copany_id,
      new.id,
      'distribute_created',
      jsonb_build_object(
        'amount', new.amount,
        'currency', new.currency,
        'contribution_percent', new.contribution_percent
      )
    );
  end if;
  return new;
end $$;

drop trigger if exists trg_notify_on_distribute_create on public.distribute;
create trigger trg_notify_on_distribute_create
after insert on public.distribute
for each row
execute function public.fn_notify_on_distribute_create();

-- Function: notify on distribute status change
create or replace function public.fn_notify_on_distribute_status_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor uuid := auth.uid();
  v_owner uuid;
begin
  if new.status is distinct from old.status then
    -- 获取 copany owner
    select created_by into v_owner from public.copany where id = new.copany_id;
    
    -- -> in_review: 通知收款用户（to_user）
    if new.status = 'in_review' then
      if new.to_user is not null and (v_actor is null or new.to_user <> v_actor) then
        insert into public.notification(user_id, actor_id, copany_id, distribute_id, type, payload)
        values (
          new.to_user,
          v_actor,
          new.copany_id,
          new.id,
          'distribute_submitted',
          jsonb_build_object(
            'amount', new.amount,
            'currency', new.currency,
            'contribution_percent', new.contribution_percent
          )
        );
      end if;
    end if;
    
    -- -> confirmed: 通知 owner
    if new.status = 'confirmed' then
      if v_owner is not null and (v_actor is null or v_owner <> v_actor) then
        insert into public.notification(user_id, actor_id, copany_id, distribute_id, type, payload)
        values (
          v_owner,
          v_actor,
          new.copany_id,
          new.id,
          'distribute_confirmed',
          jsonb_build_object(
            'amount', new.amount,
            'currency', new.currency,
            'to_user', new.to_user
          )
        );
      end if;
    end if;
  end if;
  return new;
end $$;

drop trigger if exists trg_notify_on_distribute_status_change on public.distribute;
create trigger trg_notify_on_distribute_status_change
after update of status on public.distribute
for each row
execute function public.fn_notify_on_distribute_status_change();

-- 7) Transaction notification triggers

-- Function: notify on transaction create
create or replace function public.fn_notify_on_transaction_create()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor uuid := auth.uid();
  v_owner uuid;
begin
  -- 获取 copany owner
  select created_by into v_owner from public.copany where id = new.copany_id;
  
  -- 通知 owner（如果不是自己创建的）
  if v_owner is not null and (v_actor is null or v_owner <> v_actor) then
    insert into public.notification(user_id, actor_id, copany_id, transaction_id, type, payload)
    values (
      v_owner,
      v_actor,
      new.copany_id,
      new.id,
      'transaction_created',
      jsonb_build_object(
        'type', new.type,
        'amount', new.amount,
        'currency', new.currency,
        'description', coalesce(new.description, '')
      )
    );
  end if;
  return new;
end $$;

drop trigger if exists trg_notify_on_transaction_create on public.transactions;
create trigger trg_notify_on_transaction_create
after insert on public.transactions
for each row
execute function public.fn_notify_on_transaction_create();

-- Function: notify on transaction confirm
create or replace function public.fn_notify_on_transaction_confirm()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor uuid := auth.uid();
begin
  -- 状态从 in_review 变为 confirmed 时通知提交者
  if new.status = 'confirmed' and old.status = 'in_review' then
    if new.actor_id is not null and (v_actor is null or new.actor_id <> v_actor) then
      insert into public.notification(user_id, actor_id, copany_id, transaction_id, type, payload)
      values (
        new.actor_id,
        v_actor,
        new.copany_id,
        new.id,
        'transaction_confirmed',
        jsonb_build_object(
          'type', new.type,
          'amount', new.amount,
          'currency', new.currency,
          'description', coalesce(new.description, '')
        )
      );
    end if;
  end if;
  return new;
end $$;

drop trigger if exists trg_notify_on_transaction_confirm on public.transactions;
create trigger trg_notify_on_transaction_confirm
after update of status on public.transactions
for each row
execute function public.fn_notify_on_transaction_confirm();

