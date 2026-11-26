import ssl
import unittest
from unittest.mock import Mock, patch
from scripts import aegis_operational, edge_probe, production_monitor, release_verify, staging_load


class VerifiedTransportTests(unittest.TestCase):
    def test_every_monitor_requires_validated_tls(self):
        for module in (aegis_operational, edge_probe, production_monitor, release_verify, staging_load):
            with self.subTest(module=module.__name__):
                context = module.verified_tls_context()
                self.assertEqual(context.minimum_version, ssl.TLSVersion.TLSv1_2)
                self.assertTrue(context.check_hostname)
                self.assertEqual(context.verify_mode, ssl.CERT_REQUIRED)

    def test_excluded_resource_body_is_never_read(self):
        connection = Mock()
        connection.sock.getpeercert.return_value = {}
        connection.sock.version.return_value = "TLSv1.3"
        response = connection.getresponse.return_value
        response.status = 200  # Even an accidental disclosure must not be downloaded.
        response.getheaders.return_value = []
        with patch.object(production_monitor.http.client, "HTTPSConnection", return_value=connection):
            status, _, body, _, _ = production_monitor.get("/internal-fixture", read_body=False)
        self.assertEqual(status, 200)
        self.assertEqual(body, "")
        response.read.assert_not_called()
        connection.close.assert_called_once()

    def test_public_response_over_budget_fails(self):
        connection = Mock()
        connection.sock.getpeercert.return_value = {}
        connection.sock.version.return_value = "TLSv1.3"
        response = connection.getresponse.return_value
        response.read.return_value = b"a" * (production_monitor.MAX_BYTES + 1)
        with patch.object(production_monitor.http.client, "HTTPSConnection", return_value=connection):
            with self.assertRaises(ValueError):
                production_monitor.get("/")
        connection.close.assert_called_once()


if __name__ == "__main__":
    unittest.main()
