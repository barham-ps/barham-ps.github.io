# Independent quality diagnostics — wave 1

Thirteen new diagnostic engines or specifications, not thirteen certifications and not a claim of 100 technologies. Existing CodeQL, ZAP, Trivy, Gitleaks, Playwright, Lighthouse, and Scorecard are not counted.

| Engine | Scope |
|---|---|
| ShellCheck | Shell semantic mistakes |
| shfmt | Shell parser and formatting |
| yamllint | YAML duplicate keys and indentation |
| HTML Tidy | HTML structural diagnostics |
| libxml2 | XML well-formedness, network disabled |
| Bandit | Python security analysis |
| Pyflakes | Python undefined names and imports |
| Vulture | High-confidence unused Python code |
| codespell | English spelling in technical documents |
| SQLFluff | PostgreSQL SQL syntax and linting |
| Markdownlint | Markdown structural quality |
| JSON Schema | Portal-specific PWA manifest contract |
| tinycss2 | CSS token parsing errors |

The workflow runs for relevant changes, weekly, and on manual dispatch. Ubuntu's signed package repository is used and actual installed versions are recorded. These are advisory quality diagnostics, not a deployment gate for pre-existing lint debt. A nonzero tool result is review-required (may be findings or tool failure); missing or timed-out executables fail the workflow. No raw diagnostics, production requests, account data, or secrets are collected. To investigate, reproduce the listed commands in scripts/independent_quality.py locally; do not use automated formatting or fixes without review. No browser payload or database schema is changed.

An installed configuration is not evidence of a clean run. Review GitHub Actions status and the sanitized artifact before claiming successful operation.
