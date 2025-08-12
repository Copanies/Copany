-- Tighten issue update policy: only copany owner, issue creator, or issue assignee can update

-- Drop overly permissive policy if it exists
do $$
begin
  if exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'issue'
      and policyname = 'Enable update for authenticated users only'
  ) then
    drop policy "Enable update for authenticated users only" on public.issue;
  end if;
exception when others then
  null;
end $$;

-- Drop existing restrictive policy first if it exists, then recreate
drop policy if exists "issue_update_by_author_assignee_owner" on public.issue;
create policy "issue_update_by_author_assignee_owner"
on public.issue
for update
to authenticated
using (
  auth.uid() is not null
  and (
    created_by = auth.uid()
    or assignee = auth.uid()
    or exists (
      select 1 from public.copany c
      where c.id = copany_id and c.created_by = auth.uid()
    )
  )
)
with check (
  auth.uid() is not null
  and (
    created_by = auth.uid()
    or assignee = auth.uid()
    or exists (
      select 1 from public.copany c
      where c.id = copany_id and c.created_by = auth.uid()
    )
  )
);


