-- Read-only, aggregate-only diagnostic. Run privately in the Supabase SQL editor.
-- Supply the actual quota from Dashboard > Usage when evaluating storage.
select current_setting('max_connections')::int as max_connections,
       count(*) filter (where backend_type='client backend') as client_connections,
       count(*) filter (where backend_type='client backend' and state='active') as active_connections
from pg_stat_activity;
select count(*) as object_count,
       coalesce(sum(case when metadata->>'size' ~ '^[0-9]+$'
                         then (metadata->>'size')::numeric else 0 end),0) as known_bytes,
       count(*) filter (where coalesce(metadata->>'size','') !~ '^[0-9]+$') as unknown_size_objects
from storage.objects;
-- Supavisor client limits and billing usage require provider metrics; these are snapshots, not billing totals.
