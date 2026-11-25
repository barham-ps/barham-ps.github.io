# Advanced security control register
Owner requested implementation; status below is not a certification.
| Control | Status / acceptance gate |
|---|---|
| Secret push protection | Repository setting requires owner verification; Gitleaks CI is not push blocking |
| Rulesets and signed commits | Require repository settings and verified maintainer signing before enforcement |
| OpenSSF Scorecard | Existing workflow; inspect run evidence |
| OSV and Semgrep | Additional scanners require verified pinned tooling and successful execution |
| Reproducible builds | Two clean output builds compared byte-for-byte in release workflow |
| Sigstore Cosign | Separate signing workflow required; GitHub attestations already use Sigstore infrastructure |
| VEX | Record per vulnerability affected/not affected/fixed/under investigation; require evidence and reviewer, no blanket suppression |
| SLSA | Provenance workflow; no level claim until build and deployment trust boundaries independently verified |
| DAM | Existing aggregate audit monitoring; verify coverage and retention privately |
| DLP | Secret scanning and allowlisted build; production data egress control pending |
| File sanitization/CDR | Private scanner adapter exists; isolated reconstruction and quarantine deployment pending |
| Honeypots/canary tokens | Isolated synthetic assets only; no member data or credential collection; alert routing required |
| Database hardening | Verify RLS, grants, function execution and storage access before changes |
| Crypto agility | Inventory algorithms and key owners; test rotation and rollback; no custom cryptography |
| SOAR | Alert, triage, owner approval, contain, recover; no automatic account deletion or data modification |
## Additional framework mapping
ISO 27035: incident lifecycle; ISO 27036: supplier assessment; ISO 27040: storage and recovery; ISO 29100: privacy principles; NIST SSDF SP 800-218: secure development and vulnerability response; NIST SP 800-63-4: identity assurance and recovery; MITRE ATT&CK: threat mapping; MITRE D3FEND: defensive countermeasures. These are preliminary mappings, not full licensed-standard audits.
## Response playbook
On failed integrity or security checks: stop promotion, notify owner privately, verify evidence, isolate affected component with approval, rotate confirmed compromised credentials, restore known-good version, review corrective actions. Do not automatically block legitimate members or delete records.
