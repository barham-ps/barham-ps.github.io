"""Bounded benchmark of public build artifacts, on loopback only.
No network access outside the runner; not an estimate of production user capacity."""
from concurrent.futures import ThreadPoolExecutor
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
import http.client
import json
import math
from pathlib import Path
import statistics
import threading
import time

PATHS=("/", "/portal.css", "/portal.js")
LEVELS=(10,50,100)
LIMIT=1024*1024

class Handler(SimpleHTTPRequestHandler):
    def log_message(self,*args):
        pass

class Server(ThreadingHTTPServer):
    request_queue_size=128
    daemon_threads=True

def percentile(samples,p):
    ordered=sorted(samples)
    return ordered[max(0,math.ceil(len(ordered)*p)-1)]

def user(port):
    records=[]
    for path in PATHS:
        t=time.monotonic()
        conn=http.client.HTTPConnection("127.0.0.1",port,timeout=8)
        try:
            conn.request("GET",path)
            r=conn.getresponse()
            body=r.read(LIMIT+1)
            ok=r.status==200 and 0<len(body)<=LIMIT
        except (OSError,http.client.HTTPException):
            ok=False
        finally:
            conn.close()
        records.append((ok,(time.monotonic()-t)*1000))
    return records

def main():
    directory=Path("dist")
    if not all((directory/name).is_file() for name in ("index.html","portal.css","portal.js")):
        raise SystemExit("Build first")
    with Server(("127.0.0.1",0),partial(Handler,directory=str(directory))) as server:
        t=threading.Thread(target=server.serve_forever,daemon=True)
        t.start()
        try:
            for n in LEVELS:
                start=time.monotonic()
                with ThreadPoolExecutor(max_workers=n) as pool:
                    records=[r for session in pool.map(user,[server.server_port]*n) for r in session]
                elapsed=max(time.monotonic()-start,0.001)
                times=[ms for _,ms in records]
                errors=sum(not ok for ok,_ in records)
                print(json.dumps({"scope":"loopback_static_only","concurrent_workers":n,"requests":len(records),
                                  "errors":errors,"mean_ms":round(statistics.mean(times),2),
                                  "p95_ms":round(percentile(times,.95),2),"p99_ms":round(percentile(times,.99),2),
                                  "requests_per_second":round(len(records)/elapsed,2)}),flush=True)
                if errors:
                    return 1
        finally:
            server.shutdown()
            t.join(timeout=5)
    return 0

if __name__=="__main__":
    raise SystemExit(main())
