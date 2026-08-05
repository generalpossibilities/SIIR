#!/usr/bin/env python3
"""bundle.py - inline static/ (fields.js + core.js + app.js + CSS) into a
single self-contained HTML file that can be stored on-chain as the company
UI bundle (data:text/html;base64,...). Pure stdlib."""

import os
import re

HERE = os.path.dirname(os.path.abspath(__file__))


def read(rel):
    with open(os.path.join(HERE, rel)) as f:
        return f.read()


def main():
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument("--emit", action="store_true",
                        help="print data:text/html;base64,... of the bundle")
    args = parser.parse_args()

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
        ("app.js", "script"),
    ]:
        m, _, body = grab(src, tag)
        subs.append((m, body))

    # inline <style> block wholesale (it lives in index.html itself)
    style_m = re.search(r"(<style>.*?</style>)", html, re.S)
    assert style_m, "no style block"

    out = html
    for m, body in subs:
        out = out.replace(m.group(0), "<script>\n%s\n</script>" % body)

    marker = "data: shellnet mirror node · decoding: <code>static/core.js</code>"
    out = out.replace(marker, "data: shellnet mirror node · decoding: browser (bundled)")

    if args.emit:
        import base64
        print("data:text/html;base64," + base64.b64encode(out.encode()).decode())
        return

    with open(os.path.join(HERE, "bundle.html"), "w") as f:
        f.write(out)
    print("bundle.html: %d bytes" % len(out))


if __name__ == "__main__":
    main()
