# Operational audit programme and corrective actions
Updated 2026-11-26. This is a sanitized first-party readiness review, not independent audit, certification, or an assertion of conformity. No private evidence or actual personal records belong in this public repository.

## Operational controls
| Activity | Responsible role (confirm assignment privately) | Cadence / evidence |
|---|---|---|
| Security review | Portal administrator | Weekly CI, monthly risk review, quarterly access review, dated approvals |
| Privacy intake | Designated privacy owner | Requests tracked privately by reference; verify identity and scope, determine lawful exceptions, answer privately, record decision; contact is available even without a member account |
| Continuity | Recovery owner | Daily backup objective; weekly isolated restore; quarterly production backup restore to an isolated environment; actual RTO/RPO measured |
| Quality and complaints | Service owner | Acceptance test before changes; monthly complaint trend and documented corrective action |
| Cloud governance | Provider account owner | Monthly permissions and service review, quarterly shared responsibility and exit review |
| Internal audit | Objective reviewer, not the implementer when feasible | Annual review and after major changes; record scope, sampling, findings and verification in restricted storage |

## Exercise and review evidence
- The ISO operational evidence workflow executes existing security regression, actual isolated PostgreSQL archive/restore and encryption checks on synthetic data, privacy intake route validation, and read-only public checks on both hosting origins. It never creates real member records or submits actual privacy requests.
- The public privacy page routes approved members to the existing private request register and provides a contact route for non-members. This is an intake channel, not evidence of a completed rights request or an automated deletion feature.
- Recheck every CI run and preserve dated evidence in the restricted owner workspace. Failures, skipped checks and unavailable evidence require corrective actions; successful automated tests do not establish full conformity.
- Before closing a production recovery item, confirm an actual independently encrypted database and object backup, retention and a successful isolated restore. Record measured RPO/RTO; never use synthetic data results to close that item.
- Before closing supplier and cloud items, confirm provider contract, account ownership, permissions, processing locations as applicable, secret rotations, restoration and exit plan privately.
- Before closing privacy items, verify retention schedule, applicable obligations, processor agreements, data-subject response procedure, complaint handling and reviewer approval through a constrained authorized pilot.

## Corrective action template — use privately
Reference | observation | requirement | priority | accountable owner | root cause | correction | corrective action | due date | verification/evidence | reviewer | status
Keep private evidence, user details, provider credentials and actual unresolved security findings out of this public repository.

## Independent certification inquiry checklist
Confirm the legal or organizational applicant name, registration/authority (if applicable), consent of its representative, staff/roles, geographic scope, applicable statements of scope and standards editions, audit accessibility and budget. Ask a certification body for applicable accredited scope, integrated audit quote, remote audit feasibility, audit stages, surveillance, and evidence requirements. ISO/IEC 27017:2026 is guidance: request clarification of an available attestation scheme, not an automatic standalone certificate. Verify accreditation through the independent accreditor and certificate register before contracting.
No application has been submitted, no provider engaged and no audit fee allocated. See https://www.iso.org/certification.html and https://www.iafcertsearch.org/.
