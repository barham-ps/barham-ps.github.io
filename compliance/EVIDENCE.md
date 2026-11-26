# Evidence index
Public source evidence only; live results must be verified separately.
- Governance: SECURITY-GOVERNANCE.md and compliance documents.
- Security tests: tests/security.test.cjs, tests/upgrade.test.cjs.
- Supply chain: .github/workflows/advanced-security.yml and release-provenance.yml.
- Recovery: scripts/backup-object-lock.sh, tests/backup-smoke.sh, .github/workflows/recovery-drill.yml.
- Monitoring: .github/workflows/cloudflare-security.yml, cloudflare-transport.yml, governance-evidence.yml.
- Private evidence required: owner approvals, access reviews, data inventory, actual backup retention and restore, incident exercises, supplier reviews, cross-account tests, live deployment verification.
Record evidence date, scope, reviewer, result and corrective action in restricted storage. Never publish raw personal data or secret-bearing logs.

- Integrated operational evidence: .github/workflows/iso-operational-evidence.yml (security regression, isolated restoration and encryption, privacy intake and public publication); review the current run, not file presence alone.
- First-party review and corrective action programme: OPERATIONAL-AUDIT.md. External auditor review and actual production backup evidence remain necessary.
