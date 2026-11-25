#!/bin/sh
set -eu
mkdir -p dist
cp index.html portal.js portal.css icon.svg favicon.png barham-emblem.webp manifest.webmanifest sw.js security-config.js captcha.js _headers dist/
cp robots.txt sitemap.xml public.css 404.html dist/
for page in about history membership en en/history en/membership; do
  mkdir -p "dist/$page"
  cp "$page/index.html" "dist/$page/"
done

# Publish the genealogy viewer and its static assets.
mkdir -p dist/genealogy
cp genealogy/index.html genealogy/tree.css genealogy/tree.js genealogy/explorer.js genealogy/gaza.json dist/genealogy/

# Publish the memorial section and its downloadable register.
mkdir -p dist/martyrs
cp martyrs/index.html martyrs/memorial.css martyrs/memorial.js martyrs/Barham_Martyrs_Register.html dist/martyrs/
