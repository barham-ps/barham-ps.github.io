# Integrated operating system — proposed operational baseline
Scope: family portal, GitHub source and releases, Cloudflare delivery, Supabase identity/database/storage. This is readiness guidance, not certification.

## ISO 9001 — quality
Record support requests privately with ID, category, owner, acceptance criteria, status and closure evidence. Review monthly: resolved requests, recurring defects, user feedback and corrective actions. Never publish personal data in public issues.

## ISO 27001 — information security
Maintain a private asset inventory with owner, classification, access, retention and supplier. Review access quarterly; require administrator MFA; prefer phishing-resistant FIDO2 where supported. Review dependencies weekly and incidents promptly. Record risk acceptance and corrective actions privately.

## ISO 22301 — continuity
Critical services: authentication, member records, private attachments, public portal. Targets (not measured guarantees): RPO 24h, RTO 4h. Weekly synthetic recovery, quarterly private restore, daily encrypted production backups to independent storage once configured. Include database and storage objects; test credentials and recovery keys independently. Record actual RPO/RTO and gaps.

## ISO/IEC 20000-1 — service management
Maintain private service and incident registers. Classify incidents by impact and urgency; prioritize data exposure and loss of access. Every production change needs test evidence, rollback plan and post-deployment verification. Proposed monthly availability objective 99.9%, not a contractual SLA. Review suppliers and availability monthly.

## Technical defense in depth
WAF, DDoS, bot management and rate limiting: verify provider configuration and live behavior; do not infer activation from hosting alone. TLS 1.3 and HSTS: verify negotiated transport and headers. Zero Trust: enforce least privilege and verified identity; external access gateway remains pending. CSP and SRI: test regressions. Isolation: retain isolated scanner environment; no Kubernetes requirement for static hosting. Passkeys: test recovery and compatibility before enforcement. Immutable backups: verify retention and restore, not just script presence.

## Management review
Monthly review of availability, failed security checks, open risks, support trends, recovery evidence and supplier changes. Record decisions and owners privately. Annual independent internal audit where practical. External certification requires separate accredited assessment.
