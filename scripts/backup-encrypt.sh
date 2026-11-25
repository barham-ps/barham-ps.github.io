#!/usr/bin/env bash
# Run only on an owner-controlled workstation. Never in public CI with real data.
set -euo pipefail
umask 077
if [[ $# -ne 3 ]]; then
  echo 'Usage: backup-encrypt.sh INPUT_FILE OUTPUT.gpg RECIPIENT_FINGERPRINT' >&2
  exit 2
fi
input=$1 output=$2 recipient=$3
[[ -f "$input" && ! -e "$output" && ! -L "$output" && "$output" == *.gpg ]] || { echo 'Input must be a file; output must be a new .gpg file.' >&2; exit 2; }
[[ "$recipient" =~ ^[0-9A-Fa-f]{40}$ ]] || { echo 'Use the verified full OpenPGP fingerprint (40 hex characters).' >&2; exit 2; }
command -v gpg >/dev/null
work=$(mktemp -d -- "$(dirname -- "$output")/.backup-encrypt.XXXXXXXX")
trap 'rm -rf -- "$work"' EXIT
# GPG trust policy is not bypassed. Verify the recipient key independently.
gpg --output "$work/archive.gpg" --encrypt --recipient "$recipient" -- "$input"
[[ -s "$work/archive.gpg" ]]
ln -- "$work/archive.gpg" "$output"
sha256sum -- "$output"
printf '%s\n' 'Encrypted copy created. Verify decryption with the recovery key on a trusted workstation before relying on it.'
