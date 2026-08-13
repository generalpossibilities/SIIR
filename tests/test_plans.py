#!/usr/bin/env python3
"""Unit tests for scripts/plans.py — weight-based tier config -> TierPlan[].

Run:  python3 tests/test_plans.py   (also wired into tests/run_parity.sh)
"""
import json
import os
import sys
import unittest

sys.path.insert(0, os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "scripts"))
import plans  # noqa: E402


class PlansTest(unittest.TestCase):
    def tearDown(self):
        for f in ("/tmp/test-plans.json", "/tmp/test-plans2.json"):
            try:
                os.remove(f)
            except OSError:
                pass

    def run_derive(self, cfg):
        with open("/tmp/test-plans.json", "w") as f:
            json.dump(cfg, f)
        return plans.derive(json.load(open("/tmp/test-plans.json")))

    def test_all_share(self):
        out, _, total, _, scale = self.run_derive({
            "totalWeight": 1000,
            "tiers": [
                {"label": "Bronze", "pct": 50, "weightPer": 1},
                {"label": "Silver", "pct": 30, "weightPer": 10},
                {"label": "Gold", "pct": 15, "weightPer": 50},
                {"label": "Platinum", "pct": 5, "weightPer": 25},
            ],
        })
        self.assertEqual(scale, 1)
        self.assertEqual(total, 1000)
        self.assertEqual([(p["label"], p["count"], p["weight"]) for p in out],
                         [("Bronze", 500, 1), ("Silver", 30, 10),
                          ("Gold", 3, 50), ("Platinum", 2, 25)])
        # every weight unit is exactly allocated
        self.assertEqual(sum(p["weight"] * p["count"] for p in out), 1000)

    def test_count_only_derives_total(self):
        out, _, total, _, _ = self.run_derive({
            "tiers": [
                {"label": "A", "count": 500, "weightPer": 1},
                {"label": "B", "count": 30, "weightPer": 10},
            ],
        })
        self.assertEqual(total, 800)
        self.assertEqual([(p["label"], p["count"]) for p in out], [("A", 500), ("B", 30)])

    def test_count_only_with_matching_total(self):
        out, _, total, _, _ = self.run_derive({
            "totalWeight": 800,
            "tiers": [{"label": "A", "count": 500, "weightPer": 1},
                      {"label": "B", "count": 30, "weightPer": 10}],
        })
        self.assertEqual(total, 800)
        self.assertEqual(len(out), 2)

    def test_count_only_total_mismatch(self):
        with self.assertRaises(ValueError):
            self.run_derive({
                "totalWeight": 999,
                "tiers": [{"label": "A", "count": 500, "weightPer": 1}],
            })

    def test_mixed_count_then_share(self):
        out, _, _, _, _ = self.run_derive({
            "totalWeight": 1000,
            "tiers": [
                {"label": "Baseline", "count": 30, "weightPer": 10},
                {"label": "Bronze", "pct": 70, "weightPer": 1},
                {"label": "Silver", "pct": 20, "weightPer": 10},
                {"label": "Gold", "pct": 10, "weightPer": 35},
            ],
        })
        self.assertEqual(out[0]["count"], 30)
        self.assertEqual([(p["label"], p["count"]) for p in out],
                         [("Baseline", 30), ("Bronze", 490),
                          ("Silver", 14), ("Gold", 2)])

    def test_fractional_pct_thirds(self):
        out, _, total, _, _ = self.run_derive({
            "totalWeight": 3000,
            "tiers": [
                {"label": "A", "pct": 33.333333333, "weightPer": 1},
                {"label": "B", "pct": 33.333333333, "weightPer": 1},
                {"label": "C", "pct": 33.333333334, "weightPer": 1},
            ],
        })
        self.assertEqual([p["count"] for p in out], [1000, 1000, 1000])
        self.assertEqual(total, 3000)

    def test_fractional_weight_autoscale(self):
        out, _, total, on_chain_total, scale = self.run_derive({
            "totalWeight": 1000,
            "tiers": [
                {"label": "Bronze", "pct": 60, "weightPer": 0.5},
                {"label": "Gold", "pct": 40, "weightPer": 1},
            ],
        })
        self.assertEqual(scale, 2)
        self.assertEqual(on_chain_total, 2000)
        self.assertEqual([p["weight"] for p in out], [1, 2])
        self.assertEqual([p["count"] for p in out], [1200, 400])

    def test_indivisible_share_hints(self):
        with self.assertRaises(ValueError) as ctx:
            self.run_derive({
                "totalWeight": 1000,
                "tiers": [
                    {"label": "Bronze", "pct": 95, "weightPer": 1},
                    {"label": "Platinum", "pct": 5, "weightPer": 100},
                ],
            })
        msg = str(ctx.exception)
        self.assertIn("indivisible", msg)
        self.assertIn("weightPer", msg)  # hints valid choices

    def test_duplicate_label(self):
        with self.assertRaises(ValueError):
            self.run_derive({
                "totalWeight": 10,
                "tiers": [{"label": "A", "pct": 50, "weightPer": 1},
                          {"label": "A", "pct": 50, "weightPer": 1}],
            })

    def test_pct_and_count_conflict(self):
        with self.assertRaises(ValueError):
            self.run_derive({
                "totalWeight": 10,
                "tiers": [{"label": "A", "pct": 50, "count": 5, "weightPer": 1}],
            })

    def test_legacy_pctPermille(self):
        out, *_ = self.run_derive({
            "totalWeight": 1000,
            "tiers": [{"label": "A", "pctPermille": 500, "weightPer": 1},
                      {"label": "B", "pctPermille": 500, "weightPer": 1}],
        })
        self.assertEqual([p["count"] for p in out], [500, 500])

    def test_missing_total_for_share_tiers(self):
        with self.assertRaises(ValueError) as ctx:
            self.run_derive({"tiers": [{"label": "A", "pct": 100, "weightPer": 1}]})
        self.assertIn("totalWeight is required", str(ctx.exception))

    def test_mixed_without_total(self):
        with self.assertRaises(ValueError):
            self.run_derive({"tiers": [
                {"label": "A", "count": 5, "weightPer": 1},
                {"label": "B", "pct": 50, "weightPer": 1},
            ]})


if __name__ == "__main__":
    unittest.main()