-- STAGED: private transactional delivery queue. Applying this file does not send
-- mail or enable event collection. Activate only after the live transport test.
-- No email address, document, complaint, reply, name or OTP is stored in this queue.
CREATE SCHEMA IF NOT EXISTS family_private;
CREATE TABLE IF NOT EXISTS family_private.mail_outbox_settings (
  singleton boolean PRIMARY KEY DEFAULT true CHECK (singleton),
  enabled boolean NOT NULL DEFAULT false,
  monthly_limit integer NOT NULL DEFAULT 120 CHECK (monthly_limit BETWEEN 1 AND 10000)
);
INSERT INTO family_private.mail_outbox_settings(singleton) VALUES(true) ON CONFLICT DO NOTHING;
CREATE TABLE IF NOT EXISTS family_private.mail_outbox (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_key text NOT NULL CHECK (template_key ~ '^[a-z_]+$' AND length(template_key)<=80),
  source_id uuid NOT NULL,
  recipient_user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  audience text NOT NULL CHECK (audience IN ('member','admin')),
  created_at timestamptz NOT NULL DEFAULT now(),
  state text NOT NULL DEFAULT 'queued' CHECK(state IN ('queued','dispatched','sending','sent','failed','uncertain','expired')),
  dispatched_at timestamptz,
  claimed_at timestamptz,
  finished_at timestamptz,
  CHECK ((audience='member' AND recipient_user_id IS NOT NULL) OR (audience='admin' AND recipient_user_id IS NULL))
);
CREATE INDEX IF NOT EXISTS mail_outbox_queued ON family_private.mail_outbox(created_at,id) WHERE state='queued';
CREATE INDEX IF NOT EXISTS mail_outbox_dispatch_usage ON family_private.mail_outbox(dispatched_at) WHERE dispatched_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS mail_outbox_recipient ON family_private.mail_outbox(recipient_user_id) WHERE recipient_user_id IS NOT NULL;
ALTER TABLE family_private.mail_outbox ENABLE ROW LEVEL SECURITY;
ALTER TABLE family_private.mail_outbox_settings ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON family_private.mail_outbox,family_private.mail_outbox_settings FROM PUBLIC,anon,authenticated;
-- Data comes only from existing protected tables, not a client-supplied email or template.
CREATE OR REPLACE FUNCTION family_private.mail_enqueue(p_template text,p_source uuid,p_user uuid,p_audience text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
  IF NOT EXISTS(SELECT 1 FROM family_private.mail_outbox_settings WHERE singleton AND enabled) THEN RETURN; END IF;
  IF p_audience='member' AND NOT EXISTS(SELECT 1 FROM auth.users WHERE id=p_user AND email_confirmed_at IS NOT NULL AND email IS NOT NULL AND deleted_at IS NULL) THEN RETURN; END IF;
  INSERT INTO family_private.mail_outbox(template_key,source_id,recipient_user_id,audience) VALUES(p_template,p_source,p_user,p_audience);
END; $$;
REVOKE ALL ON FUNCTION family_private.mail_enqueue(text,uuid,uuid,text) FROM PUBLIC,anon,authenticated,service_role;
CREATE OR REPLACE FUNCTION family_private.mail_collect_membership()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
  IF TG_OP='UPDATE' AND OLD.status IS NOT DISTINCT FROM NEW.status THEN RETURN NEW; END IF;
  -- Pending confirmation is handled by Auth. Do not email unconfirmed addresses.
  IF NEW.status IN ('under_review','more_info','approved','rejected','suspended','revoked') THEN
    PERFORM family_private.mail_enqueue('membership_'||NEW.status,NEW.id,NEW.auth_user_id,'member');
    IF NEW.status='under_review' THEN PERFORM family_private.mail_enqueue('admin_membership',NEW.id,NULL,'admin'); END IF;
  END IF;
  RETURN NEW;
END; $$;
CREATE OR REPLACE FUNCTION family_private.mail_collect_request()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE next_state text;
BEGIN
  IF TG_OP='INSERT' THEN next_state:='received';
  ELSIF OLD.status IS DISTINCT FROM NEW.status THEN next_state:=CASE WHEN NEW.status='pending' THEN 'updated' ELSE NEW.status END;
  ELSIF OLD.reply IS DISTINCT FROM NEW.reply THEN next_state:='updated';
  ELSE RETURN NEW; END IF;
  IF NEW.kind NOT IN ('initiative','suggestion','occasion','solidarity','archive','complaint','birth','correction') OR next_state NOT IN ('received','accepted','declined','completed','updated') THEN RETURN NEW; END IF;
  PERFORM family_private.mail_enqueue('request_'||NEW.kind||'_'||next_state,NEW.id,NEW.user_id,'member');
  IF TG_OP='INSERT' THEN PERFORM family_private.mail_enqueue('admin_request',NEW.id,NULL,'admin'); END IF;
  RETURN NEW;
END; $$;
CREATE OR REPLACE FUNCTION family_private.mail_collect_correspondence()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE template text;
BEGIN
  IF TG_OP='INSERT' THEN template:='correspondence_received';
  ELSIF OLD.status IS DISTINCT FROM NEW.status THEN
    template:=CASE NEW.status WHEN 'read' THEN 'correspondence_read' WHEN 'answered' THEN 'correspondence_answered' WHEN 'closed' THEN 'correspondence_closed' ELSE NULL END;
  ELSIF OLD.reply IS DISTINCT FROM NEW.reply AND nullif(trim(NEW.reply),'') IS NOT NULL THEN template:='correspondence_answered';
  ELSE RETURN NEW; END IF;
  IF template IS NOT NULL THEN PERFORM family_private.mail_enqueue(template,NEW.id,NEW.user_id,'member'); END IF;
  IF TG_OP='INSERT' THEN PERFORM family_private.mail_enqueue('admin_correspondence',NEW.id,NULL,'admin'); END IF;
  RETURN NEW;
END; $$;
CREATE OR REPLACE FUNCTION family_private.mail_collect_certificate()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE owner_id uuid;
BEGIN
  SELECT auth_user_id INTO owner_id FROM public.member_applications WHERE id=NEW.application_id;
  IF owner_id IS NULL THEN RETURN NEW; END IF;
  IF TG_OP='INSERT' AND NEW.revoked_at IS NULL THEN PERFORM family_private.mail_enqueue('certificate_issued',NEW.id,owner_id,'member');
  ELSIF TG_OP='UPDATE' AND OLD.revoked_at IS NULL AND NEW.revoked_at IS NOT NULL THEN PERFORM family_private.mail_enqueue('certificate_revoked',NEW.id,owner_id,'member'); END IF;
  RETURN NEW;
END; $$;
CREATE OR REPLACE FUNCTION family_private.mail_collect_notice()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
  PERFORM family_private.mail_enqueue('notice_received',NEW.id,NEW.user_id,'member'); RETURN NEW;
END; $$;
REVOKE ALL ON FUNCTION family_private.mail_collect_membership(),family_private.mail_collect_request(),family_private.mail_collect_correspondence(),family_private.mail_collect_certificate(),family_private.mail_collect_notice() FROM PUBLIC,anon,authenticated,service_role;
DROP TRIGGER IF EXISTS family_mail_membership ON public.member_applications;
CREATE TRIGGER family_mail_membership AFTER INSERT OR UPDATE OF status ON public.member_applications FOR EACH ROW EXECUTE FUNCTION family_private.mail_collect_membership();
DROP TRIGGER IF EXISTS family_mail_request ON public.family_member_requests;
CREATE TRIGGER family_mail_request AFTER INSERT OR UPDATE OF status,reply ON public.family_member_requests FOR EACH ROW EXECUTE FUNCTION family_private.mail_collect_request();
DROP TRIGGER IF EXISTS family_mail_correspondence ON public.family_correspondence;
CREATE TRIGGER family_mail_correspondence AFTER INSERT OR UPDATE OF status,reply ON public.family_correspondence FOR EACH ROW EXECUTE FUNCTION family_private.mail_collect_correspondence();
DROP TRIGGER IF EXISTS family_mail_certificate ON public.member_certificates;
CREATE TRIGGER family_mail_certificate AFTER INSERT OR UPDATE OF revoked_at ON public.member_certificates FOR EACH ROW EXECUTE FUNCTION family_private.mail_collect_certificate();
DROP TRIGGER IF EXISTS family_mail_notice ON public.family_member_notices;
CREATE TRIGGER family_mail_notice AFTER INSERT ON public.family_member_notices FOR EACH ROW EXECUTE FUNCTION family_private.mail_collect_notice();
-- Service-only RPCs. Private schema remains hidden from the Data API. Grant only service_role.
-- Serialize reservations to enforce the calendar-month budget. No user data is returned by reserve.
CREATE OR REPLACE FUNCTION public.family_mail_reserve(p_limit integer DEFAULT 5)
RETURNS TABLE(job_id uuid) LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE capacity integer; budget integer;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtextextended('family-mail-reserve',0));
  SELECT monthly_limit INTO budget FROM family_private.mail_outbox_settings WHERE singleton AND enabled;
  IF budget IS NULL THEN RETURN; END IF;
  UPDATE family_private.mail_outbox SET state='expired',finished_at=now() WHERE state='queued' AND created_at<now()-interval '7 days';
  UPDATE family_private.mail_outbox SET state='uncertain',finished_at=now() WHERE state IN ('dispatched','sending') AND dispatched_at<now()-interval '10 minutes';
  DELETE FROM family_private.mail_outbox WHERE state IN ('sent','failed','uncertain','expired') AND finished_at<now()-interval '32 days';
  SELECT greatest(0,budget-count(*)::integer) INTO capacity FROM family_private.mail_outbox WHERE dispatched_at>=date_trunc('month',now());
  IF capacity=0 THEN RETURN; END IF;
  RETURN QUERY WITH reserved AS (
    SELECT id FROM family_private.mail_outbox WHERE state='queued' ORDER BY created_at,id LIMIT least(capacity,greatest(0,least(coalesce(p_limit,5),10))) FOR UPDATE SKIP LOCKED
  ) UPDATE family_private.mail_outbox q SET state='dispatched',dispatched_at=now() FROM reserved r WHERE q.id=r.id RETURNING q.id;
