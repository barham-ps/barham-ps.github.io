#!/bin/sh
set -eu
mkdir -p dist
# Fail before publication if a previous build left unexpected files.
python3 scripts/validate_public_build.py --allow-incomplete dist
cp index.html portal.js runtime.js footer.js portal.css icon.svg favicon.png barham-emblem.webp manifest.webmanifest sw.js security-config.js captcha.js _headers dist/
cp robots.txt sitemap.xml public.css 404.html dist/
for page in about history membership en en/history en/membership; do
  mkdir -p "dist/$page"
  cp "$page/index.html" "dist/$page/"
done

# Publish the genealogy viewer and its static assets.
mkdir -p dist/genealogy
cp genealogy/index.html genealogy/tree.css genealogy/tree.js genealogy/explorer.js genealogy/gaza.json dist/genealogy/

# Publish the memorial section and the legacy URL retirement notice.
mkdir -p dist/martyrs
cp martyrs/index.html martyrs/memorial.css martyrs/memorial.js martyrs/admin.js martyrs/Barham_Martyrs_Register.html dist/martyrs/

# Public security transparency page (no private audit details).
mkdir -p dist/trust
cp trust/index.html dist/trust/

mkdir -p dist/.well-known
cp .well-known/security.txt dist/.well-known/

# RFC 9116 legacy discovery fallback, in addition to the canonical location.
cp .well-known/security.txt dist/security.txt

python3 scripts/validate_public_build.py dist
