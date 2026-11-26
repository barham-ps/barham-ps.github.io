-- Run ONLY in an isolated database or after staging mail_outbox.sql INSIDE the
-- same rollback transaction. No actual HTTP call or real address is involved.
DO $$
DECLARE job uuid; called text;
BEGIN
  IF (SELECT enabled FROM family_private.mail_outbox_settings WHERE singleton) THEN RAISE EXCEPTION 'Regression requires an inactive isolated queue'; END IF;
  IF EXISTS(SELECT 1 FROM family_private.mail_outbox) THEN RAISE EXCEPTION 'Regression requires an empty isolated queue'; END IF;
  IF has_function_privilege('anon','public.family_mail_reserve(integer)','EXECUTE') OR has_function_privilege('authenticated','public.family_mail_claim(uuid)','EXECUTE') THEN RAISE EXCEPTION 'unsafe RPC privileges'; END IF;
  IF EXISTS(SELECT 1 FROM public.family_mail_reserve(1)) THEN RAISE EXCEPTION 'disabled queue reserved jobs'; END IF;
  UPDATE family_private.mail_outbox_settings SET enabled=true WHERE singleton;
  PERFORM family_private.mail_enqueue('admin_membership','00000000-0000-4000-a000-000000000002',NULL,'admin');
  SELECT job_id INTO job FROM public.family_mail_reserve(1);
  IF job IS NULL THEN RAISE EXCEPTION 'Reservation failed'; END IF;
  SELECT template_key INTO called FROM public.family_mail_claim(job);
  IF called IS DISTINCT FROM 'admin_membership' THEN RAISE EXCEPTION 'Claim failed'; END IF;
  IF EXISTS(SELECT 1 FROM public.family_mail_claim(job)) THEN RAISE EXCEPTION 'Repeated claim accepted'; END IF;
  IF NOT public.family_mail_finish(job,'sent') THEN RAISE EXCEPTION 'Finish failed'; END IF;
  IF public.family_mail_finish(job,'sent') THEN RAISE EXCEPTION 'Repeated completion accepted'; END IF;
  -- Never commit a regression fixture.
END $$;
