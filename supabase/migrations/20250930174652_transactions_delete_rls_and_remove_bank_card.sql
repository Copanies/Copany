-- Add delete RLS policy for transactions table and remove bank_card_number from distribute table

-- 1) Add delete policy for transactions table
-- Allow deletion only by the actor (creator) and only when status is 'in_review'
drop policy if exists "transactions_delete_actor_in_review" on public.transactions;
create policy "transactions_delete_actor_in_review" on public.transactions for delete to authenticated using (
  transactions.actor_id = auth.uid() and transactions.status = 'in_review'
);

-- 2) Remove bank_card_number column from distribute table
alter table public.distribute drop column if exists bank_card_number;
