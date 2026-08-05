"use strict";
/* app.js - single-page explorer on top of core.js.
   Hash routes:
     #/company/<dapp>::<acct>
     #/company/<addr>/register  #/company/<addr>/holders
     #/company/<addr>/siir/<id> #/company/<addr>/holder/<owner>
     #/company/<addr>/search?q=...
*/

const NET = "shellnet.ackinacki.org";
const main = document.getElementById("main");
const inp = document.getElementById("addr");
const state = { ms: null, addr: null };

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
        } else if (h.startsWith("#/company/demo")) {
            location.hash = "#/company/" + DEMO_ADDR;
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

const DEMO_ADDR = "ce31c59c80895b5075efdacc9b0fe1d419937b81df0804f93fd5455d06a87f22::7b7c826d72140cb3640f1429bd813475e89874355104f3eb1c7f2a4aaf17a255";
route();