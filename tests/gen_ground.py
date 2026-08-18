#!/usr/bin/env python3
"""Generate the ground-truth fixture for the JS decoder parity check.

Dumps every field that static/parity.js compares (same getter set) from the
Python mirror decode, so the JS and Python decoders are proven against each
other on the same contract. The committed fixture (tests/fixtures/py_ground.json)
keeps parity offline and deterministic; regenerate after a contract/ABI change:

    python3 tests/gen_ground.py > tests/fixtures/py_ground.json

usage: gen_ground.py [dapp::account_id] [founder 0:hex] [holder 0:hex]
"""
import json
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__))))
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "scripts"))

from mirror import MirrorState  # noqa: E402

ADDR = (sys.argv[1] if len(sys.argv) > 1 else
        "95021c8e8642f60da6aaa316f4eb2b3d22e3626a734336adf4779ccecc56844b"
        "::95021c8e8642f60da6aaa316f4eb2b3d22e3626a734336adf4779ccecc56844b")
F = sys.argv[2] if len(sys.argv) > 2 else "0:c4d1738754335536ec61d32bdf872bffd1f9a9a114c4f2bc8328f0726ed275cb"
H = sys.argv[3] if len(sys.argv) > 3 else "0:0f077a5e0f4630b9696db80a77b357ab576773d0a278590a22408d1c89366caa"

ABI = json.load(open(os.path.join(os.path.dirname(os.path.abspath(__file__)),
                                  "..", "contracts", "CompanySIIR.abi.json")))


def main():
    try:
        ms = MirrorState(ADDR, ABI)
    except Exception as e:
        sys.stderr.write(f"LOAD ERROR: {e}\n")
        return 1
    out = {
        "company_info": ms.company_info(),
        "div_currencies": [str(c) for c in ms._div_currencies()],
        "plans": ms.plans_abi(),
        "history1": ms.history(1),
        "claimable1": ms.claimable(1),
        "claimable_of_founder": ms.claimable_of(F),
        "siir1": ms.siir(1),
        "siir100": ms.siir(100),
        "balance_of": len(ms.ids_of(F)),
        "content_info": ms.content_info(),
        "charter": ms.charter()["charter"][:60],
        "charter_ratified": ms.charter()["ratified"],
        "charter_fp": ms.charter_fingerprint(),
        "fp1": ms.fingerprint(1),
        "raw_len_logo": len(ms.state.get("_logoImage") or ""),
        "ids_of_f": [{"start": str(s), "end": str(e)}
                     for s, e in ms.ids_of(F)][:5],
        "history100": ms.history(100),
        "holder_claimable": ms.claimable_of(H),
        "co_founders": ms.co_founders(),
        "founder_rights_holder": ms.founder_rights(H, "0x0000000000000000000000000000000000000000000000000000000000000000"),
        "founder_rights_original": ms.founder_rights(F, "0x0000000000000000000000000000000000000000000000000000000000000000"),
        "design_digest": _design_digest(ms),
    }
    print(json.dumps(out, sort_keys=True))
    return 0


def _design_digest(ms):
    """Canonical design digest for the decoded state (design_digest.py)."""
    import importlib.util

    dd_path = os.path.join(os.path.dirname(os.path.abspath(__file__)),
                           "..", "scripts", "design_digest.py")
    spec = importlib.util.spec_from_file_location("design_digest", dd_path)
    dd = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(dd)
    st = ms.state
    return dd.digest({
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
    })


if __name__ == "__main__":
    sys.exit(main())
