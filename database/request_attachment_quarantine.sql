-- Applied: request_attachment_quarantine and request_scan_immutable_object_gate.
alter table public.family_member_requests add column if not exists attachment_scan_status text not null default 'pending' check (attachment_scan_status in ('pending','awaiting_scanner','clean','blocked','error'));
alter table public.family_member_requests add column if not exists attachment_scanned_at timestamptz;
alter table public.family_member_requests add column if not exists attachment_scan_note text;
alter table public.family_member_requests add column if not exists attachment_sha256 text;
revoke insert (attachment_scan_status,attachment_scanned_at,attachment_scan_note,attachment_sha256), update (attachment_scan_status,attachment_scanned_at,attachment_scan_note,attachment_sha256) on public.family_member_requests from authenticated,anon;
create policy "family_request_attachment_scan_gate" on storage.objects as restrictive for select to authenticated
using (bucket_id <> 'family-request-files' or exists (
 select 1 from public.family_member_requests r where r.attachment_requested and r.attachment_scan_status='clean'
 and storage.objects.name=r.user_id::text||'/'||r.id::text
));
create policy "family_request_attachment_scan_insert_gate" on storage.objects as restrictive for insert to authenticated
with check (bucket_id <> 'family-request-files' or exists (
 select 1 from public.family_member_requests r where r.user_id=(select auth.uid()) and r.attachment_requested
 and r.attachment_scan_status='pending' and r.attachment_sha256 is null
 and storage.objects.name=r.user_id::text||'/'||r.id::text
));