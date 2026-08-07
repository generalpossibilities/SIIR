"use strict";
/* app.js - single-page explorer on top of core.js.
   Hash routes:
     #/                                   -> marketplace landing (default)
     #/marketplace/<dapp>::<acct>        ask listings + buy offers
     #/search/<q>                        company search results
     #/factory/<dapp>::<acct>           company directory (search-reachable only)
     #/company/<dapp>::<acct>
     #/company/<addr>/register  #/company/<addr>/holders
     #/company/<addr>/siir/<id> #/company/<addr>/holder/<owner>
     #/company/<addr>/search?q=...
   Companies and their SIIRs are reachable only through search — the landing
   is the marketplace, and nothing is browsable without a query.
*/

const NET = "shellnet.ackinacki.org";
const main = document.getElementById("main");
const inp = document.getElementById("q");
const sug = document.getElementById("suggest");
const state = { ms: null, addr: null, fact: null, mkt: null, cur: "all" };

// token id -> [name, css class]
const TOKENS = { "1": ["NACKL", "nk"], "2": ["SHELL", "sh"], "3": ["eccUSDC", "us"] };
const tokenOf = (id) => TOKENS[String(id)] || null;

const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
})[c]);

function el(tag, cls, html) {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (html !== undefined) e.innerHTML = html;
    return e;
}

function fmtBig(v) {
    return v.toLocaleString ? v.toLocaleString("en-US") : String(v);
}

function tok(id) {
    const t = tokenOf(id);
    return t ? `<span class="tok ${t[1]}">${t[0]}</span>` : `<span class="tok ot">${esc(id)}</span>`;
}

function toast(msg) {
    const t = document.getElementById("toast");
    t.textContent = msg;
    t.classList.add("show");
    clearTimeout(t._h);
    t._h = setTimeout(() => t.classList.remove("show"), 1600);
}

// one click -> copy; hold ~0.6s -> reveal the full address
function escrowButton(addr, label) {
    const wrap = el("div", "escrow");
    wrap.innerHTML = `
      <div>
        <div class="lab">escrow account (marketplace contract)</div>
        <div class="addr mut" style="margin-top:2px">${esc(addr)}</div>
      </div>
      <button class="copy">${esc(label)}</button>
      <span class="hint">hold 0.6s to reveal · click to copy</span>
      <div class="full addr">${esc(addr)}</div>`;
    const b = wrap.querySelector(".copy");
    const full = wrap.querySelector(".full");
    let timer = null, held = false;
    b.addEventListener("pointerdown", () => {
        held = false;
        timer = setTimeout(() => { held = true; full.classList.add("show"); }, 600);
    });
    const clear = () => { clearTimeout(timer); };
    b.addEventListener("pointerup", clear);
    b.addEventListener("pointerleave", clear);
    b.addEventListener("pointercancel", clear);
    b.addEventListener("click", async () => {
        if (held) { held = false; return; }
        toast((await copyText(addr)) ? "escrow address copied" : "copy failed — select the address manually");
    });
    return wrap;
}

async function copyText(t) {
    try {
        await navigator.clipboard.writeText(t);
        return true;
    } catch {
        try {
            const ta = document.createElement("textarea");
            ta.value = t;
            ta.style.position = "fixed";
            ta.style.opacity = "0";
            document.body.appendChild(ta);
            ta.select();
            const ok = document.execCommand("copy");
            ta.remove();
            return ok;
        } catch { return false; }
    }
}

function logoCard(ms) {
    const b64 = (ms.state._logoImage || "").replace(/^data:[^,]+,/, "");
    if (!b64) return "";
    return `<img class="logo" src="data:image/svg+xml;base64,${b64}" alt="logo">`;
}

// ---------- The Seal: the official SIIR deed silhouette ----------
// Protocol-fixed trademark shape: scalloped stamp border, circular image
// window, banner with label + serial. The window fits ANY artwork whole
// (preserveAspectRatio="meet") — never cropped, never covered. Without a
// plan image the window renders a deterministic tier card (label palette).
const SEAL_TIERS = [
    ["bronze", "#cd7f32", "#7c4a1e"],
    ["silver", "#c0c0c0", "#5f6b76"],
    ["gold", "#ffd700", "#8a6d00"],
    ["platinum", "#e5e4e2", "#6b7280"],
    ["genesis", "#34d399", "#065f46"],
    ["diamond", "#22d3ee", "#155e75"],
];
const SEAL_TIER_FALLBACK = ["#9aa5b1", "#4b5563"];

