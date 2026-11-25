# Policies — owner approval recorded 2026-11-25
Information security: least privilege, administrator MFA, reviewed changes, vulnerability remediation, no secrets in source, annual policy review.
Privacy: collect only necessary data; document purpose, lawful basis, recipients, retention and deletion exceptions privately; verify requester identity before fulfilling access or deletion requests; protect minors and sensitive records; do not claim legal compliance without review.
Access: review privileged accounts quarterly and on role changes; revoke unused access; maintain tested recovery.
Incident response: report privately, triage, contain, preserve evidence, recover, assess applicable notification duties, document corrective actions.
Continuity: target daily encrypted backups, RPO 24h and RTO 4h approved as targets, subject to measurement; independent immutable storage; weekly synthetic and quarterly private recovery exercises.
Service and quality: record change acceptance, rollback, availability, complaints and corrective actions; review monthly.
Supplier: review GitHub, Cloudflare, Supabase and other processors for security, data handling, availability and exit arrangements.

Security awareness: review phishing, MFA recovery, secret handling and incident reporting quarterly. Review third-party dependencies weekly and investigate critical alerts promptly. Perform authorized isolated security testing before major releases; document findings and retest fixes. Production backups and restore evidence must be verified separately from synthetic tests.
