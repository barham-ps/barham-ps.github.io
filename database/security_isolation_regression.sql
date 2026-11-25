-- Read-only regression with a fabricated, nonexistent identity, not a real member.
-- Run only by an authorized database operator. No user rows or tokens are printed.
BEGIN;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-000000000001","role":"authenticated","aal":"aal2","session_id":"00000000-0000-4000-8000-000000000002"}',true);
SELECT NOT public.family_is_admin() AS forged_aal2_denied,
 (SELECT count(*) FROM public.member_applications)=0 AS applications_denied,
 (SELECT count(*) FROM public.family_lineage)=0 AS lineage_denied,
 (SELECT count(*) FROM public.family_member_requests)=0 AS requests_denied,
 (SELECT count(*) FROM public.family_member_notices)=0 AS notices_denied,
 (SELECT count(*) FROM public.family_member_content)=0 AS member_content_denied,
 (SELECT count(*) FROM public.family_profiles)=0 AS profiles_denied;
DO $$
BEGIN
 IF public.family_is_admin() OR EXISTS(SELECT 1 FROM public.member_applications) OR EXISTS(SELECT 1 FROM public.family_lineage) OR EXISTS(SELECT 1 FROM public.family_member_requests) OR EXISTS(SELECT 1 FROM public.family_member_notices) OR EXISTS(SELECT 1 FROM public.family_member_content) OR EXISTS(SELECT 1 FROM public.family_profiles) THEN
   RAISE EXCEPTION 'Synthetic identity isolation regression failed';
 END IF;
END $$;
ROLLBACK;
