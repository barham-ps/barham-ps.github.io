-- Security operations center: extend verified inventory without exposing records.
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
 'private_buckets',(SELECT count(*) FROM storage.buckets WHERE NOT public),
 'security_inventory',jsonb_build_object(
   'public_tables',(SELECT count(*) FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relkind IN ('r','p')),
   'missing_rls',(SELECT count(*) FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relkind IN ('r','p') AND NOT c.relrowsecurity),
   'storage_total',(SELECT count(*) FROM storage.buckets),
   'public_buckets',(SELECT count(*) FROM storage.buckets WHERE public),
   'required_private_buckets',(SELECT count(*) FROM storage.buckets WHERE id IN ('family-news','family-archive','family-martyr-photos','family-public-content','family-request-files') AND NOT public),
   'upload_limits_verified',(SELECT count(*) FROM storage.buckets WHERE (id in ('family-news','family-martyr-photos','family-public-content') and file_size_limit>0 and file_size_limit<=5242880 and allowed_mime_types is not null and cardinality(allowed_mime_types)>0 and allowed_mime_types <@ array['image/jpeg','image/png','image/webp']::text[]) or (id='family-archive' and file_size_limit>0 and file_size_limit<=10485760 and allowed_mime_types is not null and cardinality(allowed_mime_types)>0 and allowed_mime_types <@ array['image/jpeg','image/png','image/webp','application/pdf']::text[]) or (id='family-request-files' and file_size_limit>0 and file_size_limit<=10485760 and allowed_mime_types is not null and cardinality(allowed_mime_types)>0 and allowed_mime_types <@ array['image/jpeg','application/pdf']::text[]))
 ),
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
$function$;
REVOKE EXECUTE ON FUNCTION public.family_security_summary() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.family_security_summary() TO authenticated;

CREATE OR REPLACE FUNCTION public.family_run_security_scan()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
 u uuid:=auth.uid();
 checks jsonb:='[]'::jsonb;
 n integer;
 total integer;
 last_report record;
 stamp timestamptz;
