import importlib.util
import pathlib
import sys
import unittest
from unittest.mock import patch

spec = importlib.util.spec_from_file_location(
    "independent_quality", pathlib.Path(__file__).resolve().parents[1] / "scripts/independent_quality.py"
)
quality = importlib.util.module_from_spec(spec)
spec.loader.exec_module(quality)


class DiagnosticsTests(unittest.TestCase):
    def test_real_exit_codes(self):
        for code, expected in [(0, "clean"), (1, "review-required"), (127, "execution-error")]:
            result = quality.run_tool("fixture", [[sys.executable, "-c", f"raise SystemExit({code})"]])
            self.assertEqual(result["state"], expected)
            self.assertEqual(result["exit_codes"], [code])

    def test_empty_not_success(self):
        self.assertEqual(quality.run_tool("fixture", [])["state"], "not-run")

    def test_missing_binary(self):
        with patch.object(quality.shutil, "which", return_value=None):
            self.assertEqual(quality.run_tool("fixture", [["missing"]])["state"], "execution-error")

    def test_every_invocation_counts(self):
        result = quality.run_tool("fixture", [
            [sys.executable, "-c", "raise SystemExit(1)"],
            [sys.executable, "-c", "raise SystemExit(0)"],
        ])
        self.assertEqual(result["state"], "review-required")
        self.assertEqual(result["exit_codes"], [1, 0])


if __name__ == "__main__":
    unittest.main()
