#!/usr/bin/env python3
"""Print the governance & dissolution state of a live CompanySIIR from the
mirror state (tvm-cli run getGovernance decode is broken in tvm-cli 3.0.0).

usage: gov_state.py <dapp::address>
"""
import sys, json, os

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__))))
from mirror import MirrorState

KEY = ("_governanceEnabled", "_quorumPermille", "_totalWeight",
       "_dissolveVotes", "_dissolved", "_dissolvedAt", "_dissolutionRule",
       "_dissolutionDest", "_finalDeposited", "_finalized")

def main():
    if len(sys.argv) != 2:
        print(__doc__)
        return 2
    abi = json.load(open(os.path.join(os.path.dirname(os.path.abspath(__file__)),
                                      "..", "contracts", "CompanySIIR.abi.json")))
    ms = MirrorState(sys.argv[1], abi)
    out = {}
    for k in KEY:
        out[k] = ms.state.get(k)
    if out.get("_dissolved"):
        out["graceEnd"] = (out.get("_dissolvedAt") or 0) + 30 * 86400
    else:
        out["graceEnd"] = 0
    print(json.dumps(out))

if __name__ == "__main__":
    sys.exit(main())
