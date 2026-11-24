-- Applied to production via Supabase migration member_request_sender_identity_and_complaints.
-- No member records are copied into this repository.
alter table public.family_member_requests drop constraint if exists family_member_requests_kind_check;
alter table public.family_member_requests add constraint family_member_requests_kind_check check (kind in ('initiative','suggestion','occasion','solidarity','archive','complaint'));
create or replace function public.family_admin_request_senders(p_request_ids uuid[])
returns table(request_id uuid, full_name text, email text, phone text, whatsapp text, membership_number text, member_status text, submitted_at timestamptz)
language plpgsql stable security definer set search_path = ''
as $$
begin
 if auth.uid() is null or not public.family_is_admin() then
  raise exception 'Forbidden' using errcode='42501';
 end if;
 if p_request_ids is null or cardinality(p_request_ids)>200 then
  raise exception 'Invalid request batch' using errcode='22023';
 end if;
 return query select r.id,a.full_name,a.email,a.phone,a.whatsapp,a.membership_number,a.status,a.submitted_at
 from public.family_member_requests r
 left join lateral (select m.full_name,m.email,m.phone,m.whatsapp,m.membership_number,m.status,m.submitted_at
 from public.member_applications m where m.auth_user_id=r.user_id order by m.submitted_at desc limit 1) a on true
 where r.id=any(p_request_ids);
end;
$$;
revoke all on function public.family_admin_request_senders(uuid[]) from public, anon, authenticated;
grant execute on function public.family_admin_request_senders(uuid[]) to authenticated;
comment on function public.family_admin_request_senders(uuid[]) is 'Admin-only, live AAL2 authorization via family_is_admin; returns registered sender contact fields only for the selected requests. No public access.';

-- Historical announcement belongs in history, not genealogy. Restore the original section without changing its text or image.
update public.family_public_content set section='history'
where section='tree' and title='عائلة برهم | جذور وامتداد عبر فلسطين' and published=true;
