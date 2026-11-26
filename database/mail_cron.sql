CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;
CREATE OR REPLACE FUNCTION family_private.mail_dispatch_tick()
RETURNS bigint LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
DECLARE bearer text; request_id bigint;
BEGIN
  IF NOT EXISTS(SELECT 1 FROM family_private.mail_outbox_settings WHERE singleton AND enabled AND test_job_id IS NULL) THEN RETURN NULL; END IF;
  IF NOT EXISTS(SELECT 1 FROM family_private.mail_outbox WHERE state='queued' AND created_at>=now()-interval '7 days') AND NOT EXISTS(SELECT 1 FROM family_private.mail_outbox WHERE (state='queued' AND created_at<now()-interval '7 days') OR (state IN ('dispatched','sending') AND dispatched_at<now()-interval '10 minutes') OR (state IN ('sent','failed','uncertain','expired') AND finished_at<now()-interval '32 days')) THEN RETURN NULL; END IF;
  SELECT decrypted_secret INTO bearer FROM vault.decrypted_secrets WHERE name='family_mail_dispatch';
  IF bearer IS NULL OR length(bearer)<32 THEN RETURN NULL; END IF;
  SELECT net.http_post(url:='https://vfxxghfmkmgdqrczeowx.supabase.co/functions/v1/mail-outbox?action=dispatch',headers:=jsonb_build_object('Content-Type','application/json','Authorization','Bearer '||bearer),body:='{}'::jsonb,timeout_milliseconds:=60000) INTO request_id;
  RETURN request_id;
END; $$;
REVOKE ALL ON FUNCTION family_private.mail_dispatch_tick() FROM PUBLIC,anon,authenticated,service_role;
SELECT cron.schedule('family-mail-dispatch','*/2 * * * *',$job$SELECT family_private.mail_dispatch_tick();$job$);