function sealTier(label) {
    const l = (label || "").toLowerCase();
    for (const [name, c1, c2] of SEAL_TIERS) {
        if (l.includes(name)) return [c1, c2];
    }
    return SEAL_TIER_FALLBACK;
}

function sealInner(plan, label) {
    const img = (plan && plan.image) || "";
    if (img) {
        const b64 = img.replace(/^data:[^,]+,/, "");
        return `<image href="data:image/svg+xml;base64,${b64}" x="42" y="42" width="116" height="116" preserveAspectRatio="xMidYMid meet"/>`;
    }
    const [c1, c2] = sealTier(label);
    const mark = (label || "SIIR").toUpperCase().slice(0, 9);
    return `<defs><linearGradient id="tg" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="${c1}"/><stop offset="1" stop-color="${c2}"/></linearGradient></defs>
        <rect x="42" y="42" width="116" height="116" rx="10" fill="url(#tg)"/>
        <circle cx="100" cy="100" r="38" fill="none" stroke="#fff" stroke-width="5" opacity=".85"/>
        <path d="M100 78l8 16 18 3-13 12 3 18-16-8-16 8 3-18-13-12 18-3z" fill="#fff"/>
        <text x="100" y="148" font-size="11" fill="#fff" text-anchor="middle" font-family="monospace">${esc(mark)}</text>`;
}

function sealCard(ms, s, id, opts) {
    opts = opts || {};
    const plans = ms.plansAbi ? ms.plansAbi() : [];
    const plan = plans[Number(s.round)] || {};
    const label = esc(s.label || "");
    const width = opts.width || 230;
    const serial = opts.serial !== undefined ? opts.serial : `#${fmtBig(id)}`;
    return `<svg class="seal" viewBox="0 0 200 264" width="${width}" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="SIIR deed seal">
        <defs><radialGradient id="sbg" cx=".5" cy=".35" r=".8">
            <stop offset="0" stop-color="#2a3344"/><stop offset="1" stop-color="#101623"/></radialGradient></defs>
        <rect x="0" y="0" width="200" height="264" rx="18" fill="url(#sbg)"/>
        <circle cx="100" cy="108" r="86" fill="none" stroke="#7d8aa0" stroke-width="10" stroke-dasharray="3.2 4.6"/>
        <circle cx="100" cy="108" r="81" fill="none" stroke="#3d4a5e" stroke-width="1.5"/>
        <circle cx="100" cy="108" r="73" fill="#0b1220"/>
        <circle cx="100" cy="108" r="66" fill="none" stroke="#55647c" stroke-width="1"/>
        <clipPath id="sw"><circle cx="100" cy="108" r="62"/></clipPath>
        <g clip-path="url(#sw)">${sealInner(plan, s.label)}</g>
        <circle cx="100" cy="108" r="62" fill="none" stroke="#7d8aa0" stroke-width="2.5"/>
        <circle cx="100" cy="108" r="69" fill="none" stroke="#cdd6e4" stroke-width="1.5" stroke-dasharray="1 6"/>
        <rect x="28" y="200" width="144" height="44" rx="10" fill="#161d2b" stroke="#3d4a5e"/>
        <text x="100" y="218" font-size="12.5" fill="#e5e7eb" text-anchor="middle" font-family="sans-serif">${label}</text>
        <text x="100" y="236" font-size="9.5" fill="#8b96a8" text-anchor="middle" font-family="monospace">SIIR ${serial}</text>
    </svg>`;
}

async function loadCompany(addr) {
    if (state.ms && state.ms.address === addr && state.ms._decoded) return state.ms;
    state.ms = new MirrorState(addr, ABI_FIELDS, NET);
    await state.ms.load();
    state.addr = addr;
    return state.ms;
}

// ---------------- marketplace (landing) ----------------

async function loadMarketplace(addr) {
    if (state.mkt && state.mkt.address === addr && state.mkt._decoded) return state.mkt;
    state.mkt = new MarketplaceState(addr, NET);
    await state.mkt.load();
    return state.mkt;
}

