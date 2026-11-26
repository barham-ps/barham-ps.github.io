-- Supabase Send Email Hook (Postgres). Not active until registered in Auth settings.
-- User, password and identity metadata never leave this function. Only encrypted
-- recipient+token+template fields persist for at most five minutes, until one claim.
CREATE TABLE IF NOT EXISTS family_private.auth_mail_settings (
 singleton boolean PRIMARY KEY DEFAULT true CHECK(singleton),
 enabled boolean NOT NULL DEFAULT false,
 monthly_limit integer NOT NULL DEFAULT 100 CHECK(monthly_limit BETWEEN 1 AND 1000)
);
INSERT INTO family_private.auth_mail_settings(singleton) VALUES(true) ON CONFLICT DO NOTHING;
CREATE TABLE IF NOT EXISTS family_private.auth_mail_jobs (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 payload_cipher bytea,
 state text NOT NULL DEFAULT 'queued' CHECK(state IN ('queued','dispatched','sending','sent','failed','uncertain','expired')),
 created_at timestamptz NOT NULL DEFAULT now(), expires_at timestamptz NOT NULL DEFAULT now()+interval '5 minutes',
 dispatched_at timestamptz, claimed_at timestamptz, finished_at timestamptz
);
CREATE INDEX IF NOT EXISTS auth_mail_jobs_queue ON family_private.auth_mail_jobs(created_at) WHERE state='queued';
CREATE INDEX IF NOT EXISTS auth_mail_jobs_usage ON family_private.auth_mail_jobs(created_at);
ALTER TABLE family_private.auth_mail_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE family_private.auth_mail_jobs ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON family_private.auth_mail_settings,family_private.auth_mail_jobs FROM PUBLIC,anon,authenticated,supabase_auth_admin,service_role;
-- Generate and store a dedicated random encryption key only in Vault.
DO $$ BEGIN
 IF NOT EXISTS(SELECT 1 FROM vault.secrets WHERE name='family_auth_mail_encryption') THEN
  PERFORM vault.create_secret(encode(extensions.gen_random_bytes(32),'hex'),'family_auth_mail_encryption','Dedicated short-lived auth email queue encryption');
 END IF;
END $$;

