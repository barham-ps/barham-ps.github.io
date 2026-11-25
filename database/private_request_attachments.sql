-- Applied to production: private_member_request_attachments.
alter table public.family_member_requests add column if not exists attachment_requested boolean not null default false;
grant insert (attachment_requested) on public.family_member_requests to authenticated;
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values ('family-request-files','family-request-files',false,10485760,array['image/jpeg','application/pdf'])
on conflict (id) do nothing;
create policy "family_request_attachment_insert" on storage.objects for insert to authenticated
with check (bucket_id='family-request-files' and (select family_private.member_session_active()) and exists (
 select 1 from public.family_member_requests r
 where r.user_id=(select auth.uid()) and r.status='pending' and r.attachment_requested
 and storage.objects.name=r.user_id::text||'/'||r.id::text
));
create policy "family_request_attachment_read" on storage.objects for select to authenticated
using (bucket_id='family-request-files' and (select family_private.member_session_active()) and exists (
 select 1 from public.family_member_requests r
 where r.attachment_requested and storage.objects.name=r.user_id::text||'/'||r.id::text
 and (r.user_id=(select auth.uid()) or (select public.family_is_admin()))
));
create policy "family_request_attachment_admin_delete" on storage.objects for delete to authenticated
using (bucket_id='family-request-files' and (select public.family_is_admin()));
comment on column public.family_member_requests.attachment_requested is 'Member selected an optional private attachment; the object may still be pending upload. One immutable path per request, owner/admin access only.';