function marketChips(on) {
    const opts = [["all", "all tokens"], ["1", "NACKL"], ["2", "SHELL"], ["3", "eccUSDC"]];
    return `<div class="chips">${opts.map(([id, lab]) =>
        `<button class="chip ${on === id ? "on" : ""}" data-cur="${id}">${lab}</button>`).join("")}</div>`;
}

function fmtTime(n) {
    const d = new Date(Number(n) * 1000);
    return d.toISOString ? d.toISOString().replace("T", " ").slice(0, 19) : String(n);
}

function listingRows(listings) {
    const rows = listings.map((l) => `
        <tr><td>#${esc(l.id)}</td>
            <td><a href="#/company/${l.company}">${esc(l.company.split("::")[1].slice(0, 10))}…</a></td>
            <td><a href="#/company/${l.company}/siir/${l.siirId}">#${esc(l.siirId)}</a></td>
            <td class="addr">${esc(l.seller)}</td>
            <td>${fmtBig(l.askPrice)} ${tok(l.currencyId)}</td>
            <td>${esc(fmtTime(l.listedAt))}</td>
            <td><span class="state ${l.active ? "open" : "closed"}">${l.active ? "open" : "closed"}</span></td></tr>`);
    return rows.join("");
}

function bidRows(bids) {
    const rows = bids.map((b) => `
        <tr><td>#${esc(b.id)}</td>
            <td class="addr">${esc(b.bidder)}</td>
            <td><a href="#/company/${b.company}">${esc(b.company.split("::")[1].slice(0, 10))}…</a></td>
            <td><a href="#/company/${b.company}/siir/${b.siirId}">#${esc(b.siirId)}</a></td>
            <td>${fmtBig(b.price)} ${tok(b.currencyId)}</td>
            <td>${b.validUntil === "0" ? "never" : esc(fmtTime(b.validUntil))}</td>
            <td><span class="state ${b.accepted ? "closed" : "open"}">${b.accepted ? "spent" : "open"}</span></td></tr>`);
    return rows.join("");
}

function escrowCard(addr) {
    return `
    <div class="card">
      <h2>escrow</h2>
      <p class="mut">all trades settle through the custodial escrow (the marketplace contract). one click copies
      the address; hold the button to reveal the full value.</p>
      ${escrowButton(addr, "copy escrow address").outerHTML}
    </div>`;
}

async function marketplacePage(addr, landing) {
    const m = await loadMarketplace(addr);
    if (!m._decoded) return error(m.error);
    const listings = m.listings();
    const bids = m.bids();
    const cur = state.cur;
    const fl = (cur === "all") ? listings : listings.filter((l) => String(l.currencyId) === cur);
    const fb = (cur === "all") ? bids : bids.filter((b) => String(b.currencyId) === cur);
    const openL = listings.filter((l) => l.active).length;
    const openB = bids.filter((b) => !b.accepted).length;
    const hero = landing ? `
    <div class="card hero">
      <div>
        <h1>SIIR on-chain market</h1>
        <p>A custodial escrow exchange for SIIR deeds on the Acki Nacki chain. NACKL, SHELL and eccUSDC
        pairs trade here. Every number on this page is decoded in your browser from the public mirror
        node — no server, no tvm-cli.</p>
        <div class="stats">
          <div class="stat"><div class="n">${openL}</div><div class="k">open listings</div></div>
          <div class="stat"><div class="n">${openB}</div><div class="k">open offers</div></div>
          <div class="stat"><div class="n">${esc(m.listingCount())}</div><div class="k">all listings</div></div>
        </div>
      </div>
    </div>` : `
    <div class="card">
      <h1>marketplace</h1>
      <p class="mut">custodial escrow exchange for SIIR deeds, decoded from the marketplace contract state.</p>
      <div class="grid">
        <div class="kv"><div class="k">listings / bids</div><div class="v">${esc(m.listingCount())} / ${esc(m.bidCount())}</div></div>
        <div class="kv"><div class="k">factory</div><div class="v addr">${esc(m.factoryAddr())}</div></div>
      </div>
    </div>`;
    const chips = `<div class="card" style="padding:14px 22px"><h2>tokens</h2>${marketChips(cur)}
      <p class="note">filter listings and offers by trading token. prices are in the token the pair is priced in.</p></div>`;
    const lt = fl.filter((l) => l.active);
    const bt = fb.filter((b) => !b.accepted);
    return hero + escrowCard(addr) + chips + `
    <div class="card"><h2>ask listings · ${lt.length} open${cur !== "all" ? " · " + TOKENS[cur][0] : ""}</h2>
      ${lt.length ? `<table><thead><tr><th>id</th><th>company</th><th>deed</th><th>seller</th><th>ask</th><th>listed (utc)</th><th>state</th></tr></thead>
        <tbody>${listingRows(lt)}</tbody></table>`
        : `<div class="empty">no open listings${cur !== "all" ? " in " + TOKENS[cur][0] : ""} — the full ledger has ${fl.length}.</div>`}</div>
    <div class="card"><h2>buy offers · ${bt.length} open${cur !== "all" ? " · " + TOKENS[cur][0] : ""}</h2>
      ${bt.length ? `<table><thead><tr><th>id</th><th>bidder</th><th>company</th><th>deed</th><th>price</th><th>valid until</th><th>state</th></tr></thead>
        <tbody>${bidRows(bt)}</tbody></table>`
        : `<div class="empty">no open offers${cur !== "all" ? " in " + TOKENS[cur][0] : ""}.</div>`}</div>`;
}

