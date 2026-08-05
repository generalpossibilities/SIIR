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

const ADDR = "ce31c59c80895b5075efdacc9b0fe1d419937b81df0804f93fd5455d06a87f22::7b7c826d72140cb3640f1429bd813475e89874355104f3eb1c7f2a4aaf17a255";
const F = "0:4de04d6ac25902a1ddb4618d9b3b7f4e86dab3799b9469a41a9c5cb2af267818";
const H = "0:e313c6c09c8c3e06aa81ea56e65c41108e384ea04167684723c44750bac2c98b";

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
    };
    const py = JSON.parse(fs.readFileSync(process.argv[2], "utf8"));
    let fail = 0;
    for (const k of Object.keys(py)) {
        const a = JSON.stringify(out[k]), b = JSON.stringify(py[k]);
        if (a === b) console.log("ok  " + k);
        else { fail++; console.log("FAIL " + k + "\n  js: " + a + "\n  py: " + b); }
    }
    console.log("---", fail === 0 ? "ALL MATCH" : fail + " FAILURES");
}
main().catch((e) => { console.log("JS ERROR:", e); process.exit(1); });
