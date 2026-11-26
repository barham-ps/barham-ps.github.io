"""Read-only quality diagnostics. No production traffic, secrets, or raw report publication."""
import argparse
import json
import os
import shutil
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
PACKAGES = {
    "ShellCheck": "shellcheck", "shfmt": "shfmt", "yamllint": "yamllint",
    "HTML Tidy": "tidy", "libxml2": "libxml2-utils", "Bandit": "python3-bandit",
    "Pyflakes": "pyflakes3", "Vulture": "vulture", "codespell": "codespell",
    "SQLFluff": "sqlfluff", "Markdownlint": "markdownlint",
    "JSON Schema": "python3-jsonschema", "tinycss2": "python3-tinycss2",
}


def tracked(pattern):
    """Only Git-tracked regular files, no generated or symlinked input."""
    raw = subprocess.check_output(["git", "ls-files", "-z", "--", pattern], cwd=ROOT)
    names = [os.fsdecode(n) for n in raw.split(b"\0") if n]
    return [n for n in names if (ROOT / n).is_file() and not (ROOT / n).is_symlink()
            and (ROOT / n).resolve().is_relative_to(ROOT)]


def commands():
    shell = tracked("*.sh")
    html = tracked("*.html")
    python = [p for p in tracked("*.py") if p.startswith(("scripts/", "tests/"))]
    yaml = sorted(set(tracked("*.yml") + tracked("*.yaml")))
    md = tracked("*.md")
    sql = tracked("*.sql")
    return {
        "ShellCheck": [["shellcheck", "--severity=warning", "--", *shell]],
        "shfmt": [["shfmt", "-d", *shell]],
        "yamllint": [["yamllint", "-d", "{rules: {key-duplicates: enable, indentation: enable}}", *yaml]],
        "HTML Tidy": [["tidy", "-qe", "-utf8", p] for p in html],
        "libxml2": [["xmllint", "--nonet", "--noout", "sitemap.xml", "icon.svg"]],
        "Bandit": [["/usr/bin/python3", "-m", "bandit", "-q", "-r", "scripts", "-ll"]],
        "Pyflakes": [["pyflakes3", *python]],
        "Vulture": [["vulture", "scripts", "tests", "--min-confidence", "90"]],
        "codespell": [["codespell", *md]],
        "SQLFluff": [["sqlfluff", "lint", "--dialect", "postgres", p] for p in sql],
        "Markdownlint": [["mdl", *md]],
        "JSON Schema": [[sys.executable, "scripts/independent_quality.py", "--schema"]],
        "tinycss2": [[sys.executable, "scripts/independent_quality.py", "--css"]],
    }


def schema_check():
    import jsonschema

    data = json.loads((ROOT / "manifest.webmanifest").read_text(encoding="utf-8"))
    relative = {"type": "string", "pattern": r"^\./(?!/|\.\./)[^\s]*$"}
    schema = {
        "type": "object",
        "required": ["name", "short_name", "lang", "dir", "start_url", "scope", "icons"],
        "properties": {
            "name": {"type": "string", "minLength": 1},
            "short_name": {"type": "string", "minLength": 1},
            "lang": {"const": "ar"}, "dir": {"const": "rtl"},
            "start_url": relative, "scope": relative,
            "icons": {"type": "array", "minItems": 1, "items": {
                "type": "object", "required": ["src", "sizes", "type"],
                "properties": {"src": {"type": "string", "minLength": 1},
                               "sizes": {"type": "string"}, "type": {"type": "string"}}}},
            "shortcuts": {"type": "array", "items": {"type": "object",
                "required": ["name", "url"], "properties": {
                    "name": {"type": "string", "minLength": 1}, "url": relative}}},
        },
    }
    jsonschema.Draft7Validator(schema).validate(data)


def css_check():
    import tinycss2

    def walk(tokens):
        for token in tokens:
            if token.type == "error":
                yield token
            for attr in ("content", "arguments", "prelude"):
                children = getattr(token, attr, None)
                if children:
                    yield from walk(children)

    files = tracked("*.css")
    if not files:
        raise RuntimeError("No CSS input")
    errors = 0
    for name in files:
        rules = tinycss2.parse_stylesheet((ROOT / name).read_text(encoding="utf-8"),
                                         skip_comments=True, skip_whitespace=True)
        errors += sum(1 for _ in walk(rules))
    if errors:
        raise ValueError(f"CSS tokenizer errors: {errors}")


def run_tool(name, cmds):
    """Record exit codes without echoing potentially sensitive diagnostic text."""
    if not cmds:
        return {"tool": name, "state": "not-run", "exit_codes": []}
    codes = []
    for args in cmds:
        if not shutil.which(args[0]):
            codes.append(127)
            continue
        try:
            proc = subprocess.run(args, cwd=ROOT, stdin=subprocess.DEVNULL,
                                  stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL,
                                  timeout=45, check=False)
            codes.append(proc.returncode)
        except subprocess.TimeoutExpired:
            codes.append(124)
        except OSError:
            codes.append(126)
    if any(code < 0 or code in (124, 126, 127) for code in codes):
        state = "execution-error"
    elif any(codes):
        state = "review-required"
    else:
        state = "clean"
    return {"tool": name, "state": state, "exit_codes": codes}


def report(path):
    results = []
    for name, cmds in commands().items():
        entry = run_tool(name, cmds)
        package = subprocess.run(["dpkg-query", "-W", "-f=${Version}", PACKAGES[name]],
                                 capture_output=True, text=True, check=False)
        entry["package_version"] = package.stdout.strip() if package.returncode == 0 else None
        if not entry["package_version"]:
            entry["state"] = "execution-error"
        results.append(entry)
    path.write_text(json.dumps(results, indent=2) + "\n", encoding="utf-8")
    for entry in results:
        print(f'{entry["tool"]}: {entry["state"]}; {len(entry["exit_codes"])} invocation(s)')
    return 1 if any(r["state"] in ("execution-error", "not-run") for r in results) else 0


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    group = parser.add_mutually_exclusive_group(required=True)
    group.add_argument("--schema", action="store_true")
    group.add_argument("--css", action="store_true")
    group.add_argument("--report", type=Path)
    args = parser.parse_args()
    if args.schema:
        schema_check()
    elif args.css:
        css_check()
    else:
        raise SystemExit(report(args.report))
