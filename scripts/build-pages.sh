#!/bin/sh
set -eu
mkdir -p dist
cp index.html portal.js portal.css icon.svg manifest.webmanifest sw.js security-config.js captcha.js _headers dist/
cp robots.txt sitemap.xml public.css dist/
for page in about history membership; do
  mkdir -p "dist/$page"
  cp "$page/index.html" "dist/$page/"
done
