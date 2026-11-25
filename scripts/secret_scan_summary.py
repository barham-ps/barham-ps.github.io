"""Emit only Gitleaks counts and rule categories; never disclose secret values."""
import collections
import json
import pathlib
import re
import sys

def summarize(path):
    findings = json.loads(pathlib.Path(path).read_text(encoding="utf-8"))
    if not isinstance(findings, list):
        raise ValueError("Invalid scanner report")
    rules = collections.Counter()
    for finding in findings:
        rule = finding.get("RuleID", "")
        rules[rule if isinstance(rule, str) and re.fullmatch(r"[a-z0-9][a-z0-9_-]{0,79}", rule) else "other"] += 1
    return {"count": len(findings), "rules": dict(sorted(rules.items()))}

if __name__ == "__main__":
    if len(sys.argv) != 3:
        sys.exit("Expected history and public-build report paths")
    print(json.dumps({"history": summarize(sys.argv[1]), "public_build": summarize(sys.argv[2])}, sort_keys=True))
