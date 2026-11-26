import unittest
from unittest.mock import patch
from scripts import aegis_operational as p

class OperationalTests(unittest.TestCase):
    def test_public_key_is_restricted_to_owned_project_and_publishable_key(self):
        source = "createClient('https://"+p.API+"', 'sb_publishable_fixture', {})"
        self.assertEqual(p.public_key(source), "sb_publishable_fixture")
        for bad in (source.replace("sb_publishable_", "sb_secret_"), source.replace(p.API,"example.invalid"), source+source):
            with self.assertRaises(ValueError):
                p.public_key(bad)
        with self.assertRaises(ValueError):
            p.request("example.invalid", "/")
        with self.assertRaises(ValueError):
            p.request(p.EDGE, "/", key="sb_publishable_fixture")

    def test_permissions_denied_requires_database_sqlstate(self):
        self.assertTrue(p.denied(401,b'{"code":"42501"}'))
        self.assertTrue(p.denied(403,b'{"code":"42501"}'))
        for status in (200,404,429,500):
            self.assertFalse(p.denied(status,b'{"code":"42501"}'))
        for body in (b'{"code":"PGRST301"}',b'{"message":"Forbidden"}',b'<html>',b'[]'):
            self.assertFalse(p.denied(403,body))

    def test_captcha_requires_exact_server_error(self):
        self.assertTrue(p.captcha_blocked(400,b'{"code":400,"error_code":"captcha_failed"}'))
        self.assertFalse(p.captcha_blocked(400,b'{"error_code":"invalid_credentials"}'))
        self.assertFalse(p.captcha_blocked(429,b'{"error_code":"captcha_failed"}'))
        self.assertFalse(p.captcha_blocked(200,b'{"error_code":"captcha_failed"}'))

    def test_header_policy_fails_missing_or_weak_controls(self):
        headers = {
            "content-security-policy":"default-src 'self'; object-src 'none'; frame-ancestors 'none'",
            "x-frame-options":"DENY","x-content-type-options":"nosniff",
            "referrer-policy":"no-referrer","strict-transport-security":"max-age=31536000",
            "permissions-policy":"camera=(), microphone=(), geolocation=()",
            "cache-control":"no-store"}
        self.assertTrue(p.header_checks(200,headers))
        self.assertFalse(p.header_checks(403,headers))
        for missing in headers:
            self.assertFalse(p.header_checks(200,{key:v for key,v in headers.items() if key!=missing}), missing)
        self.assertFalse(p.header_checks(200,{**headers,"permissions-policy":"camera=(self), microphone=(), geolocation=()"}))

    def test_rpc_no_success_bodies_are_read(self):
        with patch.object(p,"request",return_value=(401,{},b'{"code":"42501"}')) as mock:
            self.assertTrue(p.api_denial("sb_publishable_fixture","family_security_summary"))
            self.assertEqual(mock.call_args.args[-1],(401,403))
        with patch.object(p,"request",return_value=(200,{},b'')):
            self.assertFalse(p.api_denial("sb_publishable_fixture","family_security_summary"))

    def test_public_gateway_canary_has_no_real_id(self):
        with patch.object(p,"request",return_value=(200,{},b'[]')) as mock:
            self.assertTrue(p.api_canary("sb_publishable_fixture"))
            self.assertEqual(mock.call_args.args[4],{"p_token":"00000000-0000-0000-0000-000000000000"})
        with patch.object(p,"request",return_value=(200,{},b'[{}]')):
            self.assertFalse(p.api_canary("sb_publishable_fixture"))

if __name__ == "__main__":
    unittest.main()
