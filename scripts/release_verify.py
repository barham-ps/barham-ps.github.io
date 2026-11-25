"""Verify actual anonymous HTTPS response bytes against an expected source release."""
import argparse
import hashlib
import http.client
import json
from pathlib import Path
import re
import ssl

HOST="barham-ps.github.io"
MAX_BYTES=1024*1024

def fetch(host,path):
    conn=http.client.HTTPSConnection(host,timeout=15,context=ssl.create_default_context())
    try:
        conn.request("GET",path,headers={"User-Agent":"AlBarham-Release-Check/1.0",
                     "Accept-Encoding":"identity","Cache-Control":"no-cache"})
        r=conn.getresponse()
        body=r.read(MAX_BYTES+1)
        if r.status!=200 or len(body)>MAX_BYTES or r.getheader("Content-Encoding","identity")!="identity":
            raise ValueError("Unexpected HTTPS asset response")
        return body
    finally:
        conn.close()

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

def main():
    p=argparse.ArgumentParser()
    p.add_argument("--source-dir",default=".")
    p.add_argument("--host",default=HOST)
    a=p.parse_args()
    if not re.fullmatch(r"[A-Za-z0-9][A-Za-z0-9.-]+",a.host):
        p.error("DNS hostname required")
    result=verify(a.source_dir,a.host)
    print(json.dumps(result,indent=2))
    return 0 if result["release_verified"] else 1

if __name__=="__main__":
    raise SystemExit(main())
