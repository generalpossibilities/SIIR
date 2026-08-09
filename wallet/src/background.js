import multisigAbiJson from "../contracts/abi/UpdateCustodianMultisigWallet.abi.json" with { type: "json" };
import multisigCodeText from "../contracts/multisig_code.b64.txt";

const MULTISIG_ABI = multisigAbiJson;
const MULTISIG_CODE = multisigCodeText.trim();
const NETWORK = "https://shellnet.ackinacki.org";
const STORE_KEY = "wallet.vault.v1";

const callbacks = new Map();
const SESSION = { password: null, unlocked: false };

function u8ToB64(u8) {
  let bin = "";
  for (let i = 0; i < u8.length; i++) bin += String.fromCharCode(u8[i]);
  return btoa(bin);
}

function b64ToU8(b64) {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

/* ---------- TVM SDK via offscreen ---------- */

async function ensureOffscreen() {
  const r = await chrome.runtime.sendMessage({ target: "offscreen", method: "ping" }).catch(() => null);
  if (!r) {
    await chrome.offscreen.createDocument({
      url: "offscreen.html",
      reasons: ["BLOBS"],
      justification: "Hosts the TVM SDK (wasm) for signing and encoding.",
    });
  }
}

function callSdk(method, params) {
  return new Promise((resolve, reject) => {
    const id = crypto.randomUUID();
    const timer = setTimeout(() => {
      callbacks.delete(id);
      reject(new Error("sdk timeout: " + method));
    }, 30000);
    callbacks.set(id, { resolve, reject, timer });
    void ensureOffscreen().then(() => {
      try {
        chrome.runtime.sendMessage({ target: "offscreen", id, method, params });
      } catch (e) {
        clearTimeout(timer);
        callbacks.delete(id);
        reject(e);
      }
    });
  });
}

chrome.runtime.onMessage.addListener((msg) => {
  if (!msg || msg.target !== "offscreen" || !callbacks.has(msg.id)) return;
  const cb = callbacks.get(msg.id);
  callbacks.delete(msg.id);
  clearTimeout(cb.timer);
  if (msg.ok) cb.resolve(msg.result);
  else cb.reject(new Error(String(msg.error) || "sdk error"));
});

/* ---------- account derivation (verified vs tvm-cli genaddr) ---------- */

async function deriveAccountId(pubkeyHex) {
  const dataRes = await callSdk("abi.encode_initial_data", {
    abi: { type: "Json", value: JSON.stringify(MULTISIG_ABI) },
    initial_data: { _pubkey: "0x" + pubkeyHex },
  });
  const state = await callSdk("boc.encode_state_init", { code: MULTISIG_CODE, data: dataRes.data });
  const hash = await callSdk("boc.get_boc_hash", { boc: state.state_init });
  return hash.hash;
}

async function deriveFromMnemonic(phrase) {
  const kp = await callSdk("crypto.mnemonic_derive_sign_keys", { phrase, path: "m/44'/396'/0'/0/0" });
  const account_id = await deriveAccountId(kp.public);
  return { phrase, public: kp.public, secret: kp.secret, account_id };
}

/* ---------- vault (AES-GCM, PBKDF2 210k) ---------- */

async function aesKey(password, salt) {
  const enc = new TextEncoder();
  const base = await crypto.subtle.importKey("raw", enc.encode(password), "PBKDF2", false, ["deriveKey"]);
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", salt, iterations: 210000, hash: "SHA-256" },
    base,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
}

async function vaultEncrypt(plainObj, password) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await aesGcmKey(password, salt);
  const ct = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    new TextEncoder().encode(JSON.stringify(plainObj))
  );
  return { salt: u8ToB64(salt), iv: u8ToB64(iv), ct: u8ToB64(new Uint8Array(ct)) };
}

async function aesGcmKey(password, salt) {
  const enc = new TextEncoder();
  const base = await crypto.subtle.importKey("raw", enc.encode(password), "PBKDF2", false, ["deriveKey"]);
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", salt, iterations: 210000, hash: "SHA-256" },
    base,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
}

async function vaultDecrypt(cipher, password) {
  const key = await aesGcmKey(password, b64ToU8(cipher.salt));
  const pt = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: b64ToU8(cipher.iv) },
    key,
    b64ToU8(cipher.ct)
  );
  return JSON.parse(new TextDecoder().decode(pt));
}

async function loadVault() {
  const s = await chrome.storage.local.get(STORE_KEY);
  const vault = s[STORE_KEY] || null;
  return vault;
}

async function vaultCreate(phrase, password) {
  const kp = await deriveFromMnemonic(phrase);
  const cipher = await vaultEncrypt(kp, password);
  await chrome.storage.local.set({ [STORE_KEY]: { v: 1, cipher } });
  SESSION.password = password;
  SESSION.unlocked = true;
  return kp;
}

async function vaultUnlock(password) {
  const vault = await loadVault();
  if (!vault) throw new Error("no vault");
  try {
    const kp = await vaultDecrypt(vault.cipher, password);
    SESSION.password = password;
    SESSION.unlocked = true;
    return kp;
  } catch (e) {
    throw new Error("wrong password");
  }
}

