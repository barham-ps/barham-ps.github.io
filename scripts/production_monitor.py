"""Read-only synthetic checks of the public portal. No accounts, cookies or visitor data."""
import argparse
import datetime
import re
import http.client
import json
import ssl
import sys
import time

HOST = "barham-ps.github.io"
PAGES = {"/": "آل برهم", "/trust/": "مركز الثقة والأمان الرقمي",
         "/.well-known/security.txt": "Contact: mailto:", "/security.txt": "Contact: mailto:", "/about/": "عن البوابة", "/history/": "تاريخ العائلة",
         "/genealogy/": "شجرة العائلة", "/martyrs/": "شهداء آل برهم", "/en/": "Barham", "/robots.txt": "Sitemap:",
         "/sitemap.xml": "<urlset", "/membership/": "العضوية الإلكترونية",
         "/en/history/": "Barham", "/en/membership/": "Barham",
         "/martyrs/Barham_Martyrs_Register.html": 'name="robots" content="noindex, follow"'}
MAX_BYTES = 400_000

def verified_tls_context():
    """Explicitly reject obsolete TLS; require hostname and certificate verification."""
    context = ssl.create_default_context()
    context.minimum_version = ssl.TLSVersion.TLSv1_2
    context.verify_mode = ssl.CERT_REQUIRED
    context.check_hostname = True
    return context


def get(path, host=HOST, *, read_body=True):
    context = verified_tls_context()
    conn = http.client.HTTPSConnection(host, timeout=20, context=context)
    try:
        started = time.monotonic()
        conn.connect()
        cert = conn.sock.getpeercert()
        cert["tls_protocol"] = conn.sock.version()
        conn.request("GET", path, headers={"User-Agent": "AlBarham-Public-Health-Monitor/1.0", "Accept": "*/*"})
        response = conn.getresponse()
        raw = response.read(MAX_BYTES + 1) if read_body else b""
        if len(raw) > MAX_BYTES:
            raise ValueError("Public response exceeds read budget")
        body = raw.decode("utf-8", errors="replace")
        return response.status, {k.lower(): v for k, v in response.getheaders()}, body, round((time.monotonic()-started)*1000), cert
    finally:
        conn.close()

def headers_missing(headers):
    csp = headers.get("content-security-policy", "").lower()
    frame = headers.get("x-frame-options", "").lower()
    return [label for label, good in [
        ("HTTP CSP", bool(csp)),
        ("frame protection", frame == "deny" or "frame-ancestors 'none'" in csp),
        ("HSTS", bool(headers.get("strict-transport-security"))),
        ("nosniff", headers.get("x-content-type-options", "").lower() == "nosniff"),
        ("Referrer-Policy", headers.get("referrer-policy", "").lower() == "no-referrer"),
        ("Permissions-Policy", bool(headers.get("permissions-policy")))
    ] if not good]

def main():
    parser = argparse.ArgumentParser(description='Public portal health check; only check hosts you manage.')
    parser.add_argument('--host', default=HOST, help='Published portal hostname, no scheme or path')
    parser.add_argument('--strict-headers', action='store_true', help='Require all expected security headers on a staging or edge host')
    args = parser.parse_args()
    if not re.fullmatch(r'[A-Za-z0-9](?:[A-Za-z0-9.-]*[A-Za-z0-9])?', args.host) or '.' not in args.host:
        parser.error('Supply a DNS hostname only')
    failures, warnings, results = [], [], []
    for path, marker in PAGES.items():
        try:
            status, headers, body, elapsed, cert = get(path, args.host)
            good = status == 200 and marker in body
            results.append({"path": path, "status": status, "milliseconds": elapsed, "expected_content": good})
            if not good:
                failures.append(path + ": unexpected public response")
            if path == "/":
                for name in headers_missing(headers):
                    (failures if args.strict_headers else warnings).append("Hosting header not verified: " + name)
                if "Content-Security-Policy" not in body:
                    failures.append("Homepage CSP meta policy missing")
                expires = ssl.cert_time_to_seconds(cert["notAfter"])
                days = int((expires-time.time())/86400)
                if cert.get("tls_protocol") not in ("TLSv1.2", "TLSv1.3"):
                    failures.append("Unexpected negotiated TLS protocol")
                if days < 14:
                    failures.append("TLS certificate expiry below 14 days")
                results.append({"tls_certificate_days_remaining": days,
                                "tls_protocol": cert.get("tls_protocol"),
                                "certificate_expires": cert["notAfter"],
                                "certificate_issuer": dict(pair for group in cert.get("issuer", ()) for pair in group)})
        except Exception as exc:
            failures.append(path + ": " + type(exc).__name__)
    for path in ["/database/verify_access.sql", "/scripts/production_monitor.py", "/tests/security.test.cjs", "/supabase/functions/scan-request-attachment/index.ts", "/isms/README.md"]:
        try:
            status, _, _, elapsed, _ = get(path, args.host, read_body=False)
            results.append({"path": path, "status": status, "milliseconds": elapsed, "excluded": status == 404})
            if status != 404:
                failures.append(path + ": development asset must not be published")
        except Exception as exc:
            failures.append(path + ": " + type(exc).__name__)
    print(json.dumps({"checked_at": datetime.datetime.now(datetime.timezone.utc).isoformat(),
                      "checks": results, "warnings": warnings, "failures": failures}, ensure_ascii=False, indent=2))
    for message in warnings:
        print("::warning::" + message)
    for message in failures:
        print("::error::" + message)
    return 1 if failures else 0

if __name__ == "__main__":
    sys.exit(main())
