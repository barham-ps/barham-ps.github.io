# Preliminary statement of applicability and control matrix
Owner approval and complete licensed-standard control mapping pending. No exclusions approved.
| ID | Control / framework | Applicability | Status | Evidence or required action |
|---|---|---|---|---|
| C01 | Governance / ISO 27001, CSF Govern | Yes | configured | SECURITY-GOVERNANCE.md; approve scope and owner |
| C02 | Risk management / ISO 27001 | Yes | pending | RISK-REGISTER.md; private assessment and acceptance |
| C03 | Privacy / ISO 27701 | Yes | pending | approve data inventory, lawful basis, retention and rights process |
| C04 | Access / CIS, Zero Trust | Yes | observed | prior limited RLS and administrator AAL2 checks; repeat cross-account tests |
| C05 | Storage / ASVS, privacy | Yes | observed | prior five private buckets; verify object authorization |
| C06 | Secure development / ASVS, CIS | Yes | configured | security.test.cjs, CodeQL, Gitleaks, Trivy |
| C07 | API authorization / OWASP API | Yes | pending | synthetic two-account BOLA and function authorization tests |
| C08 | Build integrity / SLSA | Yes | configured | release-provenance.yml; verify actual deployed artifact |
| C09 | Edge protection / CIS | Yes | pending | verify live headers, WAF, bot controls, rate limits |
| C10 | Monitoring / CSF Detect | Yes | configured | monitoring workflows; confirm results and alert routing |
| C11 | Incident response / CSF Respond | Yes | pending | owner-approved procedure and tabletop exercise |
| C12 | Recovery / ISO 22301 | Yes | configured | synthetic restore tooling; real encrypted backup retention unverified |
| C13 | Service management / ISO 20000-1 | Yes | pending | service inventory, change approvals, availability targets |
| C14 | Quality / ISO 9001 | Yes | pending | acceptance criteria, complaints and corrective actions |
| C15 | Supplier management / ISO 27001 | Yes | pending | review hosting terms, privacy agreements and shared responsibility |
| C16 | Release rollback / ISO 20000-1 | Yes | pending | test rollback and canary in staging |
