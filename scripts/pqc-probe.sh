#!/usr/bin/env bash
# Synthetic local capability probe only. OpenSSL 3.5+ may support standardized algorithms.
# Does not prove production TLS negotiation or validate a cryptographic module.
set -euo pipefail
openssl version
openssl list -kem-algorithms | grep -i 'ML-KEM-768'
openssl list -signature-algorithms | grep -i 'ML-DSA-65'
umask 077
work=$(mktemp -d)
trap 'rm -rf -- "$work"' EXIT
printf 'synthetic portal cryptographic capability test\n' > "$work/msg"
openssl genpkey -algorithm ML-DSA-65 -out "$work/key.pem"
openssl pkey -in "$work/key.pem" -pubout -out "$work/pub.pem"
openssl pkeyutl -sign -rawin -inkey "$work/key.pem" -in "$work/msg" -out "$work/sig"
openssl pkeyutl -verify -rawin -pubin -inkey "$work/pub.pem" -in "$work/msg" -sigfile "$work/sig"
echo 'Local ML-DSA synthetic signature verified; production PQC remains unverified.'
