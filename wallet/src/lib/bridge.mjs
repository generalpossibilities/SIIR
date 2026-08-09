import multisigAbiJson from "../contracts/abi/UpdateCustodianMultisigWallet.abi.json" with { type: "json" };
import multisigCode from "../contracts/multisig_code.b64.txt" with { type: "text" };

const MULTISIG_ABI = multisigAbiJson;
const MULTISIG_CODE = multisigCode.trim();

let client = null;
let session = null;
const pending = new Map();

async function sdk(method, params) {
  if (!client) {
    await ensureOffscreen();
  }
  return callOffscreen(method, params);
}

function openPopup() {
  try {
    chrome.action.openPopup();
  } catch (e) {
    console.warn("[bg] openPopup unsupported, ignoring", e);
  }
}

function sendToPopup(msg) {
  try {
    void chrome.runtime.sendMessage(msg);
  } catch (e) {}
}

async function ensureOffscreen() {
  const has = await chrome.offscreen.hasDocument().catch(() => false);
  if (!has) {
    await chrome.offscreen.createDocument({
      url: "offscreen.html",
      reasons: ["BLOBS"],
      justification: "hosts the TVM SDK (wasm worker)",
    });
  }
}

function callOffscreen(method, params) {
  return new Promise((resolve, reject) => {
    const id = Math.random().toString(36).slice(2) + Date.now().toString(36);
    const timer = setTimeout(() => {
      callbacks.delete(id);
      reject(new Error("offscreen timeout: " + method));
    }, 30000);
    callbacks.set(id, { resolve, reject, timer });
    try {
      chrome.runtime.sendMessage({ target: "offscreen", id, method, params });
    } catch (e) {
      clearTimeout(timer);
      callbacks.delete(id);
      reject(e);
    }
  });
}

const callbacks = new Map();
chrome.runtime.onMessage.addListener((msg) => {
  if (!msg || msg.source !== "offscreen" || !callbacks.has(msg.id)) return;
  const cb = callbacks.get(msg.id);
  callbacks.delete(msg.id);
  clearTimeout(cb.timer);
  if (msg.ok) cb.resolve(msg.result);
  else cb.reject(new Error(String(msg.error) + (msg.error.code ? " code=" + msg.error.code : "")));
});

export { sdk, ensureOffscreen, pending, ensureToPopup };