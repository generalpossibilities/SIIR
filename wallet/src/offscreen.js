import { TvmClient } from "@tvmsdk/core";
import { libWeb, libWebSetup } from "../wasm/libweb-wrapper.mjs";

let client = null;
let ready = false;
let initPromise = null;
const pending = new Map();

async function init() {
  if (!initPromise) {
    initPromise = (async () => {
      libWebSetup({ binaryURL: "./tvmsdk.wasm" });
      TvmClient.useBinaryLibrary(libWeb);
      client = new TvmClient();
      await client.client.version();
      ready = true;
      return { version: await client.client.version() };
    })();
  }
  return initPromise;
}

function whenReady() {
  return ready ? Promise.resolve() : init();
}

function respond(id, resp) {
  chrome.runtime.sendMessage({ target: "offscreen", id, ...resp }).catch(() => {});
}

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (!msg || msg.target !== "offscreen") return false;
  if (msg.method === "ping") {
    sendResponse({ ok: true, ready });
    return true;
  }
  const { id, method, params } = msg;
  if (method === "init") {
    init()
      .then((result) => respond(id, { ok: true, result }))
      .catch((e) => respond(id, { ok: false, error: String((e && e.message) || e) }));
    return true;
  }
  handle(method, params, id);
  return true;
});

async function handle(method, params, id) {
  try {
    await whenReady();
    const [mod, fn] = method.split(".");
    const api = client[mod];
    if (!api || typeof api[fn] !== "function") {
      respond(id, { ok: false, error: `unknown sdk call: ${method}` });
      return;
    }
    if (fn.endsWith("_sync")) {
      respond(id, { ok: true, result: api[fn](params || {}) });
      return;
    }
    const result = await api[fn](params || {});
    respond(id, { ok: true, result });
  } catch (e) {
    const err = e && typeof e === "object"
      ? String(e.message || JSON.stringify(e))
      : String(e);
    respond(id, { ok: false, error: err });
  }
}

init().then(() => console.log("[offscreen] sdk ready")).catch((e) => console.error("[offscreen] init failed", e));