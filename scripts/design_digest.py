#!/usr/bin/env python3
"""design_digest.py - compute the CompanySIIR design digest.

Mirrors CompanySIIR.sol designDigestOf() (tvm.hash) and static/core.js
designDigest(). Atom = TVM cell representation hash of the value:

  - integers (type-width bit length: uint8=8b, uint16=16b, uint128=128b,
    uint256=256b): atom = sha256(d1 || d2 || bytes), d1=0x00 (0 refs),
    d2=(bits/8)<<1
  - bool: 1 bit, completion-tagged data byte 0x40 (false) / 0xC0 (true):
    atom = sha256(0x00 0x01 0x40|0xC0)
  - strings/bytes <= 127 bytes (byte-aligned): atom = sha256(0x00, len*2,
    raw-utf8 bytes)
  - longer strings: 127-byte chain cells; leaf = sha256(0x00, d2, tail),
    parent = sha256(0x01, 0xFE, chunk, child_depth(2B BE), child_hash);
    leaf depth starts at 0 (acki nacki convention)

Usage:
    python3 scripts/design_digest.py <params.json>
  params.json keys (all required):
    name, description, website, metadataUri, issuanceModel (int),
    governanceEnabled (bool), quorumPermille (int), dissolutionRule (int),
    dissolutionDest (64-hex without 0x),
    plans: [{count:int, weight:int, label, image}],
    logoImage, siirImage, ui, charter
Prints the 64-hex digest."""

import hashlib
import json
import sys


def _h(b):
    return hashlib.sha256(b).digest()


def _atom_bytes(data):
    """Cell hash of a byte-aligned string (possibly a 127-byte ref chain)."""
    if not data:
        return _h(b"\x00\x00")
    if len(data) <= 127:
        return _h(b"\x00" + bytes([len(data) * 2]) + data)
    chunks = [data[i:i + 127] for i in range(0, len(data), 127)]
    tail = chunks[-1]
    depth = 0
    hv = _h(b"\x00" + bytes([len(tail) * 2]) + tail)
    for i in range(len(chunks) - 2, -1, -1):
        hv = _h(b"\x01\xfe" + chunks[i] + depth.to_bytes(2, "big") + hv)
        depth += 1
    return hv


def _atom_int(v, bits):
    return _h(b"\x00" + bytes([bits // 4]) + int(v).to_bytes(bits // 8, "big"))


def _atom_bool(v):
    return _h(b"\x00\x01" + bytes([0xC0 if v else 0x40]))


def digest(p):
    acc = _atom_int(p["issuanceModel"], 8)
    acc = bytes(a ^ b for a, b in zip(acc, _atom_bool(p.get("governanceEnabled"))))
    acc = bytes(a ^ b for a, b in zip(acc, _atom_int(p["quorumPermille"], 16)))
    acc = bytes(a ^ b for a, b in zip(acc, _atom_int(p["dissolutionRule"], 8)))
    acc = bytes(a ^ b for a, b in zip(acc, _atom_int(int(p["dissolutionDest"], 16), 256)))
    for s in (p["name"], p["description"], p["website"], p["metadataUri"],
              p["logoImage"], p["siirImage"], p["ui"], p["charter"]):
        acc = bytes(a ^ b for a, b in zip(acc, _atom_bytes(s.encode())))
    plans = p.get("plans") or []
    acc = bytes(a ^ b for a, b in zip(acc, _atom_int(len(plans), 16)))
    for pl in plans:
        acc = bytes(a ^ b for a, b in zip(acc, _atom_int(pl["count"], 128)))
        acc = bytes(a ^ b for a, b in zip(acc, _atom_int(pl["weight"], 128)))
        acc = bytes(a ^ b for a, b in zip(acc, _atom_bytes((pl.get("label") or "").encode())))
        acc = bytes(a ^ b for a, b in zip(acc, _atom_bytes((pl.get("image") or "").encode())))
    return acc.hex()


def main():
    if len(sys.argv) > 2:
        sys.stderr.write(__doc__)
        return 1
    src = sys.argv[1] if len(sys.argv) == 2 else sys.stdin
    p = json.load(open(src)) if len(sys.argv) == 2 else json.load(sys.stdin)
    print(digest(p))
    return 0


if __name__ == "__main__":
    sys.exit(main())