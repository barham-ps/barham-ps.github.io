"""Read-only quality diagnostics. No production traffic, secrets, or raw report publication."""
import argparse
import json
import os
import re
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
        "ShellCheck": [["shellcheck", "--format=json", "--severity=warning", "--", *shell]],
        "shfmt": [["shfmt", "-d", p] for p in shell],
        "yamllint": [["yamllint", "-d", "{rules: {key-duplicates: enable, indentation: enable}}", *yaml]],
        "HTML Tidy": [["tidy", "-qe", "-utf8", p] for p in html],
        "libxml2": [["xmllint", "--nonet", "--noout", "sitemap.xml", "icon.svg"]],
        "Bandit": [["/usr/bin/python3", "-m", "bandit", "-q", "-r", "scripts", "-ll", "-f", "json"]],
        "Pyflakes": [["pyflakes3", *python]],
        "Vulture": [["vulture", "scripts", "tests", "--min-confidence", "90"]],
        "codespell": [["codespell", *md]],
        "SQLFluff": [["sqlfluff", "lint", "--dialect", "postgres", "--format", "json", p] for p in sql],
        "Markdownlint": [["mdl", p] for p in md],
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


def safe_findings(name, args, stdout, stderr, allowed):
    """Emit only tracked path, numeric location and known rule identifiers.

    Never include tool messages, source text, arbitrary strings, or raw output.
    """
    rows = []

    def add(path, line=None, column=None, rule=None, severity=None):
        if not isinstance(path, str):
            return
        path = path.removeprefix("./")
        if path not in allowed or not re.fullmatch(r"[A-Za-z0-9_./-]{1,240}", path):
            return
        row = {"file": path}
        for key, value in (("line", line), ("column", column)):
            if type(value) is int and 0 < value <= 1000000:
                row[key] = value
        if isinstance(rule, str) and re.fullmatch(r"(?:SC[0-9]{4}|B[0-9]{3}|[A-Z]{1,4}[0-9]{2,4}|PRS|LXR|FORMAT|HTML)", rule):
            row["rule"] = rule
        if severity in ("LOW", "MEDIUM", "HIGH", "WARNING", "ERROR", "INFO"):
            row["severity"] = severity
        if row not in rows and len(rows) < 500:
            rows.append(row)

    if name in ("ShellCheck", "Bandit", "SQLFluff"):
        try:
            data = json.loads(stdout)
        except (ValueError, TypeError):
            data = None
        if name == "ShellCheck" and isinstance(data, list):
            for item in data:
                if isinstance(item, dict) and type(item.get("code")) is int:
                    add(item.get("file"), item.get("line"), item.get("column"),
                        "SC" + str(item["code"]), str(item.get("level", "")).upper())
        elif name == "Bandit" and isinstance(data, dict):
            for item in data.get("results", []):
                if isinstance(item, dict):
                    add(item.get("filename"), item.get("line_number"),
                        rule=item.get("test_id"), severity=item.get("issue_severity"))
        elif name == "SQLFluff" and isinstance(data, list):
            for item in data:
                if not isinstance(item, dict):
                    continue
                for violation in item.get("violations", []):
                    if isinstance(violation, dict):
                        add(item.get("filepath"), violation.get("start_line_no", violation.get("line_no")),
                            violation.get("start_line_pos", violation.get("line_pos")), violation.get("code"))
    elif name == "HTML Tidy":
        for match in re.finditer(r"line (\d+) column (\d+) - (Warning|Error):", stderr):
            add(args[-1], int(match[1]), int(match[2]), "HTML", match[3].upper())
    elif name == "Markdownlint":
        for match in re.finditer(r"(?:^|\n)[^\n]*?:(\d+):\s*(MD\d{3})\b", stdout + "\n" + stderr):
            add(args[-1], int(match[1]), rule=match[2])
    elif name == "shfmt":
        add(args[-1], rule="FORMAT")
    if not rows:
        for candidate in args[1:]:
            add(candidate)
    return rows


def run_tool(name, cmds, allowed=None):
    """Record exit codes and sanitized metadata, never raw report text."""
    if not cmds:
        return {"tool": name, "state": "not-run", "exit_codes": [], "findings": []}
    codes = []
    findings = []
    for args in cmds:
        if not shutil.which(args[0]):
            codes.append(127)
            continue
        try:
            proc = subprocess.run(args, cwd=ROOT, stdin=subprocess.DEVNULL,
                                  stdout=subprocess.PIPE, stderr=subprocess.PIPE,
                                  timeout=45, check=False)
            codes.append(proc.returncode)
            if proc.returncode and allowed:
                findings.extend(safe_findings(
                    name, args, proc.stdout[:2000000].decode("utf-8", errors="replace"),
                    proc.stderr[:2000000].decode("utf-8", errors="replace"), allowed))
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
    return {"tool": name, "state": state, "exit_codes": codes, "findings": findings[:500]}


def report(path):
    results = []
    allowed = set(tracked("*"))
    for name, cmds in commands().items():
        entry = run_tool(name, cmds, allowed)
        package = subprocess.run(["dpkg-query", "-W", "-f=${Version}", PACKAGES[name]],
                                 capture_output=True, text=True, check=False)
        entry["package_version"] = package.stdout.strip() if package.returncode == 0 else None
        if not entry["package_version"]:
            entry["state"] = "execution-error"
        results.append(entry)
    path.write_text(json.dumps(results, indent=2) + "\n", encoding="utf-8")
    for entry in results:
        print(f'{entry["tool"]}: {entry["state"]}; {len(entry["exit_codes"])} invocation(s); {len(entry["findings"])} sanitized records')
        for finding in entry["findings"]:
            print(json.dumps(finding, ensure_ascii=True))
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
