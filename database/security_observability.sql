CREATE OR REPLACE FUNCTION public.family_security_summary()
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
BEGIN
 IF auth.uid() IS NULL OR NOT public.family_is_admin() THEN RAISE EXCEPTION 'Forbidden' USING errcode='42501'; END IF;
 RETURN jsonb_build_object(
 'mfa_enabled', EXISTS(SELECT 1 FROM auth.mfa_factors WHERE user_id=auth.uid() AND status='verified'),
 'current_aal', auth.jwt()->>'aal',
 'sessions',(SELECT count(*) FROM auth.sessions WHERE user_id=auth.uid() AND (not_after IS NULL OR not_after>now())),
 'private_buckets',(SELECT count(*) FROM storage.buckets WHERE id IN ('family-news','family-archive') AND public=false),
 'events_7d',(SELECT count(*) FROM family_private.security_events WHERE occurred_at>now()-interval '7 days'),
 'recent_events',coalesce((SELECT jsonb_agg(to_jsonb(e) ORDER BY e.occurred_at DESC) FROM (SELECT action,resource,occurred_at FROM family_private.security_events ORDER BY occurred_at DESC LIMIT 100)e),'[]'::jsonb),
 'recent_reviews',coalesce((SELECT jsonb_agg(to_jsonb(e)) FROM (SELECT action FROM public.member_audit_events ORDER BY id DESC LIMIT 10)e),'[]'::jsonb),
 'generated_at',now(),
 'daily_activity',coalesce((SELECT jsonb_agg(jsonb_build_object('day',d.day::date,'operations',coalesce(e.total,0),'auth_events',coalesce(a.total,0)) ORDER BY d.day)
 FROM generate_series((now() AT TIME ZONE 'Asia/Gaza')::date-6,(now() AT TIME ZONE 'Asia/Gaza')::date,interval '1 day') d(day)
 LEFT JOIN (SELECT (occurred_at AT TIME ZONE 'Asia/Gaza')::date AS day,count(*) AS total FROM family_private.security_events WHERE occurred_at>=((now() AT TIME ZONE 'Asia/Gaza')::date-6)::timestamp AT TIME ZONE 'Asia/Gaza' GROUP BY 1)e ON e.day=d.day::date
 LEFT JOIN (SELECT (created_at AT TIME ZONE 'Asia/Gaza')::date AS day,count(*) AS total FROM auth.audit_log_entries WHERE created_at>=((now() AT TIME ZONE 'Asia/Gaza')::date-6)::timestamp AT TIME ZONE 'Asia/Gaza' GROUP BY 1)a ON a.day=d.day::date),'[]'::jsonb),
 'auth_events_7d',(SELECT count(*) FROM auth.audit_log_entries WHERE created_at>=now()-interval '7 days'),
 'auth_latest_at',(SELECT max(created_at) FROM auth.audit_log_entries),
 'auth_actions',coalesce((SELECT jsonb_agg(to_jsonb(e) ORDER BY e.total DESC) FROM (SELECT CASE WHEN payload->>'action' IN ('login','logout','signup','user_signedup','user_updated','user_deleted','password_recovery_requested','token_refreshed','token_revoked','mfa_factor_enrolled','mfa_factor_unenrolled','mfa_challenge_verified','user_recovery_requested','user_confirmation_requested','user_invited') THEN payload->>'action' ELSE 'other' END AS action,count(*) AS total FROM auth.audit_log_entries WHERE created_at>=now()-interval '7 days' GROUP BY 1)e),'[]'::jsonb),
 'attachments',coalesce((SELECT jsonb_agg(to_jsonb(e)) FROM (SELECT attachment_scan_status AS state,count(*) AS total FROM public.family_member_requests WHERE attachment_requested GROUP BY 1)e),'[]'::jsonb),
 'latest_scan',(SELECT jsonb_build_object('scanned_at',scanned_at,'checks',checks) FROM family_private.security_scan_reports WHERE actor_id=auth.uid() ORDER BY scanned_at DESC LIMIT 1)
 );
END;
$function$

REVOKE EXECUTE ON FUNCTION public.family_security_summary() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.family_security_summary() TO authenticated;
