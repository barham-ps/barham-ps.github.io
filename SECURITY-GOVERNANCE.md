# Security governance baseline
This is an internal control framework, not certification or a claim of conformity.
Do not publish personal data, secrets, incident details or backup locations in this public repository.

| Framework | Control objective | Evidence / remaining work |
|---|---|---|
| ISO/IEC 27001 | Risk ownership, access review, incident response | Quarterly owner review; maintain private risk register and statement of applicability |
| ISO/IEC 27701 | Privacy governance, minimization, retention | Private data inventory, lawful processing assessment, deletion and access requests |
| NIST CSF 2.0 | Govern, Identify, Protect, Detect, Respond, Recover | Review security workflows monthly, assign incident owner, record recovery evidence |
| CIS Controls v8.1 | Inventory, secure configuration, account and vulnerability management | CycloneDX inventory, CodeQL, Gitleaks; review privileged accounts quarterly |
| OWASP ASVS 5.0.0 | Target Level 2 application verification | Existing regression tests are partial; independently test authorization, sessions and input validation |
| OWASP API Security Top 10 | Object and function authorization, resource limits | Test two synthetic accounts and anonymous access in isolated staging |
| NIST SP 800-207 | Explicit identity and least privilege | Review MFA, RLS and service permissions; edge policy does not replace backend authorization |
| SLSA | Verified build provenance | Verify signed release artifact; production deployment must consume the same verified artifact |

## Operational gates
- Before release: build, regression tests, dependency and secret scans, verify signed artifact.
- Canary: upload version without promotion; test preview using synthetic accounts. Confirm compatible HTML/JS asset versions and authentication redirect settings. Promote 5%, 25%, 50%, 100% manually only after reviewing errors and availability at each stage. Stop and roll back on authentication, authorization or integrity regression. Disable competing automatic full deployments before using this procedure.
- Backups: target daily encrypted backups, RPO 24 hours, RTO 4 hours (targets, not measured). Configure independent private versioned storage with Object Lock; verify retention and checksum. Monthly synthetic restore, quarterly authorized private recovery exercise. Never upload production exports to public CI.
- Telemetry: no credentials, request bodies, query strings, personal identifiers or certificate tokens in logs. Keep automatic invocation logs disabled. Enable traces only after privacy review and testing with synthetic requests; export only to an approved destination.
- CSP reporting: keep enforcement intact. Use a same-origin collector with strict size/rate limits, no raw request persistence, allowlisted directive names and aggregate counters. Do not enable reporting before collector deployment and abuse/privacy tests.
- Incident: isolate affected component, revoke affected credentials, preserve evidence privately, restore verified release, assess notification obligations and document lessons.
- Owner review monthly: record evidence, dates, gaps, owners and remediation privately. No certification claim without independent assessment.
