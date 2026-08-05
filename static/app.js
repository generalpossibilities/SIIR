"use strict";
/* app.js - single-page explorer on top of core.js.
   Hash routes:
     #/                                  -> factory directory (default)
     #/factory/<dapp>::<acct>           company directory, searchable by name
     #/marketplace/<dapp>::<acct>       ask listings + buy offers
     #/company/<dapp>::<acct>
     #/company/<addr>/register  #/company/<addr>/holders
     #/company/<addr>/siir/<id> #/company/<addr>/holder/<owner>
     #/company/<addr>/search?q=...
*/

const NET = "shellnet.ackinacki.org";
const main = document.getElementById("main");
const inp = document.getElementById("addr");
const state = { ms: null, addr: null, fact: null, mkt: null };

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

function logoCard(ms) {
    const b64 = (ms.state._logoImage || "").replace(/^data:[^,]+,/, "");
    if (!b64) return "";
    return `<img class="logo" src="data:image/svg+xml;base64,${b64}" alt="logo">`;
}

async function loadCompany(addr) {
    if (state.ms && state.ms.address === addr && state.ms._decoded) return state.ms;
    state.ms = new MirrorState(addr, ABI_FIELDS, NET);
    await state.ms.load();
    state.addr = addr;
    inp.value = addr;
    return state.ms;
}

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
    const divsTable = `<table><tr><th>currency</th><th>index</th><th>deposited</th></tr>${
        div.ids.map((id, i) => `<tr><td>${esc(id)}</td><td>${fmtBig(div.indices[i])}</td><td>${fmtBig(div.deposits[i])}</td></tr>`).join("")
    }</table>`;
    const plansTable = `<table><tr><th>plan</th><th>count</th><th>weight</th><th>issued</th></tr>${
        plans.map((p) => `<tr><td>${esc(p.label)}</td><td>${esc(p.count)}</td><td>${esc(p.weight)}</td><td>${p.issued ? "yes" : "no"}</td></tr>`).join("")
    }</table>`;
    const ch = ms.charter();
    return `<div class="card"><h2>company</h2>${grid}</div>
            <div class="card"><h2>dividends</h2>${divsTable}</div>
            <div class="card"><h2>plans</h2>${plansTable}</div>
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
    const siirs = ms.siirs();
    const keys = Object.keys(siirs).sort((a, b) => Number(a) - Number(b));
    const rows = keys.map((k) => {
        const s = siirs[k];
        return `<tr><td><a href="#/company/${ms.address}/siir/${k}">${k}</a></td>
                <td>${esc(s[0])}</td>
                <td><a class="addr" href="#/company/${ms.address}/holder/${encodeURIComponent(s[1])}">${esc(s[1])}</a></td>
                <td>${esc(s[2])}</td><td>${esc(s[3])}</td><td>${esc(s[4] || "")}</td></tr>`;
    }).join("");
    return `<div class="card"><h2>registry (${keys.length})</h2>
            <table><tr><th>id</th><th>weight</th><th>owner</th><th>created</th><th>round</th><th>label</th></tr>${rows}</table></div>`;
}

function holdersSection(ms) {
    const siirs = ms.siirs();
    const h = {};
    for (const k in siirs) {
        const s = siirs[k];
        if (!h[s[1]]) h[s[1]] = { count: 0, weight: 0n };
        h[s[1]].count += 1;
        h[s[1]].weight += s[0];
    }
    const rows = Object.keys(h).map((o) => `<tr><td><a class="addr" href="#/company/${ms.address}/holder/${encodeURIComponent(o)}">${esc(o)}</a></td>
        <td>${h[o].count}</td><td>${fmtBig(h[o].weight)}</td></tr>`).join("");
    return `<div class="card"><h2>holders (${Object.keys(h).length})</h2>
            <table><tr><th>owner</th><th>siirs</th><th>weight</th></tr>${rows}</table></div>`;
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
    const rows = cur.map((c, i) => `<tr><td>${esc(c)}</td><td>${amt[i]}</td></tr>`).join("");
    const histRows = hist.map((h) => `<tr><td>${h.timestamp}</td><td class="addr">${esc(h.from)}</td><td class="addr">${esc(h.to)}</td></tr>`).join("");
    return `<div class="card"><h1>SIIR #${esc(id)}</h1>
            <div class="grid">
            <div class="kv"><div class="k">weight</div><div class="v">${esc(s.weight)}</div></div>
            <div class="kv"><div class="k">round</div><div class="v">${esc(s.round)}</div></div>
            <div class="kv"><div class="k">created</div><div class="v">${esc(s.createdAt)}</div></div>
            </div>
            <p><b>label</b> ${esc(s.label)}<br><b>metadata</b> ${esc(s.metadataUri)}</p>
            <p><b>fingerprint</b> <code>${esc(fp)}</code></p>
            </div>
            <div class="card"><h2>claimable</h2><table><tr><th>currency</th><th>pending</th></tr>${rows}</table></div>
            <div class="card"><h2>provenance</h2><table><tr><th>time</th><th>from</th><th>to</th></tr>${histRows}</table></div>`;
}

async function holderPage(addr, owner) {
    const ms = await loadCompany(addr);
    if (!ms._decoded) return error(ms.error);
    const ids = ms.idsOf(owner);
    if (ids.length === 0) return error("No SIIRs for " + esc(owner));
    const [cur, amt] = ms.claimableOf(owner);
    const rows = ids.map((id) => {
        const s = ms.siir(id);
        return `<tr><td><a href="#/company/${addr}/siir/${id}">${id}</a></td><td>${esc(s.weight)}</td><td>${esc(s.round)}</td></tr>`;
    }).join("");
    const claimRows = cur.map((c, i) => `<tr><td>${esc(c)}</td><td>${amt[i]}</td></tr>`).join("");
    return `<div class="card"><h1>holder</h1><p class="addr">${esc(owner)}</p></div>
            <div class="card"><h2>owned (${ids.length})</h2><table><tr><th>id</th><th>weight</th><th>round</th></tr>${rows}</table></div>
            <div class="card"><h2>total claimable</h2><table><tr><th>currency</th><th>pending</th></tr>${claimRows}</table></div>`;
}

async function factoryPage(addr) {
    if (state.fact && state.fact.address === addr && state.fact._decoded) {
        // reload once per navigation; stale cache is fine for a demo
    } else {
        state.fact = new FactoryState(addr, NET);
        await state.fact.load();
    }
    const f = state.fact;
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
      <p class="mut">decoded from the factory's on-chain registry (map index → company). Search is case-insensitive — "njd" finds "NJD Ventures".</p>
      <div class="kv"><div class="k">factory</div><div class="v addr">${esc(addr)}</div></div>
      <div class="kv"><div class="k">marketplace</div><div class="v addr"><a href="#/marketplace/${info.marketplace}">${esc(info.marketplace)}</a></div></div>
      <div class="kv"><div class="k">companies</div><div class="v">${esc(info.count)}</div></div>
      <p><input id="fsearch" placeholder="filter by company name…" spellcheck="false"></p>
    </div>
    <div class="card"><h2 id="fcount">registered (${companies.length})</h2>
      <table id="frows"><tr><th>#</th><th>name</th><th>model</th><th>company (dapp::acct)</th></tr>${rows}</table></div>
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

async function marketplacePage(addr) {
    if (!(state.mkt && state.mkt.address === addr && state.mkt._decoded)) {
        state.mkt = new MarketplaceState(addr, NET);
        await state.mkt.load();
    }
    const m = state.mkt;
    if (!m._decoded) return error(m.error);
    const listings = m.listings();
    const bids = m.bids();
    const cur = (id) => ({ "2": "SHELL", "3": "eccUSDC", "1": "NACKL" })[String(id)] || String(id);
    const t = (n) => { const d = new Date(Number(n) * 1000); return d.toISOString ? d.toISOString().replace("T", " ").slice(0, 19) : n; };
    const lrows = listings.map((l) => `
        <tr><td>${esc(l.id)}</td>
            <td><a href="#/company/${l.company}">${esc(l.company.split("::")[1].slice(0, 10))}…</a></td>
            <td><a href="#/company/${l.company}/siir/${l.siirId}">#${esc(l.siirId)}</a></td>
            <td class="addr">${esc(l.seller)}</td>
            <td>${fmtBig(l.askPrice)} ${esc(cur(l.currencyId))}</td>
            <td>${esc(t(l.listedAt))}</td>
            <td>${l.active ? "open" : "closed"}</td></tr>`).join("");
    const brows = bids.map((b) => `
        <tr><td>${esc(b.id)}</td>
            <td class="addr">${esc(b.bidder)}</td>
            <td><a href="#/company/${b.company}/siir/${b.siirId}">#${esc(b.siirId)}</a></td>
            <td>${fmtBig(b.price)} ${esc(cur(b.currencyId))}</td>
            <td>${esc(b.validUntil === "0" ? "never" : b.validUntil)}</td>
            <td>${b.accepted ? "spent" : "open"}</td></tr>`).join("");
    return `
    <div class="card">
      <h1>marketplace</h1>
      <p class="mut">custodial escrow exchange for SIIR deeds, decoded from the marketplace contract state.</p>
      <div class="kv"><div class="k">marketplace</div><div class="v addr">${esc(addr)}</div></div>
      <div class="kv"><div class="k">listings / bids</div><div class="v">${esc(m.listingCount())} / ${esc(m.bidCount())}</div></div>
    </div>
    <div class="card"><h2>ask listings (${listings.filter((l) => l.active).length} open)</h2>
      <table><tr><th>id</th><th>company</th><th>deed</th><th>seller</th><th>ask</th><th>listed (utc)</th><th>state</th></tr>${lrows}</table></div>
    <div class="card"><h2>buy offers (${bids.filter((b) => !b.accepted).length} open)</h2>
      <table><tr><th>id</th><th>bidder</th><th>deed</th><th>price</th><th>valid until</th><th>state</th></tr>${brows}</table></div>`;
}

async function route() {
    const h = location.hash;
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
            main.innerHTML = await marketplacePage(decodeURIComponent(h.slice("#/marketplace/".length)));
        } else if (h === "" || h === "#/" || h.startsWith("#/company/demo")) {
            location.hash = "#/factory/" + FACTORY_ADDR;
        }
    } catch (e) {
        main.innerHTML = error((e && e.message) || String(e));
    }
}

function error(msg) {
    return `<div class="err">${esc(msg)}</div>`;
}

document.getElementById("go").addEventListener("click", () => {
    const v = inp.value.trim();
    if (v) location.hash = "#/company/" + encodeURIComponent(v);
});
inp.addEventListener("keydown", (e) => { if (e.key === "Enter") document.getElementById("go").click(); });
window.addEventListener("hashchange", route);

const FACTORY_ADDR = "e8589bfa0c19221b3f433e656147395c25c573ecce6582cc07294058a7602ce8::e8589bfa0c19221b3f433e656147395c25c573ecce6582cc07294058a7602ce8";
const DEMO_ADDR = "e8589bfa0c19221b3f433e656147395c25c573ecce6582cc07294058a7602ce8::e41675736c22180617c668583100209ea6ade8e2ecd45ae621881c019fd0434b";
route();