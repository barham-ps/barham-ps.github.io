# Recovery checklist

- Source code is versioned in Git. Protect the GitHub account with MFA and enable repository rulesets and secret push protection from the repository settings.
- Database and storage are separate assets. In the Supabase dashboard, check the backup retention available for the project. Database backups do not include Storage object contents. Export database data and copy private storage objects to encrypted, access-controlled storage outside the public repository. Never commit exports, service credentials, or member data to Git.
- Keep at least one independent protected copy. Test a restore in an isolated nonproduction project with restricted access before any production recovery. Verify authentication, RLS, member certificate checks, published news and file references. Document recovery time and data loss window.
- For suspected compromise, revoke relevant sessions, rotate exposed secrets in provider settings, review audit records, preserve evidence privately, and deploy a reviewed clean commit. Public publishable keys are not secret administrative credentials.
- Confirm real backups and test results separately. This checklist is not proof of a backup or restore.

## Independent backup implementation requirements
Keep encrypted logical database exports, Auth recovery procedures, and separate encrypted Storage object copies in an owner-controlled location. Use an independently managed destination with retention lock and narrowly scoped credentials; do not upload private records into public GitHub or workflow artifacts. Verify restore in a separate project and record RPO/RTO. No backup destination has been connected or verified in this upgrade.

## Restore evidence — distinguish synthetic from production

The automated PostgreSQL drill uses a temporary, socket-only local cluster, creates a synthetic source database, archives it with pg_dump, restores into a distinct empty database, and checks content and RLS permissions. It does not use production credentials, accounts, files or database connections. A passing drill does not establish production RPO/RTO.

Production is on the Free plan. Use the official CLI backup/restore guide on an owner-controlled, encrypted workstation:
https://supabase.com/docs/guides/platform/migrating-within-supabase/backup-restore
and https://supabase.com/docs/guides/platform/backups.

Before a real recovery exercise:
1. Designate a distinct, empty recovery project (or a private local Supabase stack). Do not use any existing project merely because it is accessible.
2. Verify destination capacity, cost, ownership, network access, and absence of production email/webhooks. Keep restored data private and test with dedicated synthetic identities.
3. Follow the provider procedure for role/schema/data exports and Auth-related recovery; independently copy Storage object bytes using supported Storage APIs. Encrypt exports and object backups outside Git, record hashes and timestamps privately. Never transmit database passwords or service-role keys in chat, logs or public CI.
4. Restore only to the designated isolated target. Verify object bytes, database row counts, constraints, RLS, certificate verification and authentication using approved test accounts. Check application configuration, secret rotation and delivery configuration separately.
5. Record actual backup time, restore time, data-loss window and pass/fail criteria in a private evidence register. Remove test copies according to the owner's retention policy.
6. Never call a synthetic restore a real production recovery or claim recovery objectives without measurements.

## Database access and performance review

Use `database/operational_review.sql` privately to inspect SECURITY DEFINER grants and search paths, policy overlap, and unused indexes (including size and uniqueness). It is read-only; review results before changing privileges. Compare read-only EXPLAIN ANALYZE plans under anon and a fabricated authenticated identity. Published read and administrator management policies deliberately overlap; changing ALL policies to command-specific policies requires isolated positive/negative permission regressions. Zero index scans alone do not justify dropping indexes. Retain the eight non-unique candidates pending representative traffic and review of statistics resets. Public certificate and membership verification are intentional; review enumeration and provider-level throttling separately.