function vaultLock() {
  SESSION.unlocked = false;
  SESSION.password = null;
}

async function requireKeys() {
  if (!SESSION.unlocked) throw new Error("vault locked");
  const vault = await loadVault();
  if (!vault) throw new Error("no vault");
  return vaultDecrypt(vault.cipher, SESSION.password);
}

/* ---------- network ---------- */

async function accountState(accountId) {
  const r = await fetch(`${NETWORK}/v2/account?account_id=${accountId}&dapp_id=${accountId}`, {
    headers: { accept: "application/json" },
  });
  if (r.status === 404) return { active: false };
  if (!r.ok) throw new Error("account http " + r.status);
  const j = await r.json();
  if (!j.boc) return { active: false };
  const parsed = await callSdk("boc.parse_account", { boc: j.boc });
  return parsed.parsed;
}

async function broadcast(accountId, bodyBoc) {
  const payload = { id: accountId, account_id: accountId, dapp_id: accountId, body: bodyBoc };
  let lastErr = null;
  for (let i = 0; i < 4; i++) {
    try {
      const r = await fetch(`${NETWORK}/v2/messages`, {
        method: "POST",
        headers: { "content-type": "application/json", "X-EXT-MSG-SENT": String(Date.now()) },
        body: JSON.stringify(payload),
      });
      const text = await r.text();
      if (!r.ok) {
        lastErr = new Error(`http ${r.status}: ${text.slice(0, 200)}`);
        if (/TVM_ERROR|Invalid/i.test(text)) throw lastErr;
        continue;
      }
      const j = JSON.parse(text);
      if (j.error) throw new Error(String(j.error));
      return j.result;
    } catch (e) {
      lastErr = e;
      if (/TVM_ERROR|Invalid/i.test(String(e.message))) throw e;
      await new Promise((r) => setTimeout(r, 2000));
    }
  }
  throw lastErr || new Error("broadcast failed");
}

/* ---------- message encoding ---------- */

async function encodeSend(kp, { to, value, cc, bounce, flags, payload }) {
  const body = await callSdk("abi.encode_message_body", {
    abi: { type: "Json", value: JSON.stringify(MULTISIG_ABI) },
    call_set: {
      function_name: "sendTransaction",
      input: {
        dest: to,
        value,
        cc: { "2": cc || 0 },
        bounce: !!bounce,
        flags: flags === undefined ? 1 : flags,
        payload: payload || "",
      },
    },
    signer: { type: "Keys", keys: { secret: kp.secret, public: kp.public } },
    is_internal: true,
  });
  return body.body;
}

async function encodeCustomCall(kp, { to, value, abi, function_name, input, cc, bounce, flags }) {
  const abiObj = abi ? { type: "Json", value: abi } : { type: "Contract", value: { name: "none", functions: [], events: [], fields: [] } };
  const inner = await callSdk("abi.encode_message_body", {
    abi: abiObj,
    call_set: { function_name, input },
    signer: { type: "None" },
    is_internal: true,
  });
  return encodeSend(kp, { to, value: value || 0, cc, bounce, flags, payload: inner.body });
}

/* ---------- RPC dispatch ---------- */

async function dispatchRpc(kp, method, params) {
  if (method === "ackn_accounts") return { account_id: kp.account_id, public: kp.public };
  if (method === "ackn_balance") return accountState(kp.account_id);
  if (method === "ackn_send") {
    const body = await encodeSend(kp, params);
    return broadcast(kp.account_id, body);
  }
  if (method === "ackn_call") {
    const body = await encodeCall(kp, params);
    return broadcast(kp.account_id, body);
  }
  if (method === "ackn_sign") {
    const res = await callSdk("crypto.sign", {
      keys: { secret: kp.secret, public: kp.public },
      unsigned: params.data,
    });
    return res;
  }
  throw new Error("unknown method: " + method);
}

/* ---------- message listener ---------- */

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  void (async () => {
    try {
      switch (msg && msg.kind) {
        case "vault_status": {
          const vault = await loadVault();
          sendResponse({ ok: true, result: { unlocked: SESSION.unlocked, hasVault: !!vault } });
          return;
        }
        case "vault_create": {
          const p = msg.params || msg;
          sendResponse({ ok: true, result: await vaultCreate(p.phrase, p.password) });
          return;
        }
        case "vault_unlock": {
          const p = msg.params || msg;
          sendResponse({ ok: true, result: await vaultUnlock(p.password) });
          return;
        }
        case "vault_lock":
          vaultLock();
          sendResponse({ ok: true });
          return;
        case "rpc": {
          if (!SESSION.unlocked) throw new Error("vault locked");
          const kp = await requireKeys();
          sendResponse({ ok: true, result: await dispatchRpc(kp, msg.method, msg.params) });
          return;
        }
        case "sdk":
          sendResponse({ ok: true, result: await callSdk(msg.method, msg.params) });
          return;
        default:
          sendResponse({ ok: false, error: "unknown kind" });
      }
    } catch (e) {
      sendResponse({ ok: false, error: (e && e.message) || String(e) });
    }
  })();
  return true;
});

console.log("[bg] acki nacki wallet background ready");