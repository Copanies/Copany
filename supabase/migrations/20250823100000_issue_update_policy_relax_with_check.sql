-- Relax WITH CHECK for issue update policy so current assignee can reassign/unassign

-- Recreate update policy: keep USING (old row permission), relax WITH CHECK (new row only requires auth)
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
);