CREATE OR REPLACE FUNCTION family_private.family_auth_mail_hook(event jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE e jsonb:=event->'email_data'; u jsonb:=event->'user'; action text:=e->>'email_action_type';
 recipient text:=u->>'email'; new_recipient text:=u->>'new_email'; token text:=e->>'token'; token_hash text:=e->>'token_hash';
 token_new text:=e->>'token_new'; hash_new text:=e->>'token_hash_new';
 secret text; bearer text; item jsonb; items jsonb:='[]'::jsonb; budget integer;
BEGIN
 IF event IS NULL OR action IS NULL OR octet_length(event::text)>100000 THEN RETURN jsonb_build_object('error',jsonb_build_object('http_code',400,'message','Invalid email request')); END IF;
 SELECT monthly_limit INTO budget FROM family_private.auth_mail_settings WHERE singleton AND enabled;
 IF budget IS NULL THEN RETURN jsonb_build_object('error',jsonb_build_object('http_code',503,'message','Email temporarily unavailable')); END IF;
 IF action='email_change' THEN
  IF coalesce(hash_new,'')<>'' THEN
   items:=items||jsonb_build_array(jsonb_build_object('to',recipient,'action',action,'token',token,'token_hash',hash_new));
   items:=items||jsonb_build_array(jsonb_build_object('to',new_recipient,'action',action,'token',token_new,'token_hash',token_hash));
  ELSE
   items:=jsonb_build_array(jsonb_build_object('to',new_recipient,'action',action,'token',coalesce(nullif(token_new,''),token),'token_hash',token_hash));
  END IF;
 ELSIF action IN ('signup','invite','magiclink','recovery','email','reauthentication','password_changed_notification','email_changed_notification','phone_changed_notification','identity_linked_notification','identity_unlinked_notification','mfa_factor_enrolled_notification','mfa_factor_unenrolled_notification') THEN
  IF action='email_changed_notification' AND coalesce(e->>'old_email','')<>'' THEN recipient:=e->>'old_email'; END IF;
  items:=jsonb_build_array(jsonb_build_object('to',recipient,'action',action,'token',token,'token_hash',token_hash));
 ELSE RETURN jsonb_build_object('error',jsonb_build_object('http_code',400,'message','Unsupported authentication email')); END IF;
 -- Validate all jobs before inserting. No arbitrary templates or recipient injection.
 FOR item IN SELECT value FROM jsonb_array_elements(items) LOOP
  IF item->>'to' IS NULL OR length(item->>'to')>254 OR item->>'to' !~ '^[^[:space:]@<>]+@[^[:space:]@<>]+\.[^[:space:]@<>]+$' THEN
   RETURN jsonb_build_object('error',jsonb_build_object('http_code',400,'message','Invalid email address'));
  END IF;
  IF action IN ('recovery','reauthentication') AND coalesce(item->>'token','') !~ '^[0-9]{4,10}$' THEN RETURN jsonb_build_object('error',jsonb_build_object('http_code',400,'message','Invalid verification code')); END IF;
  IF action IN ('signup','invite','magiclink','email','email_change') AND coalesce(item->>'token_hash','') !~ '^[A-Za-z0-9_-]{16,255}$' THEN RETURN jsonb_build_object('error',jsonb_build_object('http_code',400,'message','Invalid verification link')); END IF;
 END LOOP;
 PERFORM pg_advisory_xact_lock(hashtextextended('family-auth-mail-budget',0));
 IF (SELECT count(*) FROM family_private.auth_mail_jobs WHERE created_at>=date_trunc('month',now())) + jsonb_array_length(items)>budget THEN
  RETURN jsonb_build_object('error',jsonb_build_object('http_code',429,'message','Authentication email quota reached; contact support'));
 END IF;
 SELECT decrypted_secret INTO secret FROM vault.decrypted_secrets WHERE name='family_auth_mail_encryption';
 SELECT decrypted_secret INTO bearer FROM vault.decrypted_secrets WHERE name='family_mail_dispatch';
 IF coalesce(length(secret),0)<32 OR coalesce(length(bearer),0)<32 THEN RETURN jsonb_build_object('error',jsonb_build_object('http_code',503,'message','Email temporarily unavailable')); END IF;
 FOR item IN SELECT value FROM jsonb_array_elements(items) LOOP
  INSERT INTO family_private.auth_mail_jobs(payload_cipher) VALUES(extensions.pgp_sym_encrypt(item::text,secret,'cipher-algo=aes256, compress-algo=0'));
 END LOOP;
 -- pg_net starts the request only after commit: fast, no OTP in the HTTP body.
 PERFORM net.http_post(url:='https://vfxxghfmkmgdqrczeowx.supabase.co/functions/v1/mail-outbox?action=auth-dispatch',headers:=jsonb_build_object('Content-Type','application/json','Authorization','Bearer '||bearer),body:='{}'::jsonb,timeout_milliseconds:=60000);
 RETURN '{}'::jsonb;
END $$;
REVOKE ALL ON FUNCTION family_private.family_auth_mail_hook(jsonb) FROM PUBLIC,anon,authenticated,service_role;
GRANT USAGE ON SCHEMA family_private TO supabase_auth_admin;
GRANT EXECUTE ON FUNCTION family_private.family_auth_mail_hook(jsonb) TO supabase_auth_admin;

CREATE OR REPLACE FUNCTION public.family_auth_mail_reserve(p_limit integer DEFAULT 5)
RETURNS TABLE(job_id uuid) LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
 UPDATE family_private.auth_mail_jobs SET state='expired',payload_cipher=null,finished_at=now() WHERE state IN ('queued','dispatched') AND expires_at<=now();
 UPDATE family_private.auth_mail_jobs SET state='uncertain',payload_cipher=null,finished_at=now() WHERE state='sending' AND expires_at<=now();
 DELETE FROM family_private.auth_mail_jobs WHERE state IN ('sent','expired','failed','uncertain') AND created_at<date_trunc('month',now())-interval '1 day';
 IF NOT EXISTS(SELECT 1 FROM family_private.auth_mail_settings WHERE singleton AND enabled) THEN RETURN; END IF;
 RETURN QUERY WITH chosen AS (
 SELECT id FROM family_private.auth_mail_jobs WHERE state='queued' AND expires_at>now() ORDER BY created_at,id LIMIT greatest(0,least(coalesce(p_limit,5),10)) FOR UPDATE SKIP LOCKED
 ) UPDATE family_private.auth_mail_jobs q SET state='dispatched',dispatched_at=now() FROM chosen c WHERE q.id=c.id RETURNING q.id;
END $$;
CREATE OR REPLACE FUNCTION public.family_auth_mail_claim(p_job uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE cipher bytea; secret text; payload jsonb;
BEGIN
 IF NOT EXISTS(SELECT 1 FROM family_private.auth_mail_settings WHERE singleton AND enabled) THEN RETURN NULL; END IF;
 SELECT q.payload_cipher INTO cipher FROM family_private.auth_mail_jobs q WHERE q.id=p_job AND q.state='dispatched' AND q.expires_at>now() FOR UPDATE;
 IF cipher IS NULL THEN RETURN NULL; END IF;
 SELECT decrypted_secret INTO secret FROM vault.decrypted_secrets WHERE name='family_auth_mail_encryption';
 IF coalesce(length(secret),0)<32 THEN RETURN NULL; END IF;
 payload:=extensions.pgp_sym_decrypt(cipher,secret)::jsonb;
 UPDATE family_private.auth_mail_jobs SET state='sending',payload_cipher=null,claimed_at=now() WHERE id=p_job;
 RETURN payload;
END $$;
CREATE OR REPLACE FUNCTION public.family_auth_mail_finish(p_job uuid,p_outcome text)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
 IF p_outcome NOT IN ('sent','failed','uncertain') THEN RETURN false; END IF;
 UPDATE family_private.auth_mail_jobs SET state=p_outcome,payload_cipher=null,finished_at=now()
 WHERE id=p_job AND (state='sending' OR (state='dispatched' AND p_outcome IN ('failed','uncertain')));
 RETURN FOUND;
END $$;
REVOKE ALL ON FUNCTION public.family_auth_mail_reserve(integer),public.family_auth_mail_claim(uuid),public.family_auth_mail_finish(uuid,text) FROM PUBLIC,anon,authenticated,supabase_auth_admin;
GRANT EXECUTE ON FUNCTION public.family_auth_mail_reserve(integer),public.family_auth_mail_claim(uuid),public.family_auth_mail_finish(uuid,text) TO service_role;

CREATE OR REPLACE FUNCTION family_private.auth_mail_dispatch_tick()
RETURNS bigint LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
DECLARE bearer text; rid bigint;
BEGIN
 IF NOT EXISTS(SELECT 1 FROM family_private.auth_mail_jobs WHERE state IN ('queued','dispatched','sending') OR created_at<date_trunc('month',now())-interval '1 day') THEN RETURN NULL; END IF;
 SELECT decrypted_secret INTO bearer FROM vault.decrypted_secrets WHERE name='family_mail_dispatch';
 IF coalesce(length(bearer),0)<32 THEN RETURN NULL; END IF;
 SELECT net.http_post(url:='https://vfxxghfmkmgdqrczeowx.supabase.co/functions/v1/mail-outbox?action=auth-dispatch',headers:=jsonb_build_object('Content-Type','application/json','Authorization','Bearer '||bearer),body:='{}'::jsonb,timeout_milliseconds:=60000) INTO rid;
 RETURN rid;
END $$;
REVOKE ALL ON FUNCTION family_private.auth_mail_dispatch_tick() FROM PUBLIC,anon,authenticated,supabase_auth_admin,service_role;
SELECT cron.schedule('family-auth-mail-dispatch','* * * * *',$job$SELECT family_private.auth_mail_dispatch_tick();$job$);