// ---------------- company pages ----------------

async function companyPage(ms, tabData) {
    const c = ms.companyInfo();
    const plans = ms.plansAbi();
    const div = ms.dividends();
    const content = ms.contentInfo();
    let fp = "…";
    try { fp = await ms.charterFingerprint(); } catch {}
    const tabs = [
        ["", "overview"],
        ["/register", "SIIR register (" + c.issuedCount + ")"],
        ["/holders", "holders"],
    ];
    const tabsHtml = `<div class="tabs">${
        tabs.map(([p, t]) => `<a href="#/company/${ms.address}${p}">${t}</a>`).join("")
    }</div>`;
    let body = "";
    if (tabData === "register") {
        body = registerSection(ms);
    } else if (tabData === "holders") {
        body = holdersSection(ms);
    } else {
        body = overviewSection(ms, c, plans, div, content, fp);
    }
    return `
    <div class="card">
      ${logoCard(ms)}
      <h1>${esc(c.name)}</h1>
      <div class="mut">${esc(c.description)}</div>
      ${tabsHtml}
    </div>
    ${body}`;
}

function overviewSection(ms, c, plans, div, content, fp) {
    const kvs = [
        ["founder", c.founder],
        ["factory", c.factory],
        ["issuance model", c.issuanceModel],
        ["total weight", c.totalWeight],
        ["issued", c.issuedCount],
        ["dividend count", c.dividendCount],
        ["next id", c.nextId],
        ["website", c.website],
        ["metadata", c.metadataUri],
    ];
    const grid = `<div class="grid">${
        kvs.map(([k, v]) => `<div class="kv"><div class="k">${esc(k)}</div><div class="v addr">${esc(v)}</div></div>`).join("")
    }</div>`;
    const divsTable = `<table><tbody><tr><th>currency</th><th>index</th><th>deposited</th></tr>${
        div.ids.map((id, i) => `<tr><td>${tok(id)}</td><td>${fmtBig(div.indices[i])}</td><td>${fmtBig(div.deposits[i])}</td></tr>`).join("")
    }</tbody></table>`;
    const plansTable = `<table><tbody><tr><th>plan</th><th>count</th><th>weight</th><th>issued</th></tr>${
        plans.map((p) => `<tr><td>${esc(p.label)}</td><td>${esc(p.count)}</td><td>${esc(p.weight)}</td><td>${p.issued ? "yes" : "no"}</td></tr>`).join("")
    }</tbody></table>`;
    const ch = ms.charter();
    const g = ms.state || {};
    const rules = {0: "treasury → founder", 1: "charity", 2: "DAO", 3: "burn"};
    const govCard = `<div class="card"><h2>governance &amp; dissolution</h2>
        <div class="kv"><div class="k">mode</div><div class="v">${g._governanceEnabled ? "holder vote" : "founder-only"}</div></div>
        <div class="kv"><div class="k">dissolution quorum</div><div class="v">${g._quorumPermille != null ? g._quorumPermille + "‰" : "—"}</div></div>
        <div class="kv"><div class="k">dissolve votes</div><div class="v">${fmtBig(g._dissolveVotes || 0)} weight</div></div>
        <div class="kv"><div class="k">status</div><div class="v">${g._dissolved ? "DISSOLVED" : "operating"}</div></div>
        <div class="kv"><div class="k">unclaimed rule</div><div class="v">${rules[g._dissolutionRule] || "—"}</div></div>
        <div class="kv"><div class="k">final deposit / finalized</div><div class="v">${g._finalDeposited ? "yes" : "no"} / ${g._finalized ? "yes" : "no"}</div></div>
    </div>`;
    return `<div class="card"><h2>company</h2>${grid}</div>
            <div class="card"><h2>dividends</h2>${divsTable}</div>
            <div class="card"><h2>plans</h2>${plansTable}</div>
            ${govCard}
            <div class="card"><h2>content</h2>
               <div class="kv"><div class="k">logo / deed / ui</div>
               <div class="v">${esc(content.logoSize)} / ${esc(content.siirImageSize)} / ${esc(content.uiSize)} bytes</div></div>
            </div>
            <div class="card"><h2>charter</h2>
               <div class="pre">${esc(ch.charter)}</div>
               <p class="mut">ratified: ${ch.ratified ? "yes" : "no"}</p>
               <p class="mut addr">fingerprint ${esc(fp)}</p>
            </div>`;
}

