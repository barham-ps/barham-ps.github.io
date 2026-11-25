# AEGIS generation III
Additive CI only. Original security and production configuration unchanged.

- Blackbox: SHA-256 chained per-run evidence, 30-day GitHub artifact. Not independently anchored or immutable; an actor controlling the runner could rewrite the chain.
- Immortal: synthetic encryption and script syntax only; actual Object Lock storage and retention require owner configuration and private restore evidence.
- Quantum: local algorithm capability and signature test only; unsupported runners report failure, not success. No production PQC assertion.
- Watchtower: GitHub Pages DNS snapshot, TLS hostname validation and expiry check, selected header observation. No DNS drift baseline or Cloudflare verification yet.
- Mirror/Genesis: two clean static builds and comparison, not full service disaster recovery.
- Antidote: npm advisory audit for two pinned libraries; not exhaustive.
- Omega: local generation III evidence decision, not an enforced deployment gate. Existing signed release evidence remains separate.
- Labyrinth: synthetic database role isolation, not live account authorization testing.
- Policy as code: existing Guardian, Spectre, build allowlist and new local decision.
- Chaos engineering: existing Nemesis synthetic mutations and recovery drill; no production fault injection.
- Software diversity: independent byte comparison, hash checks, vulnerability audit and SQL tests; not independent trust domains.
- Moving target defense: deferred; no random routes, credential rotation or CSP changes without a threat model and compatibility testing.
- Continuous validation: push, PR, weekly and manual checks. No new paid services or production secrets.
