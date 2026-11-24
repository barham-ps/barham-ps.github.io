# Professional upgrade — review before merge

- Public SEO pages and sitemap, mobile typography, keyboard focus, PWA shortcuts and offline message.
- No production database changes, provider activation or deployment authorized by this branch.
- Run node --test tests/*.test.cjs and sh scripts/build-pages.sh. Verify mobile 320/360/390px, desktop, keyboard, login, signup, recovery, MFA, member permissions and certificate QR links on a non-production environment.
- CAPTCHA, WAF, backups and server-side password policy require provider configuration and verification. Do not enable only one side of CAPTCHA.
- Remaining: split portal.js after regression coverage; approved historical content; actual social preview artwork; PNG icons; Lighthouse and browser testing. Do not publish member data or cache authenticated responses.
- Merge only after owner approval and successful acceptance checks.
