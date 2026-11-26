"""Offline publication contract: no network access, user records, or credentials."""
from html.parser import HTMLParser
from pathlib import Path
from collections import Counter
from urllib.parse import urlsplit
import re
import sys

PAGES = ("index.html", "about/index.html", "history/index.html", "membership/index.html",
         "en/index.html", "en/history/index.html", "en/membership/index.html",
         "genealogy/index.html", "martyrs/index.html", "trust/index.html",
         "404.html", "martyrs/Barham_Martyrs_Register.html")

class Page(HTMLParser):
    def __init__(self, content):
        super().__init__(convert_charrefs=True)
        self.tags = []
        self.feed(content)
        self.close()

    def handle_starttag(self, tag, attrs):
        self.tags.append((tag, dict(attrs)))

    def select(self, tag):
        return [a for t, a in self.tags if t == tag]

def checks(page):
    tags = page.tags
    html = page.select("html")
    metas = page.select("meta")
    ids = Counter(a["id"] for _, a in tags if "id" in a)
    policy = [a.get("content", "") for a in metas
              if a.get("http-equiv", "").lower() == "content-security-policy"]
    directives = {}
    if len(policy) == 1:
        for raw in policy[0].split(";"):
            parts = raw.strip().split()
            if parts:
                directives[parts[0]] = parts[1:]
    scripts = directives.get("script-src", directives.get("default-src", []))
    def safe_asset(a):
        value = a.get("src", "")
        if not value:
            return False
        if not urlsplit(value).netloc:
            return not urlsplit(value).scheme
        return (urlsplit(value).scheme == "https"
                and re.fullmatch(r"sha(?:256|384|512)-[A-Za-z0-9+/=]+", a.get("integrity", "")) is not None
                and a.get("crossorigin") == "anonymous")
    def safe_url(value):
        if not value:
            return True
        v = re.sub(r"[\x00-\x20]", "", value).lower()
        return not v.startswith(("javascript:", "vbscript:", "http:", "//"))
    return {
        "language-direction": len(html) == 1 and (html[0].get("lang"), html[0].get("dir")) in (("ar","rtl"),("en","ltr")),
        "utf8-declaration": sum(a.get("charset","").lower() in ("utf-8","utf8") for a in metas) == 1,
        "viewport-no-zoom-lock": any(a.get("name")=="viewport" and "width=device-width" in a.get("content","") and not re.search(r"user-scalable\s*=\s*(?:no|0)|maximum-scale\s*=\s*1(?:\.0)?(?:,|$)",a.get("content",""),re.I) for a in metas),
        "unique-element-ids": all(v == 1 for v in ids.values()),
        "accessible-image-alternatives": all("alt" in a for a in page.select("img")),
        "aria-reference-integrity": all(ref in ids for _, a in tags for k in ("aria-controls","aria-labelledby","aria-describedby") for ref in a.get(k,"").split()),
        "referrer-minimization": [a.get("content") for a in metas if a.get("name")=="referrer"] == ["no-referrer"],
        "script-and-handler-lock": bool(scripts) and "'unsafe-inline'" not in scripts and "'unsafe-eval'" not in scripts and "*" not in scripts and all(not k.startswith("on") for _, a in tags for k in a) and all(safe_asset(a) for a in page.select("script")),
        "safe-navigation": all(safe_url(a.get(k,"")) for t,a in tags if t in ("a","area","link","script","img","iframe","form") for k in ("href","src","action")) and all("noopener" in a.get("rel","").split() or "noreferrer" in a.get("rel","").split() for t,a in tags if t in ("a","area") and a.get("target","").lower()=="_blank"),
        "credential-form-fail-closed": all(a.get("method","").lower()=="post" and not a.get("action") for a in page.select("form")) and all(not a.get("value") and a.get("autocomplete") in ("new-password","current-password") for a in page.select("input") if a.get("type")=="password"),
    }

def main(root):
    failures = []
    count = 0
    for filename in PAGES:
        try:
            result = checks(Page((root / filename).read_text(encoding="utf-8")))
        except (OSError, UnicodeError, ValueError):
            print("FAIL: unable to parse required public page")
            return 1
        for name, passed in result.items():
            count += 1
            if not passed:
                failures.append((filename, name))
    for filename, name in failures:
        print("FAIL:", filename, name)
    print(f"{count-len(failures)}/{count} page-level publication checks passed")
    return int(bool(failures))

if __name__ == "__main__":
    sys.exit(main(Path(sys.argv[1] if len(sys.argv)>1 else ".")))
