-- Rate limit public membership-number verification; QR UUID verification is unchanged.
CREATE TABLE IF NOT EXISTS family_private.membership_verify_windows (
 bucket_start timestamptz NOT NULL,
 actor_hash bytea NOT NULL,
 hits integer NOT NULL CHECK (hits BETWEEN 1 AND 60),
 PRIMARY KEY (bucket_start,actor_hash)
);
CREATE TABLE IF NOT EXISTS family_private.membership_verify_secret (
 singleton boolean PRIMARY KEY DEFAULT true CHECK (singleton),
 secret bytea NOT NULL CHECK (octet_length(secret)=32),
 last_cleanup timestamptz NOT NULL DEFAULT now()
);
INSERT INTO family_private.membership_verify_secret(singleton,secret)
 VALUES(true,extensions.gen_random_bytes(32)) ON CONFLICT(singleton) DO NOTHING;
ALTER TABLE family_private.membership_verify_windows ENABLE ROW LEVEL SECURITY;
ALTER TABLE family_private.membership_verify_secret ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON family_private.membership_verify_windows,family_private.membership_verify_secret FROM PUBLIC,anon,authenticated;

CREATE OR REPLACE FUNCTION public.family_verify_membership_number(p_number text)
 RETURNS TABLE(membership_number text, issued_at timestamptz, valid boolean)
 LANGUAGE plpgsql
 VOLATILE SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
 v_number text := upper(trim(p_number));
 v_bucket timestamptz := date_trunc('minute',clock_timestamp());
 v_actor text;
 v_ip inet;
 v_headers jsonb;
 v_secret bytea;
 v_hits integer;
BEGIN
 -- No lookup is done for invalid, oversized or null input.
 IF v_number IS NULL OR length(v_number)<>14 OR v_number !~ '^AB-[0-9]{4}-[0-9]{6}$' THEN RETURN; END IF;
 IF auth.uid() IS NOT NULL THEN
   v_actor := 'user:'||auth.uid()::text;
 ELSE
   -- Hosted Supabase sets this edge header. Do not trust arbitrary X-Forwarded-For.
   BEGIN
     v_headers := coalesce(nullif(current_setting('request.headers',true),''),'{}')::jsonb;
     v_ip := nullif(v_headers->>'cf-connecting-ip','')::inet;
   EXCEPTION WHEN invalid_text_representation THEN v_ip := NULL;
   END;
   v_actor := CASE WHEN v_ip IS NULL THEN 'anonymous:missing-edge-ip' ELSE 'edge:'||host(v_ip) END;
 END IF;
 SELECT s.secret INTO STRICT v_secret FROM family_private.membership_verify_secret s WHERE s.singleton;
 -- Window-specific keyed digest; no raw IP or member number is retained.
 INSERT INTO family_private.membership_verify_windows AS w(bucket_start,actor_hash,hits)
 VALUES(v_bucket, extensions.hmac(convert_to(v_actor||':'||extract(epoch from v_bucket)::bigint::text,'UTF8'),v_secret,'sha256'),1)
 ON CONFLICT(bucket_start,actor_hash) DO UPDATE SET hits=w.hits+1 WHERE w.hits<60
 RETURNING hits INTO v_hits;
 IF v_hits IS NULL THEN
   RAISE SQLSTATE 'PT429' USING MESSAGE='Too many verification requests. Try again shortly.';
 END IF;
 -- Opportunistic bounded-frequency pruning; never stores a raw IP.
 UPDATE family_private.membership_verify_secret SET last_cleanup=v_bucket
   WHERE singleton AND last_cleanup < v_bucket-interval '15 minutes';
 IF FOUND THEN
   DELETE FROM family_private.membership_verify_windows WHERE bucket_start < v_bucket-interval '15 minutes';
 END IF;
 RETURN QUERY SELECT c.membership_number,c.issued_at,(c.revoked_at IS NULL AND a.status='approved')
  FROM public.member_certificates c JOIN public.member_applications a ON a.id=c.application_id
  WHERE c.membership_number=v_number AND a.membership_number=c.membership_number;
END;
$function$;
REVOKE ALL ON FUNCTION public.family_verify_membership_number(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.family_verify_membership_number(text) TO anon,authenticated;