function registerSection(ms) {
    const info = ms.companyInfo();
    const segs = ms.segments();
    const ovs = ms.overrides();
    const ovKeys = Object.keys(ovs).sort((a, b) => BigInt(a) > BigInt(b) ? 1 : -1);
    const rows = segs.map((sg) => {
        const pid = ms._planOf(sg.start);
        const p = pid === null ? null : ms._plansRaw()[Number(pid)];
        const w = p ? p[1] : 0n;
        const label = p ? (p[2] || "") : "";
        const n = sg.end - sg.start + 1n;
        return `<tr><td><a href="#/company/${ms.address}/siir/${sg.start}">${fmtBig(sg.start)}</a> – ${fmtBig(sg.end)}</td>
                <td>${fmtBig(w)}</td>
                <td><a class="addr" href="#/company/${ms.address}/holder/${encodeURIComponent(sg.owner)}">${esc(sg.owner)}</a></td>
                <td>${pid === null ? "" : String(pid)}</td>
                <td>${esc(label)}</td>
                <td>${fmtBig(n)}</td></tr>`;
    }).join("");
    const ovRows = ovKeys.map((k) => {
        const o = ovs[k];
        const s = ms.siir(k);
        if (!s) return "";
        return `<tr><td><a href="#/company/${ms.address}/siir/${k}">${fmtBig(BigInt(k))}</a></td>
                <td>${esc(s.weight)}</td>
                <td><a class="addr" href="#/company/${ms.address}/holder/${encodeURIComponent(s.owner)}">${esc(s.owner)}</a></td>
                <td>${esc(s.round)}</td>
                <td>${esc(o[0] || "")}</td>
                <td>1</td></tr>`;
    }).join("");
    return `<div class="card"><h2>registry (${fmtBig(BigInt(info.issuedCount))} SIIRs)</h2>
            <table><tbody><tr><th>range</th><th>weight</th><th>owner</th><th>round</th><th>label</th><th>size</th></tr>${rows}${ovRows}</tbody></table>
            <p class="mut">ownership lives in compact ranges; rows with custom labels are per-id overrides.</p></div>`;
}

function holdersSection(ms) {
    const h = {};
    for (const s of ms.segments()) {
        const pid = ms._planOf(s.start);
        const w = pid === null ? 0n : ms._plansRaw()[Number(pid)][1];
        const n = s.end - s.start + 1n;
        if (!h[s.owner]) h[s.owner] = { count: 0n, weight: 0n };
        h[s.owner].count += n;
        h[s.owner].weight += w * n;
    }
    const rows = Object.keys(h).map((o) => `<tr><td><a class="addr" href="#/company/${ms.address}/holder/${encodeURIComponent(o)}">${esc(o)}</a></td>
        <td>${fmtBig(h[o].count)}</td><td>${fmtBig(h[o].weight)}</td></tr>`).join("");
    return `<div class="card"><h2>holders (${Object.keys(h).length})</h2>
            <table><tbody><tr><th>owner</th><th>siirs</th><th>weight</th></tr>${rows}</tbody></table></div>`;
}

