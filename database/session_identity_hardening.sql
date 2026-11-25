-- Applied to production on 2026-11-25: reject_banned_deleted_and_anonymous_sessions.
CREATE OR REPLACE FUNCTION family_private.member_session_active()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO '' AS $function$
 SELECT EXISTS (
 SELECT 1 FROM auth.sessions s JOIN auth.users u ON u.id=s.user_id
 WHERE s.user_id=auth.uid() AND s.id::text=auth.jwt()->>'session_id'
 AND u.email_confirmed_at IS NOT NULL
 AND u.deleted_at IS NULL AND NOT coalesce(u.is_anonymous,false)
 AND (u.banned_until IS NULL OR u.banned_until<=now())
 AND (s.not_after IS NULL OR s.not_after>now())
 );
$function$;
CREATE OR REPLACE FUNCTION public.family_is_admin()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO '' AS $function$
 SELECT EXISTS (
 SELECT 1 FROM family_private.admins a
 JOIN auth.users u ON u.id=a.user_id
 JOIN auth.sessions s ON s.user_id=a.user_id AND s.id::text=auth.jwt()->>'session_id'
 WHERE a.user_id=auth.uid() AND u.email_confirmed_at IS NOT NULL
 AND u.deleted_at IS NULL AND NOT coalesce(u.is_anonymous,false)
 AND (u.banned_until IS NULL OR u.banned_until<=now())
 AND (s.not_after IS NULL OR s.not_after>now())
 AND auth.jwt()->>'aal'='aal2'
 AND EXISTS(SELECT 1 FROM auth.mfa_factors f WHERE f.user_id=a.user_id AND f.status='verified')
 );
$function$;
REVOKE EXECUTE ON FUNCTION family_private.member_session_active() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.family_is_admin() FROM PUBLIC, anon;
