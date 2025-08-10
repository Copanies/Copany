drop policy "Enable insert for authenticated users only" on "public"."copany";
create policy "Enable insert for authenticated users only"
on "public"."copany"
as permissive
for insert
to authenticated
with check (true);
