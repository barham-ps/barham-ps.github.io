#!/usr/bin/env bash
# Owner workstation only. AWS S3, preconfigured versioned Object Lock bucket, explicit owner.
# Never execute on production exports in public CI. Pass an already encrypted GPG archive.
set -euo pipefail
umask 077
export AWS_PAGER=""
if [[ $# -ne 5 ]]; then echo 'Usage: backup-object-lock.sh ARCHIVE.gpg BUCKET EXPECTED_OWNER KEY RETAIN_UNTIL_UTC' >&2; exit 2; fi
file=$1 bucket=$2 owner=$3 key=$4 until=$5
[[ -f "$file" && ! -L "$file" && "$file" == *.gpg && "$owner" =~ ^[0-9]{12}$ && "$key" =~ ^[A-Za-z0-9/_-]+\.gpg$ && "$until" =~ ^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}Z$ ]] || exit 2
[[ $(date -u -d "$until" +%s) -gt $(date -u +%s) ]] || exit 2
[[ $(stat -c%s -- "$file") -gt 0 && $(stat -c%s -- "$file") -le 5368709120 ]] || exit 2
command -v aws >/dev/null; command -v gpg >/dev/null
# A suffix is not evidence of encryption: require an encrypted-data packet and no literal data packet.
packets=$(gpg --batch --no-tty --list-only --list-packets -- "$file" 2>/dev/null) || exit 2
grep -Eq ':encrypted data packet:|:aead encrypted packet:' <<<"$packets" || exit 2
if grep -q ':literal data packet:' <<<"$packets"; then exit 2; fi
[[ $(aws s3api get-object-lock-configuration --bucket "$bucket" --expected-bucket-owner "$owner" --query 'ObjectLockConfiguration.ObjectLockEnabled' --output text) == Enabled ]] || exit 1
checksum=$(openssl dgst -sha256 -binary "$file" | openssl base64 -A)
version=$(aws s3api put-object --bucket "$bucket" --expected-bucket-owner "$owner" --key "$key" --body "$file" --if-none-match '*' --server-side-encryption AES256 --checksum-algorithm SHA256 --checksum-sha256 "$checksum" --object-lock-mode COMPLIANCE --object-lock-retain-until-date "$until" --query VersionId --output text)
[[ -n "$version" && "$version" != None && "$version" != null ]] || exit 1
[[ $(aws s3api head-object --bucket "$bucket" --expected-bucket-owner "$owner" --key "$key" --version-id "$version" --checksum-mode ENABLED --query ChecksumSHA256 --output text) == "$checksum" ]] || exit 1
retention=$(aws s3api get-object-retention --bucket "$bucket" --expected-bucket-owner "$owner" --key "$key" --version-id "$version" --output json)
python3 -c 'import json,sys,datetime; r=json.loads(sys.argv[1])["Retention"]; parse=lambda s:datetime.datetime.fromisoformat(s.replace("Z","+00:00")); assert r["Mode"]=="COMPLIANCE" and parse(r["RetainUntilDate"])>=parse(sys.argv[2])' "$retention" "$until"
printf '%s\n' 'Object checksum and COMPLIANCE retention verified. Record version and restore evidence privately.'
