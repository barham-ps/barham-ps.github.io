-- Production launch hardening. No data deletion and no certificate/QR reissuing.
-- Apply after membership_verification_rate_guard.sql and session/MFA hardening.
-- Public QR and manual proof share a database-enforced budget. No raw IPs retained.
CREATE OR REPLACE FUNCTION family_private.consume_membership_verify_budget()
RETURNS void LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path TO ''
AS $$
DECLARE
  v_bucket timestamptz := date_trunc('minute',clock_timestamp());
  v_actor text;
  v_ip inet;
  v_headers jsonb;
  v_secret bytea;
  v_hits integer;
BEGIN
  BEGIN
    v_headers := coalesce(nullif(current_setting('request.headers',true),''),'{}')::jsonb;
    v_ip := nullif(v_headers->>'cf-connecting-ip','')::inet;
  EXCEPTION WHEN invalid_text_representation THEN v_ip := NULL;
  END;
  -- Prefer a provider-controlled edge IP so a new account cannot reset the allowance.
  v_actor := CASE WHEN v_ip IS NOT NULL THEN 'edge:'||host(v_ip)
                  WHEN auth.uid() IS NOT NULL THEN 'user:'||auth.uid()::text
                  ELSE 'anonymous:missing-edge-ip' END;
  SELECT s.secret INTO STRICT v_secret FROM family_private.membership_verify_secret s WHERE s.singleton;
  INSERT INTO family_private.membership_verify_windows AS w(bucket_start,actor_hash,hits)
  VALUES(v_bucket, extensions.hmac(convert_to(v_actor||':'||extract(epoch from v_bucket)::bigint::text,'UTF8'),v_secret,'sha256'),1)
  ON CONFLICT(bucket_start,actor_hash) DO UPDATE SET hits=w.hits+1 WHERE w.hits<12
  RETURNING hits INTO v_hits;
  IF v_hits IS NULL THEN
    RAISE SQLSTATE 'PT429' USING MESSAGE='Too many verification requests. Try again shortly.';
  END IF;
  UPDATE family_private.membership_verify_secret SET last_cleanup=v_bucket
    WHERE singleton AND last_cleanup < v_bucket-interval '15 minutes';
  IF FOUND THEN
    DELETE FROM family_private.membership_verify_windows WHERE bucket_start < v_bucket-interval '15 minutes';
  END IF;
END;
$$;
REVOKE ALL ON FUNCTION family_private.consume_membership_verify_budget() FROM PUBLIC,anon,authenticated;

-- Existing QR UUIDs remain valid. Both unsuccessful and successful lookups cost one attempt.
CREATE OR REPLACE FUNCTION public.family_verify_certificate(p_token uuid)
RETURNS TABLE(membership_number text, issued_at timestamptz, valid boolean)
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path TO ''
AS $$
BEGIN
  IF p_token IS NULL THEN RETURN; END IF;
  PERFORM family_private.consume_membership_verify_budget();
  RETURN QUERY
    SELECT c.membership_number,c.issued_at,(c.revoked_at IS NULL AND a.status='approved')
    FROM public.member_certificates c JOIN public.member_applications a ON a.id=c.application_id
    WHERE c.verification_token_hash=extensions.digest(p_token::text,'sha256');
