import importlib.util
import pathlib
import unittest

spec=importlib.util.spec_from_file_location("monitor", pathlib.Path(__file__).resolve().parents[1]/"scripts"/"production_monitor.py")
monitor=importlib.util.module_from_spec(spec)
spec.loader.exec_module(monitor)

class MonitorTests(unittest.TestCase):
    def test_missing_headers_are_not_passes(self):
        self.assertEqual(len(monitor.headers_missing({})), 6)
    def test_present_headers(self):
        self.assertEqual(monitor.headers_missing({"content-security-policy":"default-src 'self'; frame-ancestors 'none'","strict-transport-security":"max-age=31536000","x-content-type-options":"nosniff","referrer-policy":"no-referrer","permissions-policy":"camera=()"}), [])
    def test_only_public_paths(self):
        self.assertTrue(all(p.startswith("/") and "#" not in p and "?" not in p for p in monitor.PAGES))
        self.assertIn("/genealogy/",monitor.PAGES)

    def test_trust_evidence_monitored(self):
        self.assertIn("/trust/", monitor.PAGES)
        self.assertIn("/.well-known/security.txt", monitor.PAGES)

    def test_security_txt_fallback_monitored(self):
        self.assertIn("/security.txt", monitor.PAGES)
