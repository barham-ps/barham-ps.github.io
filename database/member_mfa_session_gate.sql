-- Proposed migration. Apply in a separate staging project first, after verifying all policies and recovery.
-- Enrolled members must use AAL2 for private member tables; unenrolled members are not locked out.
BEGIN;
CREATE OR REPLACE FUNCTION family_private.member_mfa_session_allowed()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO '' AS $$
 SELECT family_private.member_session_active() AND (
  NOT EXISTS (SELECT 1 FROM auth.mfa_factors f WHERE f.user_id=auth.uid() AND f.status='verified')
  OR auth.jwt()->>'aal'='aal2'
 );
$$;
REVOKE ALL ON FUNCTION family_private.member_mfa_session_allowed() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION family_private.member_mfa_session_allowed() TO authenticated;
DO $$
DECLARE t text;
BEGIN
 FOREACH t IN ARRAY ARRAY['member_applications','family_lineage','family_member_requests','family_member_notices','family_member_content','family_profiles'] LOOP
   IF NOT EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relname=t AND c.relrowsecurity) THEN
     RAISE EXCEPTION 'Missing RLS prerequisite for %',t;
   END IF;
   EXECUTE format('DROP POLICY IF EXISTS member_mfa_session_gate ON public.%I',t);
   EXECUTE format('CREATE POLICY member_mfa_session_gate ON public.%I AS RESTRICTIVE FOR ALL TO authenticated USING ((SELECT family_private.member_mfa_session_allowed())) WITH CHECK ((SELECT family_private.member_mfa_session_allowed()))',t);
 END LOOP;
END $$;
-- Private request attachments only; preserve other bucket behavior.
DROP POLICY IF EXISTS member_mfa_request_file_gate ON storage.objects;
CREATE POLICY member_mfa_request_file_gate ON storage.objects AS RESTRICTIVE FOR ALL TO authenticated
USING (bucket_id <> 'family-request-files' OR (SELECT family_private.member_mfa_session_allowed()))
WITH CHECK (bucket_id <> 'family-request-files' OR (SELECT family_private.member_mfa_session_allowed()));
COMMIT;
-- SECURITY DEFINER RPCs and other buckets require independent review; this does not enforce every RPC.
