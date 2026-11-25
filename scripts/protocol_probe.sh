#!/usr/bin/env bash
# Anonymous and bounded; no credentials, no redirect following.
set -euo pipefail
umask 077
url=https://barham-ps.github.io/portal.css
work=$(mktemp -d)
trap 'rm -rf -- "$work"' EXIT
curl --fail --silent --show-error --max-time 20 --max-filesize 1048576 -H 'Accept-Encoding: identity' -D "$work/identity.headers" -o "$work/identity" "$url"
if curl -V | grep -qi 'brotli'; then
  curl --fail --silent --show-error --max-time 20 --max-filesize 1048576 --compressed -H 'Accept-Encoding: br' -D "$work/br.headers" -o "$work/br" "$url"
  if grep -Eiq '^content-encoding:[[:space:]]*br[[:space:]]*$' "$work/br.headers"; then cmp "$work/br" "$work/identity"; echo 'brotli_body_verified=true'; else echo 'brotli_body_verified=false (server did not advertise br)'; fi
else echo 'brotli_body_verified=unavailable (curl lacks decoder)'; fi
if grep -Eiq '^alt-svc:.*h3' "$work/identity.headers"; then echo 'http3_advertised=true'; else echo 'http3_advertised=false'; fi
if curl -V | grep -q 'HTTP3'; then
  if result=$(curl --http3-only --fail --silent --show-error --max-time 15 --max-filesize 1048576 -o /dev/null -w '%{http_version}' "$url"); then echo "http3_negotiated_version=$result"; else echo 'http3_negotiated_version=unverified'; fi
else echo 'http3_negotiated_version=unavailable (runner curl lacks HTTP3)'; fi
