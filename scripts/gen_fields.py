#!/usr/bin/env python3
"""gen_fields.py - regenerate static/fields.js from contracts/*.abi.json.

Usage:
    python3 scripts/gen_fields.py > static/fields.js

Each state field keeps its ABI type/components (the compiler's `init`
static-field flag is dropped — the browser client never uses it)."""

import json
import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CT = os.path.join(ROOT, "contracts")

CONTRACTS = ["CompanySIIR", "SIIRFactory", "SIIRMarketplace"]


def main():
    fields = {}
    for name in CONTRACTS:
        abi = json.load(open(os.path.join(CT, name + ".abi.json")))
        fields[name] = [{k: v for k, v in f.items() if k != "init"}
                        for f in abi.get("fields", [])]
    print("// generated from contracts/*.abi.json via:")
    print("//   python3 scripts/gen_fields.py > static/fields.js")
    print("const FIELDS = " + json.dumps(fields, separators=(",", ":")) + ";")
    print("const ABI_FIELDS = FIELDS.CompanySIIR;  // default: company contract")
    print('if (typeof module !== "undefined" && module.exports) module.exports = { ABI_FIELDS, FIELDS };')


if __name__ == "__main__":
    sys.exit(main())
