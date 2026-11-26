#!/usr/bin/env bash
# Synthetic data only. A private local PostgreSQL cluster, never a live project.
set -euo pipefail
umask 077
bin=$(pg_config --bindir)
for cmd in initdb pg_ctl psql createdb pg_dump pg_restore; do
	test -x "$bin/$cmd"
done
work=$(mktemp -d)
cleanup() {
	if [[ -f "$work/db/postmaster.pid" ]]; then "$bin/pg_ctl" -D "$work/db" -m fast -w stop >/dev/null 2>&1 || true; fi
	rm -rf -- "$work"
}
trap cleanup EXIT
mkdir -m 700 "$work/socket"
export PGHOST="$work/socket" PGPORT=55432 PGUSER="$(id -un)"
unset PGDATABASE PGHOSTADDR PGSERVICE PGSERVICEFILE PGPASSWORD PGOPTIONS
"$bin/initdb" -D "$work/db" --auth=trust --no-locale --encoding=UTF8 >/dev/null
"$bin/pg_ctl" -D "$work/db" -l "$work/server.log" -o "-c listen_addresses='' -k $work/socket -p $PGPORT" -w start >/dev/null
"$bin/createdb" drill_source
"$bin/createdb" drill_target
"$bin/psql" -X -v ON_ERROR_STOP=1 -d drill_source <<'SQL'
create role drill_reader nologin;
create table public.drill_records(id integer primary key, visible boolean not null, label text not null);
insert into public.drill_records values (1,true,'synthetic public'),(2,false,'synthetic private');
alter table public.drill_records enable row level security;
create policy visible_rows on public.drill_records for select to drill_reader using (visible);
grant select on public.drill_records to drill_reader;
SQL
started=$(date +%s)
"$bin/pg_dump" -Fc -d drill_source -f "$work/backup.dump"
(
	cd "$work"
	sha256sum backup.dump >backup.sha256
	sha256sum -c backup.sha256
)
"$bin/pg_restore" --exit-on-error --single-transaction -d drill_target "$work/backup.dump"
for db in drill_source drill_target; do
	"$bin/psql" -X -v ON_ERROR_STOP=1 -d "$db" <<'SQL'
do $$begin
 if (select count(*) from public.drill_records)<>2 or
    (select label from public.drill_records where id=2)<>'synthetic private' or
    not (select relrowsecurity from pg_class where oid='public.drill_records'::regclass) then
   raise exception 'Synthetic data or RLS integrity failed';
 end if;
end$$;
set role drill_reader;
do $$begin
 if (select array_agg(id order by id) from public.drill_records) is distinct from array[1] or
    has_table_privilege(current_user,'public.drill_records','INSERT,UPDATE,DELETE') then
   raise exception 'Restored role isolation failed';
 end if;
end$$;
reset role;
SQL
done
printf 'Synthetic PostgreSQL archive/restore and RLS checks passed; elapsed_seconds=%s\n' "$(($(date +%s) - started))"
