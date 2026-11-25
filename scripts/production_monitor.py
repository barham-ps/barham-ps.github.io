"""Read-only synthetic checks of the public portal. No accounts, cookies or visitor data."""
import datetime
import http.client
import json
import ssl
import sys
import time

HOST = "barham-ps.github.io"
PAGES = {"/": "آل برهم", "/about/": "عن البوابة", "/history/": "تاريخ العائلة",
         "/genealogy/": "شجرة العائلة", "/en/": "Barham", "/robots.txt": "Sitemap:",
         "/sitemap.xml": "<urlset"}
MAX_BYTES = 400_000

def get(path):
    context = ssl.create_default_context()
    conn = http.client.HTTPSConnection(HOST, timeout=20, context=context)
    try:
        started = time.monotonic()
        conn.connect()
        cert = conn.sock.getpeercert()
        conn.request("GET", path, headers={"User-Agent": "AlBarham-Public-Health-Monitor/1.0", "Accept": "*/*"})
        response = conn.getresponse()
        body = response.read(MAX_BYTES).decode("utf-8", errors="replace")
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
    failures, warnings, results = [], [], []
    for path, marker in PAGES.items():
        try:
            status, headers, body, elapsed, cert = get(path)
            good = status == 200 and marker in body
            results.append({"path": path, "status": status, "milliseconds": elapsed, "expected_content": good})
            if not good:
                failures.append(path + ": unexpected public response")
            if path == "/":
                for name in headers_missing(headers):
                    warnings.append("Hosting header not verified: " + name)
                if "Content-Security-Policy" not in body:
                    failures.append("Homepage CSP meta policy missing")
                expires = ssl.cert_time_to_seconds(cert["notAfter"])
                days = int((expires-time.time())/86400)
                if days < 14:
                    failures.append("TLS certificate expiry below 14 days")
                results.append({"tls_certificate_days_remaining": days})
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
