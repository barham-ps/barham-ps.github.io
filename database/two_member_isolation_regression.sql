-- Owner-only transactional regression; never commit the fixture rows.
-- Synthetic users have no passwords, no real email addresses and no login tokens.
-- A positive result proves these tested RLS paths only, not full end-to-end authentication.
-- Execute as one batch in an authorized SQL editor. Always ROLLBACK; on any error roll back the session.
BEGIN;
SET LOCAL statement_timeout='15s';
INSERT INTO auth.users(id,email,role,aud,email_confirmed_at,created_at,updated_at) VALUES
('fd800000-4aa1-4d01-8000-000000000001','rls-test-a@example.invalid','authenticated','authenticated',now(),now(),now()),
('fd800000-4aa1-4d01-8000-000000000002','rls-test-b@example.invalid','authenticated','authenticated',now(),now(),now());
INSERT INTO auth.sessions(id,user_id,created_at,updated_at,aal,not_after) VALUES
('fd800000-4aa1-4d02-8000-000000000001','fd800000-4aa1-4d01-8000-000000000001',now(),now(),'aal1',now()+interval '5 minutes'),
('fd800000-4aa1-4d02-8000-000000000002','fd800000-4aa1-4d01-8000-000000000002',now(),now(),'aal1',now()+interval '5 minutes');
INSERT INTO public.member_applications(auth_user_id,full_name,email,consent_version,consented_at,status) VALUES
('fd800000-4aa1-4d01-8000-000000000001','Synthetic A','rls-test-a@example.invalid','test',now(),'approved'),
('fd800000-4aa1-4d01-8000-000000000002','Synthetic B','rls-test-b@example.invalid','test',now(),'approved');
INSERT INTO public.family_profiles(user_id,display_name,directory_opt_in) VALUES
('fd800000-4aa1-4d01-8000-000000000001','Synthetic A',false),
('fd800000-4aa1-4d01-8000-000000000002','Synthetic B',false);
INSERT INTO public.family_member_requests(user_id,kind,title,body) VALUES
('fd800000-4aa1-4d01-8000-000000000001','suggestion','Synthetic A','Synthetic fixture'),
('fd800000-4aa1-4d01-8000-000000000002','suggestion','Synthetic B','Synthetic fixture');
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims','{"sub":"fd800000-4aa1-4d01-8000-000000000001","role":"authenticated","aal":"aal1","session_id":"fd800000-4aa1-4d02-8000-000000000001"}',true);
DO $$
BEGIN
 IF public.family_is_admin() OR
 NOT EXISTS(SELECT 1 FROM public.family_profiles WHERE user_id='fd800000-4aa1-4d01-8000-000000000001') OR
 EXISTS(SELECT 1 FROM public.family_profiles WHERE user_id='fd800000-4aa1-4d01-8000-000000000002') OR
 NOT EXISTS(SELECT 1 FROM public.member_applications WHERE auth_user_id='fd800000-4aa1-4d01-8000-000000000001') OR
 EXISTS(SELECT 1 FROM public.member_applications WHERE auth_user_id='fd800000-4aa1-4d01-8000-000000000002') OR
 NOT EXISTS(SELECT 1 FROM public.family_member_requests WHERE user_id='fd800000-4aa1-4d01-8000-000000000001') OR
 EXISTS(SELECT 1 FROM public.family_member_requests WHERE user_id='fd800000-4aa1-4d01-8000-000000000002') THEN
 RAISE EXCEPTION 'Member A isolation failed'; END IF;
 UPDATE public.family_profiles SET display_name='Unauthorized test' WHERE user_id='fd800000-4aa1-4d01-8000-000000000002';
 IF FOUND THEN RAISE EXCEPTION 'Cross-member update allowed'; END IF;
END $$;
SELECT set_config('request.jwt.claims','{"sub":"fd800000-4aa1-4d01-8000-000000000002","role":"authenticated","aal":"aal1","session_id":"fd800000-4aa1-4d02-8000-000000000002"}',true);
DO $$
BEGIN
 IF public.family_is_admin() OR
 NOT EXISTS(SELECT 1 FROM public.family_profiles WHERE user_id='fd800000-4aa1-4d01-8000-000000000002') OR
 EXISTS(SELECT 1 FROM public.family_profiles WHERE user_id='fd800000-4aa1-4d01-8000-000000000001') OR
 NOT EXISTS(SELECT 1 FROM public.member_applications WHERE auth_user_id='fd800000-4aa1-4d01-8000-000000000002') OR
 EXISTS(SELECT 1 FROM public.member_applications WHERE auth_user_id='fd800000-4aa1-4d01-8000-000000000001') OR
 NOT EXISTS(SELECT 1 FROM public.family_member_requests WHERE user_id='fd800000-4aa1-4d01-8000-000000000002') OR
 EXISTS(SELECT 1 FROM public.family_member_requests WHERE user_id='fd800000-4aa1-4d01-8000-000000000001') THEN
 RAISE EXCEPTION 'Member B isolation failed'; END IF;
END $$;
SELECT true AS two_member_isolation_passed;
ROLLBACK;
