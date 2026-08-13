#!/usr/bin/env python3
"""plans.py - derive TierPlan[] for deployCompany from a friendly config.

The on-chain ABI wants raw TierPlan[] ({count, weight, label, issued, image}).
This tool turns a founder's description of the company into that array.

A tier can be described two ways (mix them freely):

  A. by share:     {"label": "Gold", "pct": 15, "weightPer": 50}
       "15% of the company's total weight, each SIIR weighing 50".
       count is DERIVED: count = share / weightPer.

  B. by count:     {"label": "Gold", "count": 3, "weightPer": 50}
       "3 SIIRs, each weighing 50". Share is DERIVED: share = count * weightPer.

  Labels and weights are completely free-form: any name, any weight
  (fractional weights like 0.5 work — the tool picks the smallest scale that
  makes every on-chain weight a whole number).

  totalWeight (the whole company's weight):
    - share tiers need it (e.g. totalWeight 1000, Bronze 50% -> 500 weight units)
    - count-only configs don't: totalWeight = sum of the tiers (auto-derived)
    - mixed configs: count tiers take their share first, the remaining weight
      is split between the share tiers by their pct

  Rules (exact arithmetic, never silently wrong):
    - every tier yields at least 1 SIIR
    - every count is a whole number (no half SIIRs ever)
    - if a share cannot divide into whole SIIRs you get a hint with valid
      weightPer choices instead of a wrong register

Usage:
  python3 scripts/plans.py <config.json>            # table + plans array
  python3 scripts/plans.py <config.json> --emit     # plans array only
  python3 scripts/plans.py <config.json> --check    # validate only

Example config:

  {
    "totalWeight": 1000,
    "tiers": [
      {"label": "Bronze",   "pct": 50, "weightPer": 1},
      {"label": "Silver",   "pct": 30, "weightPer": 10},
      {"label": "Gold",     "pct": 15, "weightPer": 50},
      {"label": "Platinum", "pct": 5,  "weightPer": 25}
    ]
  }
"""
import argparse
import json
import sys
from fractions import Fraction


