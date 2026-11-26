#!/usr/bin/env bash
set -euo pipefail
umask 077
script=scripts/backup-encrypt.sh
work=$(mktemp -d)
trap 'rm -rf -- "$work"' EXIT
export GNUPGHOME="$work/gnupg"
mkdir -m 700 "$GNUPGHOME"
gpg --batch --pinentry-mode loopback --passphrase '' --quick-generate-key 'Synthetic backup test <test@example.invalid>' rsa2048 encr 1d >/dev/null 2>&1
fingerprint=$(gpg --batch --with-colons --list-keys | awk -F: '$1=="fpr" {print $10;exit}')
printf 'synthetic test data only\n' >"$work/input"
bash "$script" "$work/input" "$work/backup.gpg" "$fingerprint"
gpg --batch --decrypt "$work/backup.gpg" | cmp - "$work/input"
if bash "$script" "$work/input" "$work/backup.gpg" "$fingerprint"; then
	echo 'Existing archive was overwritten' >&2
	exit 1
fi
echo 'Synthetic encryption/decryption and overwrite protection passed.'
