#!/usr/bin/env node
// cdp_dump.mjs <url> <marker-regex> <outfile> — drive headless chrome via CDP,
// poll until <marker-regex> matches the live DOM (or 120s), then write the
// serialized DOM to <outfile>. exit 0 on match, 1 on timeout.
import { spawn } from "node:child_process";
import { writeFileSync } from "node:fs";

const url = process.argv[2];
const marker = new RegExp(process.argv[3]);
const outfile = process.argv[4];

const chrome = spawn("google-chrome", [
  "--headless=new", "--disable-gpu", "--no-sandbox",
  "--remote-debugging-port=0", "--user-data-dir=/tmp/opencode/cdp-" + process.pid,
  "about:blank",
], { stdio: ["ignore", "pipe", "pipe"] });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const deadline = Date.now() + 120000;

let nextId = 1;
const pending = new Map();
let ws = null;
const send = (method, params = {}, sessionId) => new Promise((res, rej) => {
  const id = nextId++;
  pending.set(id, { res, rej });
  const msg = { id, method, params };
  if (sessionId) msg.sessionId = sessionId;
  ws.send(JSON.stringify(msg));
});

try {
  let browserWsUrl = "";
  for (;;) {
    const line = await new Promise((res) => {
      const t = setTimeout(() => res(""), 2000);
      chrome.stderr.once("data", (d) => { clearTimeout(t); res(d.toString()); });
    });
    const m = /ws:\/\/[^\s]+/.exec(line);
    if (m) { browserWsUrl = m[0]; break; }
    if (Date.now() > deadline) throw new Error("chrome never reported devtools url");
  }
  ws = new WebSocket(browserWsUrl);
  await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
  ws.onmessage = (e) => {
    const msg = JSON.parse(e.data);
    if (msg.id && pending.has(msg.id)) {
      const { res, rej } = pending.get(msg.id);
      pending.delete(msg.id);
      msg.error ? rej(new Error(msg.error.message)) : res(msg.result);
    }
  };

  // attach to the page target
  let targetId = null;
  for (let i = 0; i < 30 && !targetId; i++) {
    const { targetInfos } = await send("Target.getTargets").catch(() => ({ targetInfos: [] }));
    const page = targetInfos.find((t) => t.type === "page");
    if (page) targetId = page.targetId;
    else await sleep(500);
  }
  if (!targetId) throw new Error("no page target");
  const { sessionId } = await send("Target.attachToTarget", { targetId, flatten: true });

  await send("Page.enable", {}, sessionId);
  await send("Runtime.enable", {}, sessionId);
  await send("Page.navigate", { url }, sessionId);

  let dom = "";
  let matched = false;
  for (let i = 0; i < 120; i++) {
    await sleep(1000);
    const r = await send("Runtime.evaluate", {
      expression: "document.documentElement.outerHTML",
      returnByValue: true,
    }, sessionId).catch(() => null);
    dom = r && r.result && r.result.value ? r.result.value : dom;
    if (marker.test(dom)) { matched = true; break; }
  }
  if (dom) writeFileSync(outfile, dom);
  process.exit(matched ? 0 : 1);
} finally {
  try { ws && ws.close(); } catch {}
  chrome.kill("SIGKILL");
}