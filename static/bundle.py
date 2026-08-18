#!/usr/bin/env python3
"""bundle.py - inline static/ (fields.js + core.js + app.js + CSS) into a
single self-contained HTML file that can be stored on-chain as the company
UI bundle (data:text/html;base64,...). Minifies with terser when available
(shellnet external-message bodies cap at ~46 KB base64), else falls back to
a cheap comment/whitespace stripper."""

import os
import re
import shutil
import subprocess
import sys

HERE = os.path.dirname(os.path.abspath(__file__))


def read(rel):
    with open(os.path.join(HERE, rel)) as f:
        return f.read()


def _terser():
    for exe in ("terser", "npx"):
        if shutil.which(exe):
            return exe
    return None


def minify_js(src):
    """Real minifier (terser) with a pure-stdlib fallback."""
    exe = _terser()
    if exe:
        cmd = [exe, "-c", "-m"] if exe == "terser" else [exe, "--yes", "terser", "-c", "-m"]
        try:
            out = subprocess.run(
                cmd, input=src, capture_output=True, text=True, timeout=120)
            if out.returncode == 0 and out.stdout.strip():
                return out.stdout.strip()
        except (OSError, subprocess.TimeoutExpired):
            pass
    src = re.sub(r"^\s*//.*$", "", src, flags=re.M)
    src = "\n".join(line.strip() for line in src.split("\n"))
    return re.sub(r"\n\s*\n+", "\n", src).strip()


def minify_html(src):
    """Collapse inter-tag whitespace; keep <style>/<script>/<pre> bodies."""
    def keep(m):
        tag = m.group(1)
        if tag in ("style", "script", "pre"):
            return m.group(0)
        return m.group(0).replace("\n", " ").replace("  ", " ")
    src = re.sub(r"<(?!/)(style|script|pre)\b.*?</\1>", keep, src, flags=re.S)
    src = re.sub(r">\s+<", "><", src)
    return src.strip()


def main():
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument("--emit", action="store_true",
                        help="print data:text/html;base64,... of the bundle")
    parser.add_argument("--gzip", action="store_true",
                        help="with --emit: gzip-compress the payload "
                             "(marker data:text/html;base64,gz,; the gateway "
                             "decompresses when serving)")
    parser.add_argument("--set", action="append", default=[], metavar="CONST=value",
                        help="override a const in app.js, e.g. --set FACTORY_ADDR=dapp::acct "
                             "(used by deploy.sh to bake the live addresses into the bundle)")
    args = parser.parse_args()

    app_js = read("app.js")
    for kv in args.set:
        key, _, val = kv.partition("=")
        pat = re.compile(r'(const %s = )"[^"]*"' % re.escape(key.strip()))
        new, n = pat.subn(r'\g<1>"%s"' % val.replace("\\", "\\\\").replace('"', '\\"'), app_js)
        if n != 1:
            raise SystemExit("--set %s: no `const %s = \"...\"` found in app.js" % (key, key))
        app_js = new

    html = read("index.html")

    def grab(src, tag):
        m = re.search(r"<script src=\"%s\"></script>" % src, html)
        if not m:
            raise SystemExit("missing script tag for %s" % src)
        body = read(src)
        return m, tag, body

    subs = []
    for src, tag in [
        ("fields.js", "script"),
        ("core.js", "script"),
        ("abi.js", "script"),
        ("wallet.js", "script"),
        ("app.js", "script"),
    ]:
        m, _, body = grab(src, tag)
        if src == "app.js":
            body = app_js
        subs.append((m, minify_js(body)))

    # inline <style> block wholesale (it lives in index.html itself)
    style_m = re.search(r"(<style>.*?</style>)", html, re.S)
    assert style_m, "no style block"

    out = minify_html(html)
    for m, body in subs:
        out = out.replace(m.group(0), "<script>\n%s\n</script>" % body)

    marker = "data: shellnet mirror node · decoding: <code>static/core.js</code>"
    out = out.replace(marker, "data: shellnet mirror node · decoding: browser (bundled)")

    if args.emit:
        import base64
        data = out.encode()
        if args.gzip:
            import gzip
            try:
                data = gzip.compress(data, mtime=0)
            except TypeError:  # python < 3.8
                data = gzip.compress(data)
            print("data:text/html;base64,gz," + base64.b64encode(data).decode())
            return
        print("data:text/html;base64," + base64.b64encode(data).decode())
        return

    with open(os.path.join(HERE, "bundle.html"), "w") as f:
        f.write(out)
    print("bundle.html: %d bytes" % len(out))


if __name__ == "__main__":
    main()
