#!/usr/bin/env python3
"""gen_abi_js.py - regenerate static/abi.js from contracts/*.abi.json.

Usage:
    python3 scripts/gen_abi_js.py > static/abi.js

Keeps only what the browser wallet needs: the functions (name/inputs/
outputs) for SDK-compatible func_id derivation and param packing, plus
the ABI version.  State fields stay in fields.js."""

import json
import os
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CT = os.path.join(ROOT, "contracts")

CONTRACTS = ["CompanySIIR", "SIIRFactory", "SIIRMarketplace", "SIIRExplorer"]


def main():
    abis = {}
    for name in CONTRACTS:
        abi = json.load(open(os.path.join(CT, name + ".abi.json")))
        fns = []
        for f in abi.get("functions", []):
            fn = {"name": f["name"],
                  "inputs": [{"name": i["name"], "type": i["type"]}
                             for i in f.get("inputs", [])],
                  "outputs": [{"name": o["name"], "type": o["type"]}
                              for o in f.get("outputs", [])]}
            fns.append(fn)
        abis[name] = fns
    print("// generated from contracts/*.abi.json via:")
    print("//   python3 scripts/gen_abi_js.py > static/abi.js")
    print("const ABIS = " + json.dumps(abis, separators=(",", ":")) + ";")
    print("const COMPANY_ABI = { functions: ABIS.CompanySIIR, \"ABI version\": 2 };")
    print("if (typeof module !== \"undefined\" && module.exports) module.exports = { ABIS, COMPANY_ABI };")


if __name__ == "__main__":
    sys.exit(main())