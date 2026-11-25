import pathlib
import sys
import tempfile
import unittest
sys.path.insert(0,str(pathlib.Path(__file__).resolve().parents[1]/"scripts"))
from release_verify import verify,versions
from validate_public_build import validate,ALLOWED

class ReleaseTests(unittest.TestCase):
    def test_exact_version_and_bytes(self):
        with tempfile.TemporaryDirectory() as d:
            p=pathlib.Path(d)
            h=b'<link href="portal.css?v=81"><script src="portal.js?v=81"></script>'
            (p/"index.html").write_bytes(h)
            (p/"portal.css").write_bytes(b"css")
            (p/"portal.js").write_bytes(b"js")
            bodies={"/":h,"/portal.css?v=81":b"css","/portal.js?v=81":b"js"}
            get=lambda host,path:bodies[path]
            self.assertTrue(verify(p,fetcher=get)["release_verified"])
            bodies["/portal.js?v=81"]=b"stale"
            self.assertFalse(verify(p,fetcher=get)["release_verified"])
            bodies["/portal.js?v=81"]=b"js"
            bodies["/"]=h.replace(b"81",b"80")
            self.assertFalse(verify(p,fetcher=get)["release_verified"])
    def test_unsynchronized_or_missing(self):
        for h in (b"portal.css?v=81 portal.js?v=80",b"portal.css?v=81",b"portal.css?v=81 portal.css?v=81 portal.js?v=81"):
            with self.assertRaises(ValueError): versions(h)
    def test_allowlist_and_stale_files(self):
        with tempfile.TemporaryDirectory() as d:
            p=pathlib.Path(d)
            self.assertEqual(validate(p,True),0)
            with self.assertRaises(ValueError): validate(p)
            for name in ALLOWED:
                f=p/name
                f.parent.mkdir(parents=True,exist_ok=True)
                f.write_bytes(b"x")
            self.assertEqual(validate(p),len(ALLOWED))
            (p/"private.txt").write_bytes(b"x")
            with self.assertRaises(ValueError): validate(p,True)
    def test_symlink_rejected(self):
        with tempfile.TemporaryDirectory() as d:
            p=pathlib.Path(d)
            (p/"index.html").symlink_to("/does-not-exist")
            with self.assertRaises(ValueError): validate(p,True)
