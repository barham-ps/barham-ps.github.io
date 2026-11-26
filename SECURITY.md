# Security policy

Report suspected vulnerabilities privately using the family portal's official contact email: albarham.inc@gmail.com. Do not publish member records, credentials, tokens or proof-of-concept material containing personal data in public issues.

The supported production version is the current main branch. Test only systems you own or have explicit authorization to test, without accessing other members' data or disrupting service.

## Security baseline
- Supabase row-level security and server-side authorization for administrative operations.
- MFA required for privileged database operations when the administrator has a verified factor.
- Private storage and limited-time links for published news images.
- Content Security Policy and version-pinned external scripts.
- Automated code analysis and limited-permission GitHub workflows.
- No service-role keys or passwords in client code or public repository.
- Security event records stored in a non-public database schema.

Account MFA enrollment, leaked-password checks, repository push protection, backup retention, and production testing require separate verification by the owner.

## Deployment and assurance boundaries
The portal is a static GitHub Pages application. Browser CSP and client validation are defense in depth, not server-side authorization or rate limiting. The security tests in tests/security.test.cjs are regression checks, not a penetration test. Run node --test tests/security.test.cjs with Node 20+.

For new passwords the UI requires 15–128 characters; enforce a compatible policy in Supabase Auth independently. Review leaked-password protection, CAPTCHA/Turnstile integration (frontend and Auth together), server-side Auth rate limits, email confirmation, JWT lifetime, and mandatory administrator MFA. Test with a second non-admin account before tightening policies. Preserve public certificate verification and validate minimal disclosure and abuse protection.

GitHub Pages does not apply custom response-header files. A supported edge provider or configurable host is required for site-specific HTTP CSP including frame-ancestors, permissions policy, HSTS decisions, WAF and bot rules. Restrict the backend independently: protecting the HTML host alone does not protect direct requests to Supabase. Do not cache authenticated API responses. Verify external script SRI or vendor audited copies; version pinning alone is not integrity verification.

Require reviewed pull requests and passing security checks on main; enable account MFA and secret push protection where supported. Maintain independent encrypted database/storage backups and test restoration. Passkeys, PQC, SIEM, RASP, malware scanning and immutable backup infrastructure are separate provider/backend projects and must not be claimed as active without verification.

## Cloudflare Worker deployment and assurance boundaries
The allowlisted static build is `sh scripts/build-pages.sh`, output directory `dist`. The Cloudflare Worker deployment is active and the deployment workflow checks six response-header controls plus the deployed security configuration. GitHub Pages remains available and does not apply _headers. WAF managed rules, bot protections and rate limits must be verified separately for an owned, proxied zone and the direct Supabase API. Preserve certificate links and test Auth URL allowlists before migrating domains.
Turnstile frontend integration covers signup, password sign-in and recovery. Set ONLY the public production site key in security-config.js; store the secret in Supabase Auth settings (never in Git). Allow the exact host in Cloudflare; verify staging flows and then coordinate activation of both ends. An empty key intentionally preserves current authentication. See https://supabase.com/docs/guides/auth/auth-captcha and https://developers.cloudflare.com/turnstile/.
Passkeys require tested SDK support and relying-party configuration; the currently pinned SDK is documented below. Do not weaken administrator AAL2 enforcement for passkey sign-in. See https://supabase.com/docs/guides/auth/passkeys.
On 2026-11-24 database administrator authorization was tightened to require a live session, confirmed email, verified MFA factor and AAL2 for all administrators. Enrollment was checked before migration; a database-only claims test rejected AAL1 and accepted AAL2. Preserve the administrator's recovery process and never remove their last factor without a verified replacement.

The administrator security center now provides a live same-origin response-header check and an explicit infrastructure checklist. A missing or unverified header is not marked active. The unified evidence center reads recent public GitHub Actions runs from the main branch, identifies missing, failed, stale and in-progress results, and links to each workflow's evidence. These checks do not establish actual WAF, DDoS, PQC or backup coverage.

## Provider-independent upgrade (2026-11-24)
Vercel deployment is prepared with vercel.json; import this repository, use main and the allowlisted dist build. It is not a deployed WAF. hCaptcha is supported as an opt-in alternative to Turnstile; create a real site key, configure it in security-config.js and enable the matching secret in Supabase Auth Protection. Do not enable either end alone. New private event dates and archive source references are guarded by existing member-content RLS. A read-only database test under a synthetic authenticated identity returned no applications, lineage, member requests or private content and was not an admin. A later two-member synthetic isolation regression is maintained in database/two_member_isolation_regression.sql; it must be rerun in an isolated, rolled-back test after access-policy changes. Continue to require independently verified backups, malware quarantine, provider rate limits and breached-password protection.

The dependency-review job audits the pinned deployed npm SDK graph and retrieves the candidate SDK and QR browser files to syntax-check and report their public SHA-384 digests. This is not itself SRI or a browser regression test; inspect the results and independently verify the bytes before deploying an SDK update. The SQL access check in database/verify_access.sql is intentionally read-only and uses a synthetic identity.

