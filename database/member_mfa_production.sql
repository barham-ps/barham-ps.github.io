-- Enforce MFA for enrolled users on private member tables and storage.
-- Enrolled members must use AAL2 for private member tables; unenrolled members are not locked out.
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
-- Private request attachments and archive only; preserve public content behavior.
DROP POLICY IF EXISTS member_mfa_request_file_gate ON storage.objects;
CREATE POLICY member_mfa_request_file_gate ON storage.objects AS RESTRICTIVE FOR ALL TO authenticated
USING (bucket_id NOT IN ('family-request-files','family-archive') OR (SELECT family_private.member_mfa_session_allowed()))
WITH CHECK (bucket_id NOT IN ('family-request-files','family-archive') OR (SELECT family_private.member_mfa_session_allowed()));


CREATE OR REPLACE FUNCTION public.family_my_certificate()
 RETURNS TABLE(full_name text, membership_number text, issued_at timestamp with time zone, verification_token uuid)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
select a.full_name,c.membership_number,c.issued_at,c.id
from public.member_certificates c join public.member_applications a on a.id=c.application_id
where family_private.member_mfa_session_allowed() and a.auth_user_id=auth.uid() and a.status='approved' and c.revoked_at is null
$function$;

CREATE OR REPLACE FUNCTION public.submit_family_application(p_name text, p_phone text, p_whatsapp text, p_consent boolean)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare u uuid := auth.uid(); e text;
begin
if u is null or p_consent is distinct from true or not family_private.member_mfa_session_allowed() then raise exception 'Authentication and consent required' using errcode='42501'; end if;
select email into e from auth.users where id=u and email_confirmed_at is not null;
if e is null then raise exception 'Email confirmation required'; end if;
if p_name is null or char_length(trim(p_name)) not between 4 and 200 or p_phone is null or p_phone !~ '^[+][0-9]{7,16}$' or p_whatsapp is null or p_whatsapp !~ '^[+][0-9]{7,16}$' then raise exception 'Invalid application'; end if;
insert into public.member_applications(auth_user_id,full_name,email,phone,whatsapp,consent_version,consented_at,status) values(u,trim(p_name),e,p_phone,p_whatsapp,'2026-11-24',now(),'under_review') on conflict(auth_user_id) do nothing;
end; $function$;

