-- Create cover image storage bucket and policies

-- 1) Create storage bucket for cover images
insert into storage.buckets (id, name, public, file_size_limit)
values ('copany-cover-images', 'copany-cover-images', true, 20971520)
on conflict (id) do nothing;

-- 2) Storage policies for copany-cover-images (allow authenticated users to upload/read/update/delete)
drop policy if exists "copany-cover-images policy read" on storage.objects;
create policy "copany-cover-images policy read" on storage.objects
for select to authenticated
using ( bucket_id = 'copany-cover-images' );

drop policy if exists "copany-cover-images policy insert" on storage.objects;
create policy "copany-cover-images policy insert" on storage.objects
for insert to authenticated
with check ( bucket_id = 'copany-cover-images' );

drop policy if exists "copany-cover-images policy update" on storage.objects;
create policy "copany-cover-images policy update" on storage.objects
for update to authenticated
using ( bucket_id = 'copany-cover-images' )
with check ( bucket_id = 'copany-cover-images' );

drop policy if exists "copany-cover-images policy delete" on storage.objects;
create policy "copany-cover-images policy delete" on storage.objects
for delete to authenticated
using ( bucket_id = 'copany-cover-images' );