begin
 if not public.family_is_admin() then raise exception 'Forbidden' using errcode='42501'; end if;
 perform pg_advisory_xact_lock(hashtextextended(u::text,2728));
 select r.scanned_at,r.checks as report_checks into last_report from family_private.security_scan_reports r where r.actor_id=u order by r.scanned_at desc limit 1;
 if found and last_report.scanned_at>now()-interval '10 seconds' then
 return jsonb_build_object('scanned_at',last_report.scanned_at,'checks',last_report.report_checks,'cached',true);
 end if;
 select count(*) into n from pg_class c join pg_namespace ns on ns.oid=c.relnamespace where ns.nspname='public' and c.relkind in ('r','p') and not c.relrowsecurity;
 checks:=checks||jsonb_build_array(jsonb_build_object('id','rls','state',case when n=0 then 'pass' else 'fail' end,'value',n));
 select count(*) into n from (values ('public.member_certificates'),('public.member_audit_events'),('public.member_email_verification_tokens'),('public.albarham_membership_schema_migrations'),('family_private.admins'),('family_private.security_events'),('family_private.security_scan_reports')) as t(name) cross join (values ('anon'),('authenticated')) as r(role_name) where has_any_column_privilege(r.role_name,t.name,'SELECT,INSERT,UPDATE,REFERENCES') or has_table_privilege(r.role_name,t.name,'DELETE,TRUNCATE,TRIGGER');
 checks:=checks||jsonb_build_array(jsonb_build_object('id','private_tables','state',case when n=0 then 'pass' else 'fail' end,'value',n));
 select count(*) into n from (values ('public.family_admin_list()'),('public.family_admin_review(uuid,text,text)'),('public.family_security_summary()'),('public.family_security_scan_history()'),('public.family_admin_request_senders(uuid[])'),('public.family_run_security_scan()'),('public.family_my_certificate()'),('public.submit_family_application(text,text,text,boolean)'),('public.family_is_admin()')) as t(name) where has_function_privilege('anon',t.name,'EXECUTE');
 checks:=checks||jsonb_build_array(jsonb_build_object('id','admin_rpc','state',case when n=0 then 'pass' else 'fail' end,'value',n));
 select count(*) into n from auth.mfa_factors where user_id=u and status='verified';
 checks:=checks||jsonb_build_array(jsonb_build_object('id','mfa','state',case when n>0 then 'pass' else 'warn' end,'value',n));
 checks:=checks||jsonb_build_array(jsonb_build_object('id','session','state','pass','value',1));
 select count(*) into n from storage.buckets where id in ('family-news','family-archive','family-martyr-photos','family-public-content','family-request-files') and not public;
 checks:=checks||jsonb_build_array(jsonb_build_object('id','storage','state',case when n=5 and not exists(select 1 from storage.buckets where public) then 'pass' else 'fail' end,'value',n));
 select count(*) into n from storage.buckets where (id in ('family-news','family-martyr-photos','family-public-content') and file_size_limit>0 and file_size_limit<=5242880 and allowed_mime_types is not null and cardinality(allowed_mime_types)>0 and allowed_mime_types <@ array['image/jpeg','image/png','image/webp']::text[]) or (id='family-archive' and file_size_limit>0 and file_size_limit<=10485760 and allowed_mime_types is not null and cardinality(allowed_mime_types)>0 and allowed_mime_types <@ array['image/jpeg','image/png','image/webp','application/pdf']::text[]) or (id='family-request-files' and file_size_limit>0 and file_size_limit<=10485760 and allowed_mime_types is not null and cardinality(allowed_mime_types)>0 and allowed_mime_types <@ array['image/jpeg','application/pdf']::text[]);
 checks:=checks||jsonb_build_array(jsonb_build_object('id','upload_limits','state',case when n=5 then 'pass' else 'fail' end,'value',n));
 select count(*) into n from (select distinct p.path from public.family_news x cross join lateral unnest(x.image_paths||x.cover_paths||array[x.image_path]) as p(path) where p.path is not null) p where not exists(select 1 from storage.objects o where o.bucket_id='family-news' and o.name=p.path);
 select n+count(*) into n from public.family_member_content c where c.attachment_path is not null and not exists(select 1 from storage.objects o where o.bucket_id='family-archive' and o.name=c.attachment_path);
 checks:=checks||jsonb_build_array(jsonb_build_object('id','files','state',case when n=0 then 'pass' else 'warn' end,'value',n));
 select count(*) into n from pg_trigger where tgname in ('family_security_news','family_security_content','family_security_requests','family_security_notices') and not tgisinternal and tgenabled in ('O','A');
 checks:=checks||jsonb_build_array(jsonb_build_object('id','audit','state',case when n=4 then 'pass' else 'fail' end,'value',n));
 select count(*) into n from pg_trigger where tgname='family_member_request_daily_limit' and not tgisinternal and tgenabled in ('O','A');
 checks:=checks||jsonb_build_array(jsonb_build_object('id','rate','state',case when n=1 then 'pass' else 'fail' end,'value',n));
 select count(*) into n from public.member_certificates c join public.member_applications a on a.id=c.application_id where (c.revoked_at is null and a.status<>'approved') or (c.revoked_at is not null and a.status='approved');
 checks:=checks||jsonb_build_array(jsonb_build_object('id','certificates','state',case when n=0 then 'pass' else 'warn' end,'value',n));
 stamp:=clock_timestamp();
 insert into family_private.security_scan_reports(actor_id,scanned_at,checks) values(u,stamp,checks);
 delete from family_private.security_scan_reports where actor_id=u and id not in (select id from family_private.security_scan_reports where actor_id=u order by scanned_at desc,id desc limit 30);
 return jsonb_build_object('scanned_at',stamp,'checks',checks,'cached',false);
end $function$;
REVOKE EXECUTE ON FUNCTION public.family_run_security_scan() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.family_run_security_scan() TO authenticated;
