# Public generic risk register
Illustrative initial ratings, not measured risk. Owner must approve likelihood, impact, treatment, residual risk and deadlines privately.
| Risk | Initial priority | Treatment | Evidence needed |
|---|---|---|---|
| Cross-member data disclosure | Critical | RLS and object authorization | synthetic two-account tests |
| Account takeover | High | MFA, password protection, session revocation | Auth settings and recovery tests |
| Backup loss | High | encrypted independent immutable copies | retention and restore evidence |
| Supply chain compromise | High | pinned dependencies, SRI, provenance | verified deployed artifact |
| Public endpoint abuse | High | rate limits, minimal disclosure | bounded staging tests |
| Sensitive telemetry | High | minimization and redaction | synthetic log inspection |
| Service outage | High | rollback, recovery plan | measured RTO/RPO |
| Unlawful or excessive retention | High | data inventory and retention approval | private review |
Risk acceptance is not implied by this register. Review monthly and after significant changes.
