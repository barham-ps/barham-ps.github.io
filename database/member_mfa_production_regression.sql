-- Run as an authorized operator in a single transaction; synthetic identities only.
-- ROLLBACK is mandatory. This tests database claims and policies, not real Auth/MFA enrollment.
BEGIN;
SET LOCAL statement_timeout='20s';
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
INSERT INTO public.family_lineage(user_id,relative_name,relationship) VALUES
('fd800000-4aa1-4d01-8000-000000000001','Synthetic relative A','other'),
('fd800000-4aa1-4d01-8000-000000000002','Synthetic relative B','other');
INSERT INTO public.family_correspondence(user_id,department,subject,body) VALUES
('fd800000-4aa1-4d01-8000-000000000001','support','Synthetic message A','Synthetic fixture A'),
('fd800000-4aa1-4d01-8000-000000000002','support','Synthetic message B','Synthetic fixture B');
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
 IF NOT EXISTS(SELECT 1 FROM public.family_lineage WHERE user_id='fd800000-4aa1-4d01-8000-000000000001') OR
 EXISTS(SELECT 1 FROM public.family_lineage WHERE user_id='fd800000-4aa1-4d01-8000-000000000002') OR
 NOT EXISTS(SELECT 1 FROM public.family_correspondence WHERE user_id='fd800000-4aa1-4d01-8000-000000000001') OR
 EXISTS(SELECT 1 FROM public.family_correspondence WHERE user_id='fd800000-4aa1-4d01-8000-000000000002') THEN
 RAISE EXCEPTION 'Lineage or correspondence isolation failed'; END IF;
 INSERT INTO public.family_correspondence(department,subject,body) VALUES('support','Synthetic 2','Synthetic fixture 2'),('support','Synthetic 3','Synthetic fixture 3');
 BEGIN
 INSERT INTO public.family_correspondence(department,subject,body) VALUES('support','Synthetic 4','Synthetic fixture 4');
 RAISE EXCEPTION 'Correspondence limit missing';
 EXCEPTION WHEN SQLSTATE 'PT429' THEN NULL; END;
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
RESET ROLE;
INSERT INTO auth.mfa_factors(id,user_id,factor_type,status,created_at,updated_at) VALUES
('fd800000-4aa1-4d03-8000-000000000002','fd800000-4aa1-4d01-8000-000000000002','totp','verified',now(),now());
SET LOCAL ROLE authenticated;
DO $$ BEGIN
 IF EXISTS(SELECT 1 FROM public.family_profiles WHERE user_id='fd800000-4aa1-4d01-8000-000000000002') THEN RAISE EXCEPTION 'AAL1 enrolled member can read profile'; END IF;
 IF EXISTS(SELECT 1 FROM public.family_my_certificate()) THEN RAISE EXCEPTION 'AAL1 certificate leakage'; END IF;
 BEGIN
 PERFORM public.submit_family_application('Synthetic B','+970500000000','+970500000000',true);
 RAISE EXCEPTION 'AAL1 submission accepted';
 EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END $$;
SELECT set_config('request.jwt.claims','{"sub":"fd800000-4aa1-4d01-8000-000000000002","role":"authenticated","session_id":"fd800000-4aa1-4d02-8000-000000000002"}',true);
DO $$ BEGIN
 IF EXISTS(SELECT 1 FROM public.family_profiles WHERE user_id='fd800000-4aa1-4d01-8000-000000000002') THEN RAISE EXCEPTION 'Missing assurance was not denied'; END IF;
 BEGIN
 PERFORM public.submit_family_application('Synthetic B','+970500000000','+970500000000',true);
 RAISE EXCEPTION 'Missing assurance submission accepted';
 EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END $$;
SELECT set_config('request.jwt.claims','{"sub":"fd800000-4aa1-4d01-8000-000000000002","role":"authenticated","aal":"aal2","session_id":"fd800000-4aa1-4d02-8000-000000000002"}',true);
DO $$ BEGIN
 IF NOT EXISTS(SELECT 1 FROM public.family_profiles WHERE user_id='fd800000-4aa1-4d01-8000-000000000002') OR EXISTS(SELECT 1 FROM public.family_profiles WHERE user_id='fd800000-4aa1-4d01-8000-000000000001') THEN RAISE EXCEPTION 'AAL2 isolation failed'; END IF;
 BEGIN PERFORM public.family_admin_list(); RAISE EXCEPTION 'nonadmin RPC accepted'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END $$;
SELECT true AS member_mfa_and_isolation_passed;
ROLLBACK;