END; $$;
CREATE OR REPLACE FUNCTION public.family_mail_claim(p_job uuid)
RETURNS TABLE(template_key text,source_id uuid,audience text,recipient_email text) LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
  IF NOT EXISTS(SELECT 1 FROM family_private.mail_outbox_settings WHERE singleton AND enabled) THEN RETURN; END IF;
  -- One atomic claim; expired or already claimed jobs cannot be sent again.
  RETURN QUERY WITH claimed AS (
    UPDATE family_private.mail_outbox q SET state='sending',claimed_at=now()
    WHERE q.id=p_job AND q.state='dispatched' AND q.dispatched_at>now()-interval '10 minutes'
    AND (q.audience='admin' OR EXISTS(SELECT 1 FROM auth.users u WHERE u.id=q.recipient_user_id AND u.email_confirmed_at IS NOT NULL AND u.deleted_at IS NULL AND (u.banned_until IS NULL OR u.banned_until<now()) AND u.email IS NOT NULL))
    RETURNING q.template_key,q.source_id,q.audience,q.recipient_user_id
  ) SELECT c.template_key,c.source_id,c.audience,u.email::text FROM claimed c LEFT JOIN auth.users u ON u.id=c.recipient_user_id;
END; $$;
CREATE OR REPLACE FUNCTION public.family_mail_finish(p_job uuid,p_outcome text)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
  IF p_outcome NOT IN ('sent','failed','uncertain') THEN RETURN false; END IF;
  UPDATE family_private.mail_outbox SET state=p_outcome,finished_at=now() WHERE id=p_job AND state='sending';
  RETURN FOUND;
END; $$;
CREATE OR REPLACE FUNCTION public.family_mail_dispatch_failed(p_job uuid,p_outcome text)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
  IF p_outcome NOT IN ('failed','uncertain') THEN RETURN false; END IF;
  UPDATE family_private.mail_outbox SET state=p_outcome,finished_at=now() WHERE id=p_job AND state='dispatched';
  RETURN FOUND;
END; $$;
REVOKE ALL ON FUNCTION public.family_mail_reserve(integer),public.family_mail_claim(uuid),public.family_mail_finish(uuid,text),public.family_mail_dispatch_failed(uuid,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.family_mail_reserve(integer),public.family_mail_claim(uuid),public.family_mail_finish(uuid,text),public.family_mail_dispatch_failed(uuid,text) TO service_role;
