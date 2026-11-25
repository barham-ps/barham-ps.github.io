import hashlib
import http.client
import importlib.util
import json
import threading
import unittest
from pathlib import Path
from unittest.mock import patch

spec = importlib.util.spec_from_file_location("scanner", Path(__file__).resolve().parents[1] / "scripts/private-av-scanner.py")
scanner = importlib.util.module_from_spec(spec)
spec.loader.exec_module(scanner)

class ScannerTests(unittest.TestCase):
    def setUp(self):
        self.server = scanner.HTTPServer(("127.0.0.1", 0), scanner.Handler)
        self.server.auth = b"Bearer synthetic-only-test-token"
        self.server.clamd_socket = "/unused"
        self.thread = threading.Thread(target=self.server.serve_forever, daemon=True)
        self.thread.start()

    def tearDown(self):
        self.server.shutdown()
        self.server.server_close()
        self.thread.join(timeout=2)

    def request(self, data=b"synthetic data", auth="Bearer synthetic-only-test-token", digest=None):
        conn = http.client.HTTPConnection("127.0.0.1", self.server.server_port, timeout=3)
        try:
            conn.request("POST", "/scan", body=data, headers={"Authorization":auth, "X-Content-SHA256":digest if digest is not None else hashlib.sha256(data).hexdigest()})
            result = conn.getresponse()
            return result.status, json.loads(result.read())
        finally:
            conn.close()

    def test_auth_and_integrity(self):
        with patch.object(scanner, "scan") as scan:
            self.assertEqual(self.request(auth="Bearer wrong")[0], 401)
            self.assertEqual(self.request(digest="0"*64)[0], 400)
            self.assertEqual(self.request(data=b"")[0], 413)
            scan.assert_not_called()

    def test_clean_and_blocked_contract(self):
        for verdict in ("clean", "infected"):
            with patch.object(scanner, "scan", return_value=verdict):
                code, body = self.request()
                self.assertEqual(code, 200)
                self.assertEqual(body, {"engine":"ClamAV","status":verdict,"sha256":hashlib.sha256(b"synthetic data").hexdigest()})

    def test_outage_never_returns_clean(self):
        with patch.object(scanner, "scan", side_effect=OSError("synthetic outage")):
            code, body = self.request()
            self.assertEqual(code, 503)
            self.assertNotIn("status", body)

if __name__ == "__main__":
    unittest.main()
