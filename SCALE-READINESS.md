# Scale readiness (staging only)
Target: 1,000,000 registered accounts and >100 TB total object storage, not a guarantee of 1,000,000 concurrent sessions.

## First change
Public history/tree/archive queries are paginated (24 rows), ordered consistently and use one signed-URL batch per page. Keep the published-only predicate, existing RLS, five-minute signed URLs and no-store navigation. No private files are cached. Run node --check portal.js and node --test tests/*.test.cjs plus browser smoke tests before deployment.

## Infrastructure gates
- Keep GitHub as source control. GitHub Pages has a soft 100 GB/month transfer limit; use a Cloudflare Pages preview with the existing build script, then a domain and CDN after testing. Do not switch the canonical URL or auth allowlist until owner approval.
- Store object metadata, owner IDs and access policies in Postgres, not the files themselves. Use private R2/S3 object storage, server-side authorization before narrowly scoped short-lived upload/download URLs, multipart upload, checksum validation, quotas and quarantine/scanning. Do not migrate existing member documents before a tested copy/rollback and access isolation. A single object is subject to provider limits.
- Measure auth and database load in an isolated test project with synthetic accounts and data. Use indexed queries, bounded pagination, connection pooling where applicable and read replicas only if measured demand warrants them. Never load-test real member accounts or production without an approved plan.
- Use a transactional SMTP provider for production recovery (not consumer Gmail at high volume). Configure verified sending domain, SPF/DKIM/DMARC, limits, retry policy and delivery metrics; preserve existing OTP verification and administrative MFA. No secrets in Git.
- Capacity gates: define peak concurrent users and request mix; measure p95 latency, error rate, DB CPU/connections, email delivery, storage/egress and cost. Run staged tests at increasing rates, then approve capacity against actual results. No claim of verified million-user capacity until these gates pass.
- R2 standard storage list price $0.015/GB-month: 100,000 GB is about $1,500/month before operations, backups, database and auth. Actual costs depend on usage and current provider pricing. No paid resources provisioned.

Sources: https://docs.github.com/en/pages/getting-started-with-github-pages/github-pages-limits ; https://developers.cloudflare.com/r2/pricing/ ; https://supabase.com/docs/guides/deployment/going-into-prod ; https://supabase.com/docs/guides/auth/auth-smtp .
