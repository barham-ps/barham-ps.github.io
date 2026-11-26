"""Exact allowlist for published files; refuses stale output and symlinks."""
import argparse
from pathlib import Path

ALLOWED = frozenset("""
index.html portal.js runtime.js footer.js portal.css icon.svg favicon.png barham-emblem.webp
manifest.webmanifest sw.js security-config.js captcha.js _headers robots.txt sitemap.xml
public.css 404.html route-entry.js news/index.html verify/index.html about/index.html history/index.html membership/index.html
en/index.html en/history/index.html en/membership/index.html
genealogy/index.html genealogy/tree.css genealogy/tree.js genealogy/explorer.js genealogy/gaza.json
martyrs/index.html martyrs/memorial.css martyrs/memorial.js martyrs/admin.js
martyrs/Barham_Martyrs_Register.html trust/index.html .well-known/security.txt security.txt
fonts/royal.css
fonts/amiri-400-arabic.woff2 fonts/amiri-400-latin.woff2 fonts/amiri-700-arabic.woff2 fonts/amiri-700-latin.woff2 fonts/plex-arabic-400-arabic.woff2 fonts/plex-arabic-400-latin.woff2 fonts/plex-arabic-600-arabic.woff2 fonts/plex-arabic-600-latin.woff2 fonts/plex-arabic-700-arabic.woff2 fonts/plex-arabic-700-latin.woff2
fonts/amiri-OFL.txt fonts/plex-OFL.txt
""".split())

def validate(root, allow_incomplete=False):
    root=Path(root)
    if not root.is_dir() or root.is_symlink():
        raise ValueError("Expected a real build directory")
    present=set()
    for path in root.rglob("*"):
        if path.is_symlink():
            raise ValueError("Unexpected symlink in public output")
        if path.is_dir():
            continue
        name=path.relative_to(root).as_posix()
        if not path.is_file() or name not in ALLOWED:
            raise ValueError("Unexpected public output; clean generated build directory privately")
        present.add(name)
    if not allow_incomplete and present != ALLOWED:
        raise ValueError("Required public files missing")
    return len(present)

if __name__=="__main__":
    p=argparse.ArgumentParser()
    p.add_argument("root")
    p.add_argument("--allow-incomplete",action="store_true")
    a=p.parse_args()
    print("Validated public file count:",validate(a.root,a.allow_incomplete))
