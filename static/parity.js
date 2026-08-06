"use strict";
/* parity.js - verify the JS decoder against Python (scripts/mirror.py).
   Run:  node parity.js <py_ground.json>
   where py_ground.json was produced by dumping mirror.py getters to JSON
   (see the python command in the docs/TODO.md item 2 notes).
   Needs: node >= 18 with fetch; the ABI fields live in fields.js. */
const fs = require("fs");
global.atob = (s) => Buffer.from(s, "base64").toString("binary");
const XP = require("./core.js");
const ABI = { fields: require("./fields.js").ABI_FIELDS };

const ADDR = process.env.PARITY_ADDR || "ed4358e13062277804377fac76d860b30ae9190c66b68bb6daf3b26bb491007f::fba5b22395a75f9c8dae21068d09e3fdbbf98ee6d6325acf25136b3a085f7fef";
const F = process.env.PARITY_FOUNDER || "0:c4d1738754335536ec61d32bdf872bffd1f9a9a114c4f2bc8328f0726ed275cb";
const H = process.env.PARITY_HOLDER || "0:0f077a5e0f4630b9696db80a77b357ab576773d0a278590a22408d1c89366caa";

async function main() {
    const ms = new XP.MirrorState(ADDR, ABI.fields, process.env.NET || "shellnet.ackinacki.org");
    await ms.load();
    if (!ms._decoded) { console.log("LOAD ERROR:", ms.error); process.exit(1); }
    const out = {
        company_info: ms.companyInfo(),
        div_currencies: ms._divCurrencies().map(String),
        plans: ms.plansAbi(),
        history1: ms.history(1),
        claimable1: ms.claimable(1),
        claimable_of_founder: ms.claimableOf(F),
        siir1: ms.siir(1),
        siir100: ms.siir(100),
        balance_of: ms.idsOf(F).length,
        content_info: ms.contentInfo(),
        charter: ms.charter().charter.slice(0, 60),
        charter_ratified: ms.charter().ratified,
        charter_fp: await ms.charterFingerprint(),
        fp1: await ms.fingerprint(1),
        raw_len_logo: (ms.state._logoImage || "").length,
        ids_of_f: ms.idsOf(F).slice(0, 5),
        history100: ms.history(100),
        holder_claimable: ms.claimableOf(H),
        co_founders: ms.coFounders(),
        founder_rights_holder: ms.founderRights(H, "0x0000000000000000000000000000000000000000000000000000000000000000"),
        founder_rights_original: ms.founderRights(F, "0x0000000000000000000000000000000000000000000000000000000000000000"),
    };
    const py = JSON.parse(fs.readFileSync(process.argv[2], "utf8"));
    // normalize: BigInt -> string, and sort object keys recursively, so the
    // comparison is immune to key order and BigInt serialization differences
    const norm = (v) => {
        if (typeof v === "bigint") return String(v);
        if (Array.isArray(v)) return v.map(norm);
        if (v && typeof v === "object") {
            const o = {};
            for (const k of Object.keys(v).sort()) o[k] = norm(v[k]);
            return o;
        }
        return v;
    };
    let fail = 0;
    for (const k of Object.keys(py)) {
        const a = JSON.stringify(norm(out[k])), b = JSON.stringify(norm(py[k]));
        if (a === b) console.log("ok  " + k);
        else { fail++; console.log("FAIL " + k + "\n  js: " + a + "\n  py: " + b); }
    }
    console.log("---", fail === 0 ? "ALL MATCH" : fail + " FAILURES");
}
main().catch((e) => { console.log("JS ERROR:", e); process.exit(1); });