async function siirPage(addr, id) {
    const ms = await loadCompany(addr);
    if (!ms._decoded) return errCard(ms.error);
    const s = ms.siir(id);
    if (!s) return error("SIIR #" + esc(id) + " not found.");
    const [cur, amt] = ms.claimable(id);
    const hist = ms.history(id);
    let fp = "…";
    try { fp = await ms.fingerprint(id); } catch {}
    const rows = cur.map((c, i) => `<tr><td>${tok(c)}</td><td>${amt[i]}</td></tr>`).join("");
    const histRows = hist.map((h) => `<tr><td>${h.timestamp}</td><td class="addr">${esc(h.from)}</td><td class="addr">${esc(h.to)}</td></tr>`).join("");
    return `<div class="card"><h1>SIIR #${esc(id)}</h1>
            ${sealCard(ms, s, id)}
            <div class="grid">
            <div class="kv"><div class="k">weight</div><div class="v">${esc(s.weight)}</div></div>
            <div class="kv"><div class="k">round</div><div class="v">${esc(s.round)}</div></div>
            <div class="kv"><div class="k">created</div><div class="v">${esc(s.createdAt)}</div></div>
            </div>
            <p><b>label</b> ${esc(s.label)}<br><b>metadata</b> ${esc(s.metadataUri)}</p>
            <p><b>fingerprint</b> <code>${esc(fp)}</code></p>
            </div>
            <div class="card"><h2>claimable</h2><table><tbody><tr><th>currency</th><th>pending</th></tr>${rows}</tbody></table></div>
            <div class="card"><h2>provenance</h2><table><tbody><tr><th>time</th><th>from</th><th>to</th></tr>${histRows}</tbody></table></div>`;
}

async function holderPage(addr, owner) {
    const ms = await loadCompany(addr);
    if (!ms._decoded) return error(ms.error);
    const ranges = ms.idsOf(owner);
    if (ranges.length === 0) return error("No SIIRs for " + esc(owner));
    const total = ms.balanceOf(owner);
    const [cur, amt] = ms.claimableOf(owner);
    let rows;
    if (total <= 200n) {
        const ids = [];
        for (const r of ranges) {
            for (let i = r.start; i <= r.end; i++) ids.push(i);
        }
        rows = ids.map((id) => {
            const s = ms.siir(id);
            return `<tr><td><a href="#/company/${addr}/siir/${id}">${fmtBig(id)}</a></td><td>${esc(s.weight)}</td><td>${esc(s.round)}</td></tr>`;
        }).join("");
    } else {
        rows = ranges.map((r) => {
            const s = ms.siir(r.start);
            const n = r.end - r.start + 1n;
            return `<tr><td><a href="#/company/${addr}/siir/${r.start}">${fmtBig(r.start)}</a> – ${fmtBig(r.end)}</td>
                <td>${esc(s.weight)}</td><td>${esc(s.round)}</td><td>${fmtBig(n)}</td></tr>`;
        }).join("");
    }
    const claimRows = cur.map((c, i) => `<tr><td>${tok(c)}</td><td>${amt[i]}</td></tr>`).join("");
    return `<div class="card"><h1>holder</h1><p class="addr">${esc(owner)}</p>
            <p class="mut">${fmtBig(total)} SIIRs in ${ranges.length} range(s)</p></div>
            <div class="card"><h2>owned</h2><table><tbody><tr><th>id / range</th><th>weight</th><th>round</th>${total <= 200n ? "" : "<th>size</th>"}</tr>${rows}</tbody></table></div>
            <div class="card"><h2>total claimable</h2><table><tbody><tr><th>currency</th><th>pending</th></tr>${claimRows}</tbody></table></div>`;
}

// ---------------- factory / search ----------------

async function loadFactory(addr) {
    if (state.fact && state.fact.address === addr && state.fact._decoded) return state.fact;
    state.fact = new FactoryState(addr, NET);
    await state.fact.load();
    return state.fact;
}

const ADDR_RE = /^[0-9a-f]{64}::[0-9a-f]{64}$/;

