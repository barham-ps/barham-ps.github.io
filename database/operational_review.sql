-- Authorized operators only. Read-only diagnostics; do not publish live results.
begin read only;
set local statement_timeout = '5s';
select n.nspname,p.proname,pg_get_function_identity_arguments(p.oid) as arguments,
       p.proconfig,has_function_privilege('anon',p.oid,'EXECUTE') as anon_execute,
       has_function_privilege('authenticated',p.oid,'EXECUTE') as authenticated_execute,
       exists(select 1 from aclexplode(coalesce(p.proacl,acldefault('f',p.proowner))) a
              where a.grantee=0 and a.privilege_type='EXECUTE') as public_execute
from pg_proc p join pg_namespace n on n.oid=p.pronamespace
where n.nspname in ('public','family_private') and p.prosecdef order by 1,2;

select tablename,policyname,roles,cmd,qual,with_check
from pg_policies where schemaname='public'
and tablename in ('family_martyrs','family_martyr_photos','family_public_content')
order by tablename,policyname;

select s.relname,s.indexrelname,s.idx_scan,pg_relation_size(s.indexrelid) as bytes,
       i.indisunique,i.indisprimary
from pg_stat_user_indexes s join pg_index i on i.indexrelid=s.indexrelid
where s.schemaname='public' and s.idx_scan=0 order by s.indexrelname;
select stats_reset from pg_stat_database where datname=current_database();

set local role anon;
select set_config('request.jwt.claims','{"role":"anon"}',true);
explain (analyze,buffers,format json) select count(*) from public.family_martyrs where published;
explain (analyze,buffers,format json) select count(*) from public.family_martyr_photos where published;
explain (analyze,buffers,format json) select count(*) from public.family_public_content where published;
reset role;
set local role authenticated;
select set_config('request.jwt.claims','{"role":"authenticated","sub":"00000000-0000-4000-8000-000000000001","session_id":"00000000-0000-4000-8000-000000000002","aal":"aal2"}',true);
explain (analyze,buffers,format json) select count(*) from public.family_martyrs where published;
explain (analyze,buffers,format json) select count(*) from public.family_martyr_photos where published;
explain (analyze,buffers,format json) select count(*) from public.family_public_content where published;
rollback;
