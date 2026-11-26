"""Small controlled baseline for an owner-approved Cloudflare Pages staging host.
Never targets production, authentication, APIs, or private records."""
import argparse
import concurrent.futures
import http.client
import ssl
import json
import math
import re
import time

def verified_tls_context():
    """Explicitly reject obsolete TLS; require hostname and certificate verification."""
    context = ssl.create_default_context()
    context.minimum_version = ssl.TLSVersion.TLSv1_2
    context.verify_mode = ssl.CERT_REQUIRED
    context.check_hostname = True
    return context


def check_host(host):
    if not re.fullmatch(r"[a-z0-9-]+\.[a-z0-9-]+\.pages\.dev", host):
        raise ValueError("Use an explicit Cloudflare Pages preview hostname (not production)")

def sample(host):
    conn=http.client.HTTPSConnection(host, timeout=10, context=verified_tls_context())
    start=time.monotonic()
    try:
        conn.request("GET","/portal.css",headers={"User-Agent":"AlBarham-Staging-Baseline/1.0","Accept-Encoding":"gzip"})
        res=conn.getresponse()
        body=res.read(1024*1024+1)
        ok=res.status==200 and 0<len(body)<=1024*1024 and "text/css" in res.getheader("Content-Type","")
        return ok, (time.monotonic()-start)*1000
    except (OSError,http.client.HTTPException):
        return False,(time.monotonic()-start)*1000
    finally:
        conn.close()

def main():
    p=argparse.ArgumentParser()
    p.add_argument("--host", required=True)
    p.add_argument("--owner-approved", action="store_true", required=True)
    p.add_argument("--requests", type=int, choices=range(1,101), default=30)
    p.add_argument("--workers", type=int, choices=range(1,6), default=3)
    a=p.parse_args()
    check_host(a.host)
    results=[]
    with concurrent.futures.ThreadPoolExecutor(max_workers=a.workers) as pool:
        for offset in range(0,a.requests,a.workers):
            batch=min(a.workers,a.requests-offset)
            group=list(pool.map(sample,[a.host]*batch))
            results.extend(group)
            if not all(ok for ok,_ in group):
                break
            time.sleep(1)
    times=sorted(ms for _,ms in results)
    p95=times[math.ceil(.95*len(times))-1]
    errors=sum(not ok for ok,_ in results)
    print(json.dumps({"requests":len(results),"errors":errors,"p95_ms":round(p95),"workers":a.workers}))
    return int(errors>0 or p95>2000)

if __name__=="__main__":
    raise SystemExit(main())
