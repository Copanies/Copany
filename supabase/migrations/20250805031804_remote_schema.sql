create policy "copany-logos policy 138r3sz_0"
on "storage"."objects"
as permissive
for delete
to authenticated
using ((bucket_id = 'copany-logos'::text));


create policy "copany-logos policy 138r3sz_1"
on "storage"."objects"
as permissive
for insert
to authenticated
with check ((bucket_id = 'copany-logos'::text));


create policy "copany-logos policy 138r3sz_2"
on "storage"."objects"
as permissive
for select
to authenticated
using ((bucket_id = 'copany-logos'::text));


create policy "copany-logos policy 138r3sz_3"
on "storage"."objects"
as permissive
for update
to authenticated
using ((bucket_id = 'copany-logos'::text));



