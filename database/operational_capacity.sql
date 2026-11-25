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

-- Private manual threshold evaluation. Replace byte limits with current dashboard values.
-- No external alerts are sent by this query. Connection counts are not Supavisor quotas.
with settings as (select 500000000::numeric as db_limit,1000000000::numeric as object_limit),
usage as (select 'database' as resource,pg_database_size(current_database())::numeric as used_bytes,db_limit as limit_bytes from settings
union all select 'storage_objects',coalesce(sum(case when metadata->>'size' ~ '^[0-9]+$' then (metadata->>'size')::numeric else 0 end),0),object_limit from storage.objects cross join settings group by object_limit),
metrics as (select resource,used_bytes,limit_bytes,round(100*used_bytes/nullif(limit_bytes,0),2) as pct from usage)
select *,case when pct>=95 then 'critical' when pct>=85 then 'high' when pct>=70 then 'warning' else 'normal' end as threshold_state from metrics;
