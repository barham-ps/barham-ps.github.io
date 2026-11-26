-- Run as an authorized database operator in a single transaction. ROLLBACK always.
-- Uses only synthetic IDs/IP and never returns a real member record or token.
BEGIN;
SET LOCAL statement_timeout='20s';
SELECT set_config('request.headers','{"cf-connecting-ip":"192.0.2.153"}',true);
DO $$
DECLARE
  v_token uuid;
  v_number text;
  v_code text;
BEGIN
  IF has_function_privilege('anon','public.family_verify_membership_number(text)','EXECUTE') OR
     has_function_privilege('authenticated','public.family_verify_membership_number(text)','EXECUTE') OR
     has_function_privilege('anon','family_private.consume_membership_verify_budget()','EXECUTE') THEN
    RAISE EXCEPTION 'Number-only API or rate helper exposed';
  END IF;
  IF EXISTS(SELECT 1 FROM storage.buckets WHERE public) OR
     EXISTS(SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
       WHERE n.nspname='public' AND c.relkind='r' AND NOT c.relrowsecurity) THEN
    RAISE EXCEPTION 'Public bucket or table without RLS';
  END IF;
  -- Synthetic fixture is optional if no existing certificate. Existing proof never leaves SQL.
  SELECT c.id,c.membership_number INTO v_token,v_number FROM public.member_certificates c
    JOIN public.member_applications a ON a.id=c.application_id WHERE a.membership_number=c.membership_number LIMIT 1;
  IF v_token IS NOT NULL THEN
    v_code:=upper(left(encode(extensions.digest(v_token::text||':manual-v1','sha256'),'hex'),16));
    IF NOT EXISTS(SELECT 1 FROM public.family_verify_certificate(v_token)) OR
       NOT EXISTS(SELECT 1 FROM public.family_verify_membership_number(v_number,v_code)) OR
       EXISTS(SELECT 1 FROM public.family_verify_membership_number(v_number, CASE WHEN v_code='0000000000000000' THEN '1111111111111111' ELSE '0000000000000000' END)) THEN
      RAISE EXCEPTION 'QR/manual compatibility or wrong-proof rejection failed';
    END IF;
  END IF;
END;
$$;
-- Fresh synthetic edge identity: shared budget for QR and manual API.
SELECT set_config('request.headers','{"cf-connecting-ip":"192.0.2.154"}',true);
SET LOCAL ROLE anon;
DO $$
BEGIN
  FOR i IN 1..12 LOOP
    IF i%2=0 THEN
      PERFORM public.family_verify_certificate('fd800000-4aa1-4d04-8000-000000000001');
    ELSE
      PERFORM public.family_verify_membership_number('AB-1900-000001','1234567890ABCDEF');
    END IF;
  END LOOP;
  BEGIN
    PERFORM public.family_verify_certificate('fd800000-4aa1-4d04-8000-000000000001');
    RAISE EXCEPTION 'Rate limiter accepted 13th attempt';
  EXCEPTION WHEN SQLSTATE 'PT429' THEN NULL;
  END;
END;
$$;
RESET ROLE;
SELECT true AS launch_security_regression_passed;
ROLLBACK;
