"""Verify actual anonymous HTTPS response bytes against an expected source release."""
import argparse
import hashlib
import http.client
import json
from pathlib import Path
import re
import ssl
from urllib.parse import urlsplit

if __package__:
    from .validate_public_build import ALLOWED
else:
    from validate_public_build import ALLOWED

HOST="barham-ps.github.io"
MAX_BYTES=1024*1024

def verified_tls_context():
    """Explicitly reject obsolete TLS; require hostname and certificate verification."""
    context = ssl.create_default_context()
    context.minimum_version = ssl.TLSVersion.TLSv1_2
    context.verify_mode = ssl.CERT_REQUIRED
    context.check_hostname = True
    return context


def fetch(host,path):
    """Never follow external redirects or retrieve error response bodies."""
    original = path
    for attempt in range(2):
        conn=http.client.HTTPSConnection(host,timeout=15,context=verified_tls_context())
        try:
            conn.request("GET",path,headers={"User-Agent":"AlBarham-Release-Check/1.1",
                         "Accept-Encoding":"identity","Cache-Control":"no-cache"})
            r=conn.getresponse()
            if r.status in (301, 302, 307, 308) and attempt == 0 and original.endswith(".html"):
                target=urlsplit(r.getheader("Location",""))
                # Only an exact same-origin HTML canonical alias is permitted.
                if (target.scheme not in ("", "https") or target.netloc not in ("",host)
                        or target.query or target.fragment
                        or target.path not in (original[:-5], original[:-5]+"/")):
                    raise ValueError("Unexpected release redirect")
                path=target.path
                continue
            if r.status!=200 or r.getheader("Content-Encoding","identity")!="identity":
                raise ValueError("Unexpected HTTPS asset response")
            body=r.read(MAX_BYTES+1)
            if len(body)>MAX_BYTES:
                raise ValueError("Release asset exceeds read budget")
            return body
        finally:
            conn.close()
    raise ValueError("Unresolved release redirect")


def versions(html):
    v={}
    for name in ("portal.css","portal.js"):
        matches=re.findall(rb'\b'+re.escape(name.encode())+rb'\?v=(\d+)',html)
        if len(matches)!=1:
            raise ValueError("Missing or ambiguous release reference")
        v[name]=matches[0].decode("ascii")
    if len(set(v.values()))!=1:
        raise ValueError("Unsynchronized CSS/JS release")
    return v

def verify(source,host=HOST,fetcher=fetch):
    source=Path(source)
    expected=versions((source/"index.html").read_bytes())
    observed=versions(fetcher(host,"/"))
    matched={}
    for name,v in expected.items():
        received=fetcher(host,"/"+name+"?v="+v)
        matched[name]=hashlib.sha256(received).digest()==hashlib.sha256((source/name).read_bytes()).digest()
    return {"expected_version":expected["portal.js"],"observed_version":observed["portal.js"],
            "references_match":expected==observed,"asset_bytes_match":matched,
            "release_verified":expected==observed and all(matched.values())}

# _headers is hosting configuration rather than a public response; 404 is
# provider-specific. Verify every other allowlisted public artifact by bytes.
PUBLIC_PARITY = frozenset(ALLOWED - {"_headers", "404.html"})


def published_path(name):
    if name == "index.html":
        return "/"
    if name.endswith("/index.html"):
        return "/" + name[:-len("index.html")]
    return "/" + name


def verify_full(source, host=HOST, fetcher=fetch):
    root = Path(source).resolve()
    results = {}
    for name in sorted(PUBLIC_PARITY):
        # Both hosts publish the canonical RFC 9116 text at the fallback URL.
        expected_path = root / (".well-known/security.txt" if name == "security.txt" else name)
        try:
            if (not expected_path.is_file() or expected_path.is_symlink()
                    or not expected_path.resolve().is_relative_to(root)
                    or expected_path.stat().st_size > MAX_BYTES):
                raise ValueError("Invalid expected artifact")
            expected = hashlib.sha256(expected_path.read_bytes()).digest()
            actual = hashlib.sha256(fetcher(host, published_path(name))).digest()
            results[name] = "match" if expected == actual else "mismatch"
        except Exception:
            results[name] = "unverified"
    matches = sum(value == "match" for value in results.values())
    return {"expected_count": len(PUBLIC_PARITY), "matched_count": matches,
            "files": results, "full_public_parity": matches == len(PUBLIC_PARITY),
            "excluded": ["_headers (hosting policy)", "404.html (provider-specific response)"]}


def main():
    p=argparse.ArgumentParser()
    p.add_argument("--source-dir",default=".")
    p.add_argument("--host",default=HOST)
    p.add_argument("--full",action="store_true",help="Verify all comparable public artifacts")
    a=p.parse_args()
    if not re.fullmatch(r"[A-Za-z0-9][A-Za-z0-9.-]+",a.host):
        p.error("DNS hostname required")
    result=verify(a.source_dir,a.host)
    if a.full:
        result.update(verify_full(a.source_dir,a.host))
    print(json.dumps(result,indent=2))
    return 0 if result["release_verified"] and (not a.full or result["full_public_parity"]) else 1

if __name__=="__main__":
    raise SystemExit(main())
