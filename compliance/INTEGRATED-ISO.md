# Integrated management system — five-standard readiness
Updated 2026-11-26. Status: preparation only; no independent certification or formal conformity claim.
Scope: operation and maintenance of the AL BARHAM family portal, including GitHub release, Cloudflare hosting, Supabase authentication, database and object storage, and owner-operated member services. Confirm applicant identity, scope, obligations and accountable roles privately before audit. The following original work programme is not a reproduction of the licensed standards or a complete clause assessment. Obtain authorized copies and applicable amendments before a formal assessment.

## Standard register
| Standard | System | Status | Official reference |
|---|---|---|---|
| ISO/IEC 27001:2022 | ISMS | preparation | https://www.iso.org/standard/27001 |
| ISO/IEC 27701:2025 | PIMS | preparation | https://www.iso.org/standard/27701 |
| ISO 22301:2019 | BCMS | preparation | https://www.iso.org/standard/22301 |
| ISO 9001:2026 | QMS | preparation | https://www.iso.org/standard/9001 |
| ISO/IEC 27017:2026 | Cloud security guidance | guidance | https://www.iso.org/standard/27017 |

ISO/IEC 27017 is cloud security control guidance; assess applicability alongside the ISMS and verify any proposed third-party attestation scheme separately. Cloud-provider certificates do not certify this portal. ISO itself does not issue certification.

## Readiness deliverables and decision gates
| ID | Domain | Deliverable / operational gate | Evidence / acceptance criterion | State |
|---|---|---|---|---|
| IS01 | Security | Scope, asset inventory, risk treatment, Statement of Applicability, policy approval | Signed scope and dated private control mapping; remaining risks approved | pending |
| IS02 | Security | Release and edge controls | Commit-bound successful CI, provenance and live checks; unresolved warnings reviewed | configured |
| IS03 | Security | Privileged access and incident response | Authorized repeat two-member tests, MFA/recovery checks and incident exercise | pending |
| PI01 | Privacy | Record processing purpose, categories, recipients, controllers/processors, child data and retention | Private inventory and applicable obligations reviewed; deletion exceptions documented | pending |
| PI02 | Privacy | Rights request procedure and identity validation | Synthetic access/correction/deletion/rejection exercise; no raw user data in reports | pending |
| PI03 | Privacy | Processor oversight and breach assessment | Private agreements, transfers and disclosure decision procedure reviewed | pending |
| BC01 | Continuity | Business impact analysis, dependency map, incident roles | Owner approval, service priorities, impact thresholds and communication plan | pending |
| BC02 | Continuity | Backup isolation, restore and rollback | Encrypted independent backup; measured restoration of database and objects; synthetic drills are not production evidence | pending |
| BC03 | Continuity | RTO/RPO measurement and continuity exercise | Actual recovery time and data-loss interval within approved targets; lessons closed | pending |
| QM01 | Quality | Service catalogue, user requirements and acceptance checks | Owner-approved requirements, accessible Arabic and English flow checks | pending |
| QM02 | Quality | Release quality gate and user feedback | CI results and documented complaints, corrections, verification and change history | configured |
| QM03 | Quality | Management review and improvement | Trends, objectives, responsible owners, corrective action closure; no invented satisfaction scores | pending |
| CL01 | Cloud | Shared responsibility, data location, vendor access and exit | GitHub, Cloudflare and Supabase control ownership and private supplier review | pending |
| CL02 | Cloud | Edge isolation, service roles, logging, tenant separation | Direct provider evidence: Cloudflare live headers/guard, scoped credentials and Supabase RLS/object checks | configured |
| CL03 | Cloud | Cloud configuration and recoverability | Review each production origin, provider settings, backup/export and termination plan | pending |

## Implementation procedures (owner approval and pilot required)
- Security: capture risk and control ownership privately; review access quarterly, verify incident containment and remediation with repeat tests. Record exceptions with expiry and risk acceptance.
- Privacy: accept requests through the private contact route, verify claimant identity without excessive collection, log only a restricted request reference, resolve access/correction/deletion with documented exceptions, confirm outcome privately. Do not store member records, contact details or real requests in this public repository.
- Continuity: identify critical functions (membership, authentication, storage, public access); document restore dependencies and escalation. Existing RTO 4h and RPO 24h are planning targets, not measured results. Perform an isolated restore, verify data and object integrity and time, then record corrective actions. Do not restore over production without separate authorized recovery decision.
- Quality: define acceptance criteria before each change; test keyboard access, Arabic/English routes, registration and recovery with authorized test accounts; review complaints privately, assign owner/date, retest fixes and monitor actual availability. Never substitute successful CI for user satisfaction or audited conformity.
- Cloud: maintain a private provider responsibility matrix (identity, edge, storage, backups, logging and incident contacts). Review scoped credentials, policy settings, data lifecycle and exit/export; verify each origin independently; do not claim one host's headers protect another.

## Evidence ledger (restricted operational copy)
Use this schema privately: control ID | scope/environment | artefact or redacted evidence reference | commit/version | observed timestamp | reviewer | result (pass/fail/pending) | limitation | corrective action | due date. Keep personal information, secrets, contracts, security findings and evidence out of public builds and this public repo.

## Audit and certification sequence
1. Ratify applicant, management-system scope, accountable roles, policy, edition and applicable amendments; record climate relevance where applicable.
2. Complete licensed-standard gap assessments; implement missing controls and accumulate operating evidence.
3. Conduct objective internal audits and management review; track findings, root causes and effectiveness.
4. For management-system certification, choose an appropriately accredited external certification body and agree scope, costs and audit plan. No application or purchase is authorized by this file.
5. Complete independent audit stages and corrective actions. Publish only verified certificate details, dates, issuer and scope after issuance. Never present a guide, supplier credential or CI result as a certificate.

Official certification guidance: https://www.iso.org/certification.html
