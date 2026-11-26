#!/usr/bin/env python3
"""Bounded production canaries for the owned portal. No account credentials, records or response bodies are logged."""
import argparse
import hashlib
import http.client
import json
import re
import ssl
import sys
from pathlib import Path

EDGE = "barham-ps-github-io.m0had-b0rh0m.workers.dev"
API = "vfxxghfmkmgdqrczeowx.supabase.co"
MAX_BODY = 512 * 1024
JSON_LIMIT = 4096
PROTECTED_RPC = ("family_security_summary", "family_security_scan_history", "family_is_admin")
HEADERS = {"User-Agent": "PortalSecurityMonitor/1.0", "Accept-Encoding": "identity", "Cache-Control": "no-cache"}

def request(host, path, method="GET", key=None, payload=None, limit=0, read_status=()):
    if host not in (EDGE, API):
        raise ValueError("Unapproved host")
    headers = dict(HEADERS)
    if key is not None:
        if host != API or not re.fullmatch(r"sb_publishable_[A-Za-z0-9_-]+", key):
            raise ValueError("Expected public API key only")
        headers["apikey"] = key
    body = None
    if payload is not None:
        body = json.dumps(payload, separators=(",", ":")).encode()
        headers["Content-Type"] = "application/json"
    conn = http.client.HTTPSConnection(host, timeout=18, context=ssl.create_default_context())
    try:
        conn.request(method, path, body=body, headers=headers)
        response = conn.getresponse()
        data = response.read(limit + 1) if limit and response.status in read_status else b""
        if len(data) > limit:
            raise ValueError("Response exceeds probe budget")
        return response.status, {k.lower(): v for k, v in response.getheaders()}, data
    finally:
        conn.close()

def public_key(source):
    keys = re.findall(r"createClient\(\s*['\"]https://"+re.escape(API)+r"['\"]\s*,\s*['\"](sb_publishable_[A-Za-z0-9_-]+)['\"]", source)
    if len(keys) != 1:
        raise ValueError("Expected exactly one publishable key for owned project")
    return keys[0]

def header_checks(status, h):
    csp = h.get("content-security-policy", "")
    pp = h.get("permissions-policy", "")
    age = re.search(r"(?:^|;)\s*max-age\s*=\s*(\d+)", h.get("strict-transport-security", ""), re.I)
    return (status == 200
            and "object-src 'none'" in csp
            and "frame-ancestors 'none'" in csp
            and h.get("x-frame-options", "").lower() == "deny"
            and h.get("x-content-type-options", "").lower() == "nosniff"
            and h.get("referrer-policy", "").lower() == "no-referrer"
            and bool(age and int(age.group(1)) >= 31536000)
            and all(re.search(r"(?:^|,)\s*"+k+r"\s*=\s*\(\s*\)(?:\s*,|\s*$)", pp) for k in ("camera", "microphone", "geolocation"))
            and "no-store" in h.get("cache-control", "").lower())

def json_code(body):
    try:
        parsed = json.loads(body)
        return (parsed.get("error_code") or parsed.get("code")) if isinstance(parsed, dict) else None
    except (ValueError, UnicodeError):
        return None

def denied(status, body):
    return status in (401, 403) and json_code(body) == "42501"

def captcha_blocked(status, body):
    return status in (400, 401, 403, 422) and json_code(body) == "captcha_failed"

def edge_headers():
    status, h, _ = request(EDGE, "/")
    return header_checks(status, h)

def edge_sensitive_paths():
    # Do not read protected response bodies, even if a misconfiguration exposes them.
    return all(request(EDGE, path)[0] in (403, 404, 410)
               for path in ("/.env", "/.git/config", "/database/security_observability.sql", "/scripts/backup-encrypt.sh"))

def edge_release():
    status, h, body = request(EDGE, "/security-config.js", limit=MAX_BODY, read_status=(200,))
    expected = Path("security-config.js").read_bytes()
    return status == 200 and "no-store" in h.get("cache-control", "").lower() and hashlib.sha256(body).digest() == hashlib.sha256(expected).digest()

def api_canary(key):
    # Reserved all-zero UUID only; no real certificate or member identifiers.
    status, _, body = request(API, "/rest/v1/rpc/family_verify_certificate", "POST", key,
                             {"p_token":"00000000-0000-0000-0000-000000000000"}, JSON_LIMIT, (200,))
    return status == 200 and json.loads(body) == []

def api_denial(key, rpc):
    status, _, body = request(API, "/rest/v1/rpc/"+rpc, "POST", key, {}, JSON_LIMIT, (401, 403))
    return denied(status, body)

def auth_captcha(key):
    # One intentionally invalid password sign-in, without CAPTCHA, no real user or email sent.
    status, _, body = request(API, "/auth/v1/token?grant_type=password", "POST", key,
                              {"email":"aegis-security-canary@example.invalid","password":"synthetic-invalid-password-only"},
                              JSON_LIMIT, (400,401,403,422))
    return captcha_blocked(status, body)

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--skip-release", action="store_true", help="Scheduled checks can omit commit-dependent parity.")
    args = parser.parse_args()
    key = public_key(Path("portal.js").read_text())
    checks = [("Cloudflare HTTP policy", edge_headers), ("Cloudflare excluded paths", edge_sensitive_paths)]
    if not args.skip_release:
        checks.append(("Cloudflare public configuration parity", edge_release))
    checks.append(("Supabase public gateway canary", lambda: api_canary(key)))
    checks += [("Supabase anonymous denial: "+rpc, lambda rpc=rpc: api_denial(key,rpc)) for rpc in PROTECTED_RPC]
    checks.append(("Supabase server CAPTCHA rejects missing challenge", lambda: auth_captcha(key)))
    failed = 0
    for name, check in checks:
        try:
            ok = bool(check())
        except Exception:
            ok = False
        failed += not ok
        print(f"{'PASS' if ok else 'FAIL'} | {name}", flush=True)
    print(f"{len(checks)-failed}/{len(checks)} live canaries passed; no data or secrets logged.")
    return 1 if failed else 0

if __name__ == "__main__":
    sys.exit(main())
