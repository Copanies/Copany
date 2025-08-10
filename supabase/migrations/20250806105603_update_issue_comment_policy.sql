drop policy "Enable update for users based on created_by" on "public"."issue_comment";
alter table "public"."issue_comment" add column "replies" bigint[];
alter table "public"."issue_comment" alter column "content" drop not null;
alter table "public"."issue_comment" alter column "created_by" drop not null;
alter table "public"."issue_comment" alter column "issue_id" drop not null;
create policy "Enable update for users based on user_id"
on "public"."issue_comment"
as permissive
for update
to public
using ((( SELECT auth.uid() AS uid) = created_by))
with check ((( SELECT auth.uid() AS uid) = created_by));
