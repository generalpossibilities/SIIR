#!/usr/bin/env bash
# run_parity.sh — prove the JS decoder (static/core.js) matches the Python
# decoder (scripts/mirror.py) on the same live contract.
#
# Offline by default: compares against the committed fixture
# (tests/fixtures/py_ground.json). Regenerate the fixture after a contract or
# ABI change with:
#     python3 tests/gen_ground.py > tests/fixtures/py_ground.json
#
# usage: tests/run_parity.sh [--refresh]
set -euo pipefail
cd "$(dirname "$0")/.."
FIX=tests/fixtures/py_ground.json
if [[ "${1:-}" == "--refresh" ]]; then
    echo "== regenerating ground-truth fixture from the live mirror =="
    python3 tests/gen_ground.py > "$FIX"
fi
echo "== python decoders import cleanly =="
python3 -m py_compile scripts/mirror.py scripts/gov_state.py scripts/gateway.py scripts/plans.py
echo "== plans config generator (weight -> TierPlan[]) =="
python3 tests/test_plans.py
python3 scripts/plans.py --check scripts/plans.example.json
echo "== JS vs Python parity ($FIX) =="
node static/parity.js "$FIX"
