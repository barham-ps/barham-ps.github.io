"""Bounded, anonymous HTTP probes. No auth, cookies or stored responses."""
import argparse
import gzip
import http.client
import json
import re
import sys
import time

ASSET = "/portal.css"
MAX_WIRE = 1024 * 1024
MAX_DECODED = 2 * 1024 * 1024

def request(host, encoding, etag=None):
    headers = {"Accept-Encoding": encoding, "User-Agent": "AlBarham-Edge-Probe/1.0"}
    if etag:
        headers["If-None-Match"] = etag
    start = time.monotonic()
    conn = http.client.HTTPSConnection(host, timeout=15)
    try:
        conn.request("GET", ASSET, headers=headers)
        res = conn.getresponse()
        body = res.read(MAX_WIRE + 1)
        if len(body) > MAX_WIRE:
            raise ValueError("Response exceeds probe budget")
        return res.status, dict((k.lower(), v) for k, v in res.getheaders()), body, round((time.monotonic()-start)*1000)
    finally:
        conn.close()

def evaluate(identity, compressed, brotli, conditional):
    status, h, raw, _ = identity
    gs, gh, gb, _ = compressed
    bs, bh, _, _ = brotli
    cs = conditional[0] if conditional else None
    if status != 200 or not raw or "text/css" not in h.get("content-type","") or h.get("content-encoding","identity") != "identity":
        raise ValueError("Invalid identity CSS response")
    if gs != 200 or bs != 200:
        raise ValueError("Compression probe returned unexpected status")
    gzip_ok = False
    if gh.get("content-encoding","") == "gzip":
        import io
        with gzip.GzipFile(fileobj=io.BytesIO(gb)) as f:
            decoded = f.read(MAX_DECODED + 1)
        gzip_ok = decoded == raw and len(decoded) <= MAX_DECODED
        if not gzip_ok:
            raise ValueError("Gzip body differs from identity")
    return {"gzip_verified": gzip_ok, "brotli_advertised": bh.get("content-encoding") == "br",
            "etag_present": bool(h.get("etag")), "conditional_304": cs == 304,
            "cloudflare_edge_evidence": bool(h.get("cf-ray")),
            "cache_control": h.get("cache-control"), "cf_cache_status": h.get("cf-cache-status"),
            "identity_bytes": len(raw), "gzip_wire_bytes": len(gb) if gzip_ok else None}

def main():
    p=argparse.ArgumentParser()
    p.add_argument("--host", required=True)
    p.add_argument("--require-cloudflare", action="store_true")
    a=p.parse_args()
    if not re.fullmatch(r"[A-Za-z0-9][A-Za-z0-9.-]+",a.host):
        p.error("DNS hostname required")
    identity=request(a.host,"identity")
    compressed=request(a.host,"gzip")
    brotli=request(a.host,"br")
    etag=identity[1].get("etag")
    result=evaluate(identity,compressed,brotli,request(a.host,"identity",etag) if etag else None)
    print(json.dumps(result,indent=2))
    if a.require_cloudflare and not (result["cloudflare_edge_evidence"] and result["gzip_verified"] and result["brotli_advertised"]):
        return 1
    return 0

if __name__ == "__main__":
    sys.exit(main())