// search the registry by name or address; results only exist after a query
async function searchPage(q) {
    const query = q.trim().toLowerCase();
    if (ADDR_RE.test(q.trim())) {
        return `<div class="card"><h1>opening address</h1><p class="mut">looks like a contract address — opening the company page.</p></div>`;
    }
    const f = await loadFactory(FACTORY_ADDR);
    if (!f._decoded) return error(f.error);
    const companies = f.companies();
    const hits = companies.filter((c) =>
        c.name.toLowerCase().includes(query) || c.address.toLowerCase().includes(query));
    const rows = hits.map((c) => `
        <tr><td>${c.index}</td>
            <td><a href="#/company/${c.address}">${esc(c.name) || "(unnamed)"}</a></td>
            <td>${esc(c.issuanceModel === "1" ? "rounds" : "full-cap")}</td>
            <td><a class="addr" href="#/company/${c.address}">${esc(c.address)}</a></td></tr>`).join("");
    return `
    <div class="card">
      <h1>search</h1>
      <p class="mut">matches "${esc(q)}" against the factory registry (${esc(f.factoryInfo().count)} companies). SIIRs
      are only reachable through their company.</p>
    </div>
    <div class="card"><h2>results (${hits.length})</h2>
      ${hits.length ? `<table><tbody><tr><th>#</th><th>name</th><th>model</th><th>company (dapp::acct)</th></tr>${rows}</tbody></table>`
        : `<div class="empty">no company named or addressed "${esc(q)}". try a partial name.</div>`}
      <p class="note">direct address (dapp_id::account_id) also opens a company instantly — search bar or <a href="#/factory/${FACTORY_ADDR}">directory</a>.</p>
    </div>`;
}

async function factoryPage(addr) {
    const f = await loadFactory(addr);
    if (!f._decoded) return error(f.error);
    const info = f.factoryInfo();
    const companies = f.companies();
    const rows = companies.map((c) => `
        <tr data-name="${esc(c.name.toLowerCase())}"><td>${c.index}</td>
            <td><a href="#/company/${c.address}">${esc(c.name) || "(unnamed)"}</a></td>
            <td>${esc(c.issuanceModel === "1" ? "rounds" : "full-cap")}</td>
            <td><a class="addr" href="#/company/${c.address}">${esc(c.address)}</a></td></tr>`).join("");
    const html = `
    <div class="card">
      <h1>company directory</h1>
      <p class="mut">the registry, decoded from the factory contract. reachable here only because you asked for it.</p>
      <div class="kv"><div class="k">factory</div><div class="v addr">${esc(addr)}</div></div>
      <div class="kv"><div class="k">marketplace</div><div class="v addr"><a href="#/marketplace/${info.marketplace}">${esc(info.marketplace)}</a></div></div>
      <div class="kv"><div class="k">companies</div><div class="v">${esc(info.count)}</div></div>
      <p><input id="fsearch" placeholder="filter by company name…" spellcheck="false"></p>
    </div>
    <div class="card"><h2 id="fcount">registered (${companies.length})</h2>
      <table id="frows"><tbody><tr><th>#</th><th>name</th><th>model</th><th>company (dapp::acct)</th></tr>${rows}</tbody></table></div>
    ${companies.length ? "" : '<div class="err">no companies registered in this factory yet.</div>'}`;
    main.innerHTML = html;
    const box = document.getElementById("fsearch");
    if (!box) return;
    box.addEventListener("keyup", () => {
        const q = box.value.trim().toLowerCase();
        let shown = 0;
        document.querySelectorAll("#frows tr[data-name]").forEach((tr) => {
            const hit = !q || tr.getAttribute("data-name").includes(q);
            tr.style.display = hit ? "" : "none";
            if (hit) shown++;
        });
        const count = document.getElementById("fcount");
        if (count) count.textContent = "registered (" + shown + "/" + companies.length + (q ? ' matching "' + box.value + '"' : "") + ")";
    });
}

// ---------------- search suggestions ----------------

let suggestTimer = null;
inp.addEventListener("input", () => {
    clearTimeout(suggestTimer);
    suggestTimer = setTimeout(showSuggestions, 250);
});
inp.addEventListener("blur", () => setTimeout(() => { sug.style.display = "none"; }, 200));
inp.addEventListener("focus", () => { if (inp.value.trim()) showSuggestions(); });

async function showSuggestions() {
    const q = inp.value.trim();
    sug.style.display = "none";
    if (!q) return;
    const v = q.toLowerCase();
    if (ADDR_RE.test(q)) {
        sug.innerHTML = `<a href="#/company/${encodeURIComponent(q)}"><span class="s-n">open address</span><div class="s-a">${esc(q)}</div></a>`;
        sug.style.display = "block";
        return;
    }
    let f;
    try { f = await loadFactory(FACTORY_ADDR); } catch { return; }
    if (!f._decoded) return;
    const hits = f.companies().filter((c) =>
        c.name.toLowerCase().includes(v) || c.address.toLowerCase().includes(v)).slice(0, 8);
    if (!hits.length) {
        sug.innerHTML = `<div class="s-empty">no company matches "${esc(q)}"</div>`;
        sug.style.display = "block";
        return;
    }
    sug.innerHTML = hits.map((c) =>
        `<a href="#/company/${c.address}"><span class="s-n">${esc(c.name) || "(unnamed)"}</span><div class="s-a">${esc(c.address)}</div></a>`).join("") +
        `<a href="#/search/${encodeURIComponent(q)}" style="color:var(--acc)"><span class="s-n">all results for "${esc(q)}"</span></a>`;
    sug.style.display = "block";
}

// ---------------- routing ----------------

async function route() {
    const h = location.hash;
    sug.style.display = "none";
    try {
        if (h.startsWith("#/company/")) {
            const rest = h.slice("#/company/".length);
            const [addrFull, ...crumbs] = rest.split("/");
            const addr = decodeURIComponent(addrFull);
            if (crumbs.length === 0) {
                const ms = await loadCompany(addr);
                main.innerHTML = ms._decoded ? await companyPage(ms, "overview") : error(ms.error);
            } else if (crumbs[0] === "register" || crumbs[0] === "holders") {
                const ms = await loadCompany(addr);
                main.innerHTML = ms._decoded ? await companyPage(ms, crumbs[0]) : error(ms.error);
            } else if (crumbs[0] === "siir") {
                main.innerHTML = await siirPage(addr, crumbs[1]);
            } else if (crumbs[0] === "holder") {
                main.innerHTML = await holderPage(addr, decodeURIComponent(crumbs[1]));
            }
        } else if (h.startsWith("#/factory/")) {
            await factoryPage(decodeURIComponent(h.slice("#/factory/".length)));
        } else if (h.startsWith("#/marketplace/")) {
            state.cur = "all";
            main.innerHTML = await marketplacePage(decodeURIComponent(h.slice("#/marketplace/".length)), false);
        } else if (h.startsWith("#/search/")) {
            main.innerHTML = await searchPage(decodeURIComponent(h.slice("#/search/".length)));
        } else {
            // landing: the marketplace of the live factory
            state.cur = "all";
            const f = await loadFactory(FACTORY_ADDR);
            if (!f._decoded) {
                main.innerHTML = error(f.error);
                return;
            }
            const mkt = f.factoryInfo().marketplace;
            if (!mkt) {
                main.innerHTML = error("factory has no marketplace configured");
                return;
            }
            main.innerHTML = await marketplacePage(mkt, true);
        }
    } catch (e) {
        main.innerHTML = error((e && e.message) || String(e));
    }
}

function error(msg) {
    return `<div class="err">${esc(msg)}</div>`;
}

function goSearch() {
    const v = inp.value.trim();
    if (!v) return;
    if (ADDR_RE.test(v)) location.hash = "#/company/" + encodeURIComponent(v);
    else location.hash = "#/search/" + encodeURIComponent(v);
}

document.getElementById("go").addEventListener("click", goSearch);
inp.addEventListener("keydown", (e) => { if (e.key === "Enter") goSearch(); });
window.addEventListener("hashchange", route);
document.addEventListener("click", (e) => {
    const c = e.target.closest ? e.target.closest(".chip[data-cur]") : null;
    if (!c || state.cur === c.getAttribute("data-cur")) return;
    state.cur = c.getAttribute("data-cur");
    route();
});

const FACTORY_ADDR = "d0f0bb83c277e3de12da83c97a6cb1fb0b4bf2e616e788f13bf728dfd986a5ea::d0f0bb83c277e3de12da83c97a6cb1fb0b4bf2e616e788f13bf728dfd986a5ea";
const DEMO_ADDR = "d0f0bb83c277e3de12da83c97a6cb1fb0b4bf2e616e788f13bf728dfd986a5ea::a334e243be3f9e8b95814e06c2a718095f05803f6d9635e1dbdd501d37762303";
route();
