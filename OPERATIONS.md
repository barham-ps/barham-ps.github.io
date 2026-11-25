# Production operations — owner approval gates

## Edge deployment (not active)
Import the repository into Cloudflare Pages with build command `sh scripts/build-pages.sh`, output `dist`. Keep GitHub Pages serving existing links until the preview passes. Connect a domain you own; configure HTTPS and the WAF/DDoS policies available for your plan. Do not apply a blanket bot challenge to public search crawlers. Existing _headers only take effect on a compatible host. Run `python3 scripts/production_monitor.py --host YOUR_PREVIEW_HOST --strict-headers`; test actual login, recovery, MFA, certificate links, member permissions and images in staging. Preserve the old origin and URLs until cutover; update canonical, sitemap, hreflang, Auth allowlist and provider settings together. A WAF on the web host is not protection for direct Supabase API requests.

## Auth and access
Configure Turnstile or hCaptcha in its owner console and the matching Supabase Auth provider. Public site key only in security-config.js, never secret. Test login/signup/recovery together on staging before production activation. Supabase Free does not include native leaked-password protection; existing client-side screening remains enabled but cannot enforce Auth API calls. Do not buy or enable a paid service without owner consent. Use two dedicated, approved synthetic member accounts and a distinct admin account in an isolated test environment; confirm A cannot read or alter B's data, non-admin cannot manage the portal, and admin must complete MFA. Never use actual members as test targets.

## Backups and recovery
On an owner-controlled workstation, export a database backup using the supported Supabase backup procedure, and export Storage objects separately. Include the role/schema and Auth recovery requirements from the official backup/restore guidance. Keep plaintext exports outside this repository on encrypted local storage; do not export data in CI. Verify the backup recipient's OpenPGP fingerprint independently. Encrypt each local export with `bash scripts/backup-encrypt.sh INPUT_FILE OUTPUT.gpg RECIPIENT_FINGERPRINT`. Record SHA-256 and backup date in a private inventory. Keep the private recovery key separately under owner control. Use GPG on a trusted workstation to verify decryption and integrity; restore to a distinct isolated project, never overwrite production for a test. Verify data integrity, RLS, Auth and storage references; document RPO/RTO and cleanup. The synthetic encryption test does not prove a real data backup or restore.

## Search visibility
Keep Google Search Console and Bing Webmaster Tools ownership and submit sitemap.xml; request indexing through the respective owner console. Existing noindex on genealogy and retired register is intentional and not access control. Never submit those URLs or private member content. Register a custom domain only after owner selection and cost approval.

References:
- https://developers.cloudflare.com/pages/configuration/headers/
- https://developers.cloudflare.com/pages/configuration/custom-domains/
- https://supabase.com/docs/guides/auth/auth-captcha
- https://supabase.com/docs/guides/auth/password-security
- https://supabase.com/docs/guides/platform/backups
- https://search.google.com/search-console
- https://www.bing.com/webmasters

## V69 email-code password recovery — required hosted configuration
In Supabase Dashboard > Authentication > Email Templates > Reset password, set the subject to `آل برهم | رمز استعادة كلمة المرور` and paste `supabase/templates/recovery.html` into the template body. The template uses {{ .Token }} and a plain portal link, not a token-bearing link. Keep existing SMTP and redirect allowlist; verify actual delivery with a dedicated test account. OTP length and expiry are determined by Supabase (UI accepts 6–8 digits). Set a short expiry, e.g. 10 minutes, and appropriate Auth rate limits in the dashboard after checking effects on other email flows. Do not paste OTPs, passwords or provider secrets into chat or Git. Browser and unit tests use fake accounts/mocked auth; they do not prove email delivery. Existing password-reset links remain supported. The account password-change button now routes through email recovery; provider-side enforcement of all password changes is separate from the website UI.

V70: signed-in recovery uses a server-verified confirmed email, locked in the UI; guest recovery uses Supabase's existing-account recovery endpoint without creating accounts or exposing an email directory. The proof expires in the UI after ten minutes following successful verification; actual OTP expiry and throttling are provider settings. The portal does not enforce these UI limits on direct Auth API calls. For a strict requirement to restrict mail to approved membership records rather than registered Auth accounts, an Auth-provider-side policy/hook is required; do not substitute an exposed email lookup. Test live delivery only with an owner-approved test inbox.