END;
$$;
REVOKE ALL ON FUNCTION public.family_verify_certificate(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.family_verify_certificate(uuid) TO anon,authenticated;

-- Disable the number-only public API, not merely its UI. A second argument is mandatory.
REVOKE ALL ON FUNCTION public.family_verify_membership_number(text) FROM PUBLIC,anon,authenticated;
CREATE OR REPLACE FUNCTION public.family_verify_membership_number(p_number text,p_code text)
RETURNS TABLE(membership_number text, issued_at timestamptz, valid boolean)
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path TO ''
AS $$
DECLARE
  v_number text := upper(trim(p_number));
  v_code text := upper(regexp_replace(trim(p_code),'[ -]','','g'));
BEGIN
  IF v_number IS NULL OR v_number !~ '^AB-[0-9]{4}-[0-9]{6}$'
     OR v_code IS NULL OR v_code !~ '^[0-9A-F]{16}$' THEN RETURN; END IF;
  PERFORM family_private.consume_membership_verify_budget();
  -- A 64-bit domain-separated proof derived from the existing random UUID.
  -- The fragment QR itself is not shortened or exposed by this response.
  RETURN QUERY SELECT c.membership_number,c.issued_at,(c.revoked_at IS NULL AND a.status='approved')
    FROM public.member_certificates c JOIN public.member_applications a ON a.id=c.application_id
    WHERE c.membership_number=v_number AND a.membership_number=c.membership_number
      AND upper(left(encode(extensions.digest(c.id::text||':manual-v1','sha256'),'hex'),16))=v_code;
END;
$$;
REVOKE ALL ON FUNCTION public.family_verify_membership_number(text,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.family_verify_membership_number(text,text) TO anon,authenticated;

-- Apply the same verified identity, consent, and E.164-shaped input constraints server-side.
CREATE OR REPLACE FUNCTION public.submit_family_application(p_name text,p_phone text,p_whatsapp text,p_consent boolean)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO ''
AS $$
DECLARE u uuid := auth.uid(); e text;
BEGIN
  IF u IS NULL OR p_consent IS DISTINCT FROM true OR NOT family_private.member_mfa_session_allowed() THEN
    RAISE EXCEPTION 'Authentication and consent required' USING errcode='42501';
  END IF;
  SELECT email INTO e FROM auth.users WHERE id=u AND email_confirmed_at IS NOT NULL;
  IF e IS NULL OR char_length(e)>254 OR e !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' THEN
    RAISE EXCEPTION 'Email confirmation required';
  END IF;
  IF p_name IS NULL OR char_length(trim(p_name)) NOT BETWEEN 4 AND 200 OR
    p_phone IS NULL OR p_phone !~ '^[+][1-9][0-9]{6,14}$' OR
    p_whatsapp IS NULL OR p_whatsapp !~ '^[+][1-9][0-9]{6,14}$' THEN
    RAISE EXCEPTION 'Invalid application';
  END IF;
  INSERT INTO public.member_applications(auth_user_id,full_name,email,phone,whatsapp,consent_version,consented_at,status)
    VALUES(u,trim(p_name),e,p_phone,p_whatsapp,'2026-11-26',now(),'under_review')
    ON CONFLICT(auth_user_id) DO NOTHING;
END;
$$;
REVOKE ALL ON FUNCTION public.submit_family_application(text,text,text,boolean) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.submit_family_application(text,text,text,boolean) TO authenticated;

-- Flood protection is enforced for direct API calls as well as the website.
CREATE INDEX IF NOT EXISTS family_correspondence_sender_recent_idx
  ON public.family_correspondence(user_id,created_at DESC);
CREATE OR REPLACE FUNCTION family_private.limit_correspondence()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO ''
AS $$
BEGIN
  PERFORM pg_advisory_xact_lock(hashtextextended('correspondence:'||new.user_id::text,0));
  IF (SELECT count(*) FROM public.family_correspondence WHERE user_id=new.user_id AND created_at>=now()-interval '24 hours')>=10
     OR (SELECT count(*) FROM public.family_correspondence WHERE user_id=new.user_id AND created_at>=now()-interval '1 minute')>=3 THEN
    RAISE SQLSTATE 'PT429' USING MESSAGE='Correspondence submission limit reached.';
  END IF;
  RETURN new;
END;
$$;
REVOKE ALL ON FUNCTION family_private.limit_correspondence() FROM PUBLIC,anon,authenticated;
DROP TRIGGER IF EXISTS family_correspondence_rate_limit ON public.family_correspondence;
CREATE TRIGGER family_correspondence_rate_limit BEFORE INSERT ON public.family_correspondence
FOR EACH ROW EXECUTE FUNCTION family_private.limit_correspondence();

-- These requests remain private and reviewable; no automatic public listing of a child.
ALTER TABLE public.family_member_requests DROP CONSTRAINT IF EXISTS family_member_requests_kind_check;
ALTER TABLE public.family_member_requests ADD CONSTRAINT family_member_requests_kind_check
  CHECK (kind IN ('initiative','suggestion','occasion','solidarity','archive','complaint','birth','correction'));
