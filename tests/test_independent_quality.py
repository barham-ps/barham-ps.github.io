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

class SanitizedResultsTests(unittest.TestCase):
    def test_shellcheck_does_not_expose_messages(self):
        rows = quality.safe_findings("ShellCheck", [], '[{"file":"tests/a.sh","line":4,"column":2,"code":2086,"level":"warning","message":"SECRET"}]', "", {"tests/a.sh"})
        self.assertEqual(rows, [{"file":"tests/a.sh","line":4,"column":2,"rule":"SC2086","severity":"WARNING"}])

    def test_untracked_path_ignored(self):
        rows = quality.safe_findings("Bandit", [], '{"results":[{"filename":"/tmp/private","test_id":"B101","line_number":2}]}', "", {"tests/a.sh"})
        self.assertEqual(rows, [])

    def test_sqlfluff_only_safe_fields(self):
        rows = quality.safe_findings("SQLFluff", ["sqlfluff","database/example.sql"], '[{"filepath":"database/example.sql","violations":[{"start_line_no":3,"start_line_pos":2,"code":"LT01","description":"SECRET"}]}]', "", {"database/example.sql"})
        self.assertEqual(rows, [{"file":"database/example.sql","line":3,"column":2,"rule":"LT01"}])

    def test_html_hides_message(self):
        rows = quality.safe_findings("HTML Tidy", ["tidy","index.html"], "", "line 8 column 3 - Warning: SECRET", {"index.html"})
        self.assertEqual(rows, [{"file":"index.html","line":8,"column":3,"rule":"HTML","severity":"WARNING"}])


if __name__ == "__main__":
    unittest.main()
