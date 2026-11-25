import gzip
import pathlib
import sys
import unittest
sys.path.insert(0,str(pathlib.Path(__file__).resolve().parents[1]/"scripts"))
from edge_probe import evaluate
from staging_load import check_host

class EdgeTests(unittest.TestCase):
    def test_gzip_and_cache_evidence(self):
        raw=b"body { color: red; }"
        h={"content-type":"text/css","etag":"test","cf-ray":"test"}
        r=evaluate((200,h,raw,1),(200,{"content-encoding":"gzip"},gzip.compress(raw),1),
                   (200,{"content-encoding":"br"},b"x",1),(304,{},b"",1))
        self.assertTrue(r["gzip_verified"])
        self.assertTrue(r["conditional_304"])
        self.assertTrue(r["cloudflare_edge_evidence"])
    def test_absence_is_not_pass(self):
        raw=b"body {}"
        r=evaluate((200,{"content-type":"text/css"},raw,1),(200,{},raw,1),(200,{},raw,1),None)
        self.assertFalse(r["gzip_verified"])
        self.assertFalse(r["brotli_advertised"])
        self.assertFalse(r["cloudflare_edge_evidence"])
    def test_bad_gzip(self):
        with self.assertRaises(ValueError):
            evaluate((200,{"content-type":"text/css"},b"a",1),(200,{"content-encoding":"gzip"},gzip.compress(b"b"),1),(200,{},b"a",1),None)
    def test_preview_only(self):
        check_host("abc123.example.pages.dev")
        for host in ["barham-ps.github.io","example.pages.dev","api.example.com","abc.example.pages.dev.evil"]:
            with self.assertRaises(ValueError):
                check_host(host)
