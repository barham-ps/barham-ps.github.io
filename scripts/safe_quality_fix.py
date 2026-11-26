"""Stage format-only fixes in test shell fixtures; never writes production source."""
import argparse
import json
import subprocess
from pathlib import Path

from independent_quality import ROOT, tracked


def invoke(args, data):
    return subprocess.run(args, input=data, stdout=subprocess.PIPE,
                          stderr=subprocess.PIPE, timeout=30, check=True).stdout


def normalize(content):
    return invoke(["shfmt", "-mn"], content)


def candidate(original):
    formatted = invoke(["shfmt"], original)
    if original == formatted:
        return None
    if normalize(original) != normalize(formatted):
        raise ValueError("Normalized shell programs differ")
    invoke(["bash", "-n"], formatted)
    return formatted


def apply():
    result = {"changed": [], "review_required": [], "scope": "tests/*.sh only"}
    for name in tracked("tests/*.sh"):
        path = ROOT / name
        if path.parent != ROOT / "tests" or path.is_symlink():
            continue
        try:
            original = path.read_bytes()
            if not original.startswith((b"#!/bin/bash", b"#!/usr/bin/env bash", b"#!/bin/sh")):
                continue
            proposal = candidate(original)
            if proposal is not None:
                path.write_bytes(proposal)
                result["changed"].append(name)
        except (OSError, subprocess.SubprocessError, ValueError):
            result["review_required"].append(name)
    return result


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--report", type=Path, required=True)
    args = parser.parse_args()
    result = apply()
    args.report.write_text(json.dumps(result, indent=2) + "\n", encoding="utf-8")
    print("Safe candidate files:", len(result["changed"]))
    print("Manual review files:", len(result["review_required"]))