def _divisors(n):
    small, big = [], []
    d = 1
    while d * d <= n:
        if n % d == 0:
            small.append(d)
            if d * d != n:
                big.append(n // d)
        d += 1
    return small + big[::-1]


def _pos_num(v, what):
    # Decimals with <= 6 fractional digits stay exact; longer decimals snap to
    # the nearest simple fraction (33.333333333 -> 1/3), keeping the math exact.
    f = Fraction(v).limit_denominator(10 ** 6)
    if f <= 0:
        raise ValueError(f"{what}: must be > 0")
    return f


def derive(cfg):
    total = cfg.get("totalWeight")
    tiers = cfg.get("tiers") or []
    if not isinstance(tiers, list) or not tiers:
        raise ValueError("tiers: at least one tier required")

    share_specs, count_specs = [], []
    labels = set()
    for t in tiers:
        label = str(t.get("label") or "").strip()
        if not label:
            raise ValueError("tiers: every tier needs a label")
        if label in labels:
            raise ValueError(f"tier '{label}': duplicate label")
        labels.add(label)
        weight_per = _pos_num(t.get("weightPer"),
                              f"tier '{label}': weightPer")
        img = str(t.get("image") or "")
        has_count = t.get("count") is not None
        has_pct = t.get("pct") is not None or t.get("pctPermille") is not None
        if has_count and has_pct:
            raise ValueError(f"tier '{label}': give either count or pct, not both")
        if has_count:
            try:
                count = int(t["count"])
            except (TypeError, ValueError):
                raise ValueError(f"tier '{label}': count must be a positive integer")
            if count <= 0:
                raise ValueError(f"tier '{label}': count must be > 0")
            count_specs.append((label, count, weight_per, img))
        elif has_pct:
            p = t.get("pct", t.get("pctPermille"))
            if "pctPermille" in t and "pct" not in t:
                p = Fraction(p) / 10
            pct = _pos_num(p, f"tier '{label}': pct (0..100)")
            if pct > 100:
                raise ValueError(f"tier '{label}': pct must be <= 100")
            share_specs.append((label, pct, weight_per, img))
        else:
            raise ValueError(f"tier '{label}': give count or pct")

    if not share_specs:
        # count-only: totalWeight is derived
        derived_total = sum((c * w for _, c, w, _ in count_specs), Fraction(0))
        if total is not None and Fraction(total) != derived_total:
            raise ValueError(
                f"totalWeight {total} != derived total {derived_total} "
                f"(sum of count x weightPer). Drop totalWeight to auto-derive, "
                f"or fix the tiers so the sums match")
        total = derived_total
    else:
        if total is None:
            raise ValueError(
                "totalWeight is required for share tiers — the whole company's "
                "weight (e.g. 1000); count tiers are subtracted from it first")
        total = Fraction(total)
        if total <= 0:
            raise ValueError("totalWeight: must be > 0")

    # allocate: count tiers first, the rest split by pct among share tiers
    count_share = sum((c * w for _, c, w, _ in count_specs), Fraction(0))
    remaining = total - count_share
    pct_sum = sum((p for _, p, _, _ in share_specs), Fraction(0))
    if share_specs and pct_sum <= 0:
        raise ValueError("tiers: pct values must sum to > 0")

    plans = []
    for label, count, w, img in count_specs:
        plans.append((label, count, w, img))
    for label, pct, w, img in share_specs:
        alloc = remaining * pct / pct_sum
        c = alloc / w
        if c <= 0:
            raise ValueError(
                f"tier '{label}': count tiers already use the whole "
                f"totalWeight; raise totalWeight or lower counts")
        if c.denominator != 1:
            share_int = alloc
            hint = ""
            if share_int.denominator == 1 and w.denominator == 1:
                a = share_int.numerator
                valid = [d for d in _divisors(a) if a // d >= 1]
                hint = (f"  share is {a} weight units; weightPer {w} gives "
                        f"{c} SIIRs. Use weightPer from {valid[:8]}{'...' if len(valid) > 8 else ''} "
                        f"or describe this tier by count instead")
            raise ValueError(
                f"tier '{label}': {float(pct * 100 / pct_sum):.4f}% of {remaining} weight "
                f"units is {float(alloc)} and weightPer {w} gives "
                f"{float(c)} SIIRs — SIIRs are indivisible.{hint}")
        count = int(c)
        if count < 1:
            raise ValueError(f"tier '{label}': allocation {alloc} yields 0 SIIRs")
        plans.append((label, count, w, img))

    # smallest scale that makes every on-chain weight a whole number
    scale = 1
    for _, _, w, _ in plans:
        scale = scale * w.denominator // __import__("math").gcd(scale, w.denominator)
    if total.denominator != 1:
        scale = scale * total.denominator // __import__("math").gcd(scale, total.denominator)

    on_chain_total = total * scale
    out = [{
        "count": count,
        "weight": int(w * scale),
        "label": label,
        "issued": False,
        "image": img,
    } for label, count, w, img in plans]
    return out, plans, total, on_chain_total, scale


def main():
    ap = argparse.ArgumentParser(description=__doc__,
                                 formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("config", help="path to the plans config JSON")
    ap.add_argument("--emit", action="store_true",
                    help="print only the plans array (deployCompany payload)")
    ap.add_argument("--check", action="store_true",
                    help="validate only, print nothing")
    args = ap.parse_args()

    try:
        cfg = json.load(open(args.config))
    except (OSError, json.JSONDecodeError) as e:
        sys.exit(f"plans: cannot read {args.config}: {e}")

    try:
        out, plans, total, on_chain_total, scale = derive(cfg)
    except ValueError as e:
        sys.exit(f"plans: {e}")

    if args.check:
        return
    if args.emit:
        print(json.dumps(out))
        return
    pct_sum = None  # (kept for potential future output)
    print(f"totalWeight           {total}{'' if scale == 1 else f'  (x{scale} on-chain -> {on_chain_total})'}")
    print(f"{'label':<14}{'share':>12}{'weightPer':>11}{'count':>9}{'weight':>10}")
    for (label, count, w, _), p in zip(plans, cfg["tiers"]):
        share = count * w
        print(f"{label:<14}{str(share):>12}{str(w):>11}{count:>9}{int(w * scale):>10}")
    print(f"{'total':<14}{str(sum(c * w for _, c, w, _ in plans)):>12}"
          f"{'':>11}{sum(c for _, c, _, _ in plans):>9}{int(total * scale):>10}")
    print(json.dumps(out, indent=2))


if __name__ == "__main__":
    main()
