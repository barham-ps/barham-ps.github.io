# Zero-budget capacity plan (replaces prior paid scale target)
Target at least 1,000 registered accounts with no recurring bills. A 1 TB archive is aspirational: no verified permanent free managed 1 TB object store has been identified. No billing activation without owner approval.

## Free architecture
- Keep GitHub Pages and current official URL. GitHub stores source, not member files. A Cloudflare Pages free preview can be considered later; static requests are unlimited subject to platform limits, but dynamic APIs retain their own quotas. No cutover or account signup performed.
- Supabase Free: 50,000 monthly active auth users, 500 MB database and 1 GB file storage; bandwidth, shared compute and rate limits still apply. 50,000 MAU is not a concurrency guarantee.
- R2 Standard includes 10 GB-month free but can charge for exceeding quotas; do not activate billing for a zero-budget project. Oracle Always Free offers 20 GB object storage subject to eligibility. Neither is currently connected.
- Compress new public illustrations, preserve original private documents, paginate and batch signed URLs. Two partial public-feed indexes have been added to the live database and verified. Keep RLS, existing OTP and MFA, and no-store navigation.
- At 200 KB average per compressed image, 1 GB is roughly 5,000 images before overhead or other files. Monitor actual database/storage/egress in dashboard and stop new media uploads before limits; archive original large files offline if the owner has storage.
- Current aggregate baseline before indexes: database 13,244,083 bytes, objects 6,171,092 bytes, 14 objects, 2 auth accounts. No member records exported.
- Do not use GitHub releases or public repositories as private file storage, and do not create multiple accounts to evade quotas.
- Verify staged changes with node --check portal.js, node --test tests/*.test.cjs and browser smoke tests. Run load tests against an isolated environment only; do not claim measured concurrency until verified.

Sources: https://supabase.com/pricing ; https://docs.github.com/en/pages/getting-started-with-github-pages/github-pages-limits ; https://developers.cloudflare.com/r2/pricing/ ; https://developers.cloudflare.com/pages/functions/pricing/ ; https://docs.oracle.com/en-us/iaas/Content/FreeTier/freetier_topic-Always_Free_Resources.htm
