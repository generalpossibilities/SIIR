#!/usr/bin/env python3
"""state_digest.py - canonical design digest of a live company's mirror state.

Decodes the company's state cell via mirror.py (the same decode the explorer
uses) and computes design_digest.py over the immutable design fields, so the
digest check in deploy.sh step 4b verifies against what is actually stored
on-chain.

Usage:
    python3 scripts/state_digest.py <dapp::account_id>
  (a bare 0:raw form is accepted too)
Prints the 64-hex digest."""

import importlib.util
import json
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)

from mirror import MirrorState  # noqa: E402


def _load_module(name, path):
    spec = importlib.util.spec_from_file_location(name, path)
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


def main():
    if len(sys.argv) != 2:
        sys.stderr.write(__doc__)
        return 1
    addr = sys.argv[1]
    if "::" not in addr:
        raw = addr.split(":")[-1]
        addr = f"{raw}::{raw}"
    abi = json.load(open(os.path.join(HERE, "..", "contracts", "CompanySIIR.abi.json")))
    try:
        ms = MirrorState(addr, abi)
    except Exception as e:
        sys.stderr.write(f"LOAD ERROR: {e}\n")
        return 1
    dd = _load_module("design_digest", os.path.join(HERE, "design_digest.py"))
    st = ms.state
    print(dd.digest({
        "name": st.get("_name") or "",
        "description": st.get("_description") or "",
        "website": st.get("_website") or "",
        "metadataUri": st.get("_metadataUri") or "",
        "issuanceModel": st.get("_issuanceModel") or 0,
        "governanceEnabled": bool(st.get("_governanceEnabled")),
        "quorumPermille": st.get("_quorumPermille") or 0,
        "dissolutionRule": st.get("_dissolutionRule") or 0,
        "dissolutionDest": (st.get("_dissolutionDest") or "0:0").split(":")[-1],
        "plans": [{"count": pl[0], "weight": pl[1], "label": pl[2], "image": pl[4]}
                  for pl in (st.get("_plans") or [])],
        "logoImage": st.get("_logoImage") or "",
        "siirImage": st.get("_siirImage") or "",
        "ui": st.get("_ui") or "",
        "charter": st.get("_charter") or "",
    }))
    return 0


if __name__ == "__main__":
    sys.exit(main())