The candidate SDK digest and QR digest were retrieved from successful GitHub Actions job 138675239359. The browser now pins these assets using SRI; CI re-fetches both exact URLs, verifies digests, checks SDK distribution equality with npm, and checks the methods used by the portal without real credentials. A full browser test of login, recovery, MFA and uploads remains necessary. SDK 2.119.2 is the release identified on 2026-11-24. Database-only active-session policies were also applied and checked for private member tables and archive access; existing certificate and application RPCs still require separate review.

## Password screening and WebAuthn readiness
The browser screens new passwords against Have I Been Pwned's Pwned Passwords range API only on form submission. It sends a five-character SHA-1 prefix and requests padded responses; the full password and full hash are never sent to HIBP. The SHA-1 is solely for matching the public corpus, not for storing passwords. New-password submission fails closed on a known match or an unavailable check; ordinary password sign-in is unaffected. This is a client-side safeguard and can be bypassed by direct Auth API callers. Native Supabase leaked-password enforcement requires Pro or higher and is not enabled. See https://haveibeenpwned.com/API/v3 and https://supabase.com/docs/guides/auth/password-security.
Passkey sign-in and registration are prepared behind passkeysEnabled=false. Supabase's experimental passkey API requires a configured relying-party origin and explicit Auth enablement; verify real browser flows and recovery before enabling the flag. AAL2 remains required for administrators. Turnstile is configured in the frontend and the matching Auth provider was configured separately; end-to-end account flows still require testing. External WAF, immutable backup retention, PQC and external SIEM must be verified independently.

## Security operations center (V60)
The administrator-only family_security_summary RPC now reports aggregate daily audit activity, available authentication audit events, attachment quarantine counts and the administrator's latest saved scan. It requires a live AAL2 admin session and denies anonymous execution. No IP addresses, token contents, actor identifiers or visitor fingerprinting are returned. A missing authentication audit record is not evidence of zero attempted logins. The frontend refreshes only while the security view is open and visible. The expanded inventory reports RLS coverage, all private/public buckets, and the five intended upload-limit configurations. The on-demand scan includes all five intended buckets and extra privileged RPCs. The matching SQL is in database/security_observability.sql; it is not in the static deployment allowlist. This is a scoped operations dashboard, not a managed SIEM, WAF or guaranteed attack-detection service.

## V61 production assurance
The Portal security workflow is scheduled daily, and now runs both regression suites and production-monitor unit tests. The separate Public portal availability and TLS workflow schedules read-only synthetic GET checks approximately every six hours: public page content markers, certificate validity/expiry and presence of security headers. Missing headers are warnings, not silently treated as passed; failed reachability or TLS checks fail the job. GitHub schedule delays are possible. This is not continuous IDS, nor a WAF. No user identifiers or tokens are collected. For edge security, deploy the allowlisted dist build to a configured host; verify header behavior, login and certificate links before moving any domain. Protect Supabase Auth and API independently.


## Advanced free checks
- Gitleaks scans full checkout history with redaction. Treat any hit as a review item; rotate confirmed secrets before removing history.
- Trivy checks the dependency inventory and configuration for high/critical findings; the official release binaries are checksum-verified.
- CycloneDX SBOM is generated from a temporary package lock for pinned browser packages, not a complete inventory of hosted infrastructure.
- ZAP baseline runs passive checks against a static preview on an internal Docker network only. Image versions are resolved to digests at runtime; this is not a production or authenticated pentest.
- OpenSSF Scorecard publishes a workflow artifact only, with no claim of external certification; branch protection may be unavailable with the read-only token.
- Turnstile requires an owner-created site key and matching Auth server secret. WebAuthn requires server-side relying-party settings and account recovery verification. Do not turn either flag on independently.

## Governance and attachment configuration
- GOVERNANCE.md is a draft for owner review, not formal approval. Existing privacy, retention and security caveats remain in effect; do not claim a configured provider or approved retention period without verification.
- Bucket provisioning reconciles the private request attachment bucket's existing privacy, file-size and MIME restrictions. This source update does not run a production migration; review and apply separately only if required.

## AEGIS operational canaries
The scheduled `AEGIS Operational security evidence` workflow tests the owned Cloudflare Worker response policy, exclusion of sensitive asset paths, public security-config parity, and the Supabase public API gateway. Three administrator-only RPCs must reject anonymous access with database SQLSTATE 42501, and a single synthetic password sign-in without CAPTCHA must be rejected with `captcha_failed`. No real credentials, member identifiers, email messages, database mutations or response bodies are recorded. A failed or missing result is not counted as protection. This does not test authorized cross-member access, WAF settings, email delivery, private AV engine or production backups. The admin evidence panel links daily results and distinguishes these checks from AEGIS synthetic and static evidence.

## Live request interception and membership abuse protection
Cloudflare Worker middleware intercepts private-path and invalid-method requests without serving asset bodies, while public static assets remain asset-first. A scoped native rate-limit binding applies to suspicious paths, approximately per edge location. This does not replace a managed WAF, and the Free plan's Worker invocation quota still applies. Supabase public membership-number lookups are limited to 60 requests per minute per authenticated identity or provider edge source. Window-specific HMACs avoid storing raw IP addresses; counters are pruned opportunistically. QR verification remains unchanged. A rolled-back SQL fixture confirmed the 61st request is rejected and another source is not blocked.
