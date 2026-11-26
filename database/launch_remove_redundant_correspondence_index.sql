-- Applied after launch_security_hardening.sql. Keep the already-existing
-- family_correspondence_user_idx (user_id, created_at DESC); no row changes.
DROP INDEX IF EXISTS public.family_correspondence_sender_recent_idx;
