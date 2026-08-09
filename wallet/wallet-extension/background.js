// contracts/abi/UpdateCustodianMultisigWallet.abi.json
var UpdateCustodianMultisigWallet_abi_default = { "ABI version": 2, version: "2.4", header: ["pubkey", "time", "expire"], functions: [{ name: "constructor", inputs: [{ name: "owners_pubkey", type: "uint256[]" }, { name: "owners_address", type: "address[]" }, { name: "reqConfirms", type: "uint8" }, { name: "reqConfirmsData", type: "uint8" }, { name: "value", type: "uint64" }], outputs: [] }, { name: "setMaxCleanupOperations", inputs: [{ name: "value", type: "uint256" }], outputs: [] }, { name: "sendTransaction", inputs: [{ name: "dest", type: "address" }, { name: "value", type: "uint128" }, { name: "cc", type: "map(uint32,varuint32)" }, { name: "bounce", type: "bool" }, { name: "flags", type: "uint8" }, { name: "payload", type: "cell" }], outputs: [{ name: "value0", type: "address" }] }, { name: "submitTransaction", inputs: [{ name: "dest", type: "address" }, { name: "value", type: "uint128" }, { name: "cc", type: "map(uint32,varuint32)" }, { name: "bounce", type: "bool" }, { name: "flag", type: "uint8" }, { name: "payload", type: "cell" }], outputs: [{ name: "transId", type: "uint64" }] }, { name: "confirmTransaction", inputs: [{ name: "transactionId", type: "uint64" }], outputs: [] }, { name: "submitDataUpdate", inputs: [{ name: "owners_pubkey", type: "uint256[]" }, { name: "owners_address", type: "address[]" }, { name: "reqConfirms", type: "uint8" }, { name: "reqConfirmsData", type: "uint8" }], outputs: [{ name: "transId", type: "uint64" }] }, { name: "confirmDataUpdate", inputs: [{ name: "dataUpdateId", type: "uint64" }], outputs: [] }, { name: "isConfirmed", inputs: [{ name: "mask", type: "uint32" }, { name: "index", type: "uint8" }], outputs: [{ name: "confirmed", type: "bool" }] }, { name: "getParameters", inputs: [], outputs: [{ name: "maxQueuedTransactions", type: "uint8" }, { name: "maxCustodianCount", type: "uint8" }, { name: "expirationTime", type: "uint64" }, { name: "requiredTxnConfirms", type: "uint8" }, { name: "requiredDataConfirms", type: "uint8" }] }, { name: "getTransaction", inputs: [{ name: "transactionId", type: "uint64" }], outputs: [{ components: [{ name: "id", type: "uint64" }, { name: "confirmationsMask", type: "uint32" }, { name: "signsRequired", type: "uint8" }, { name: "signsReceived", type: "uint8" }, { components: [{ name: "owner_pubkey", type: "optional(uint256)" }, { name: "owner_address", type: "optional(address)" }, { name: "index", type: "uint8" }], name: "creator", type: "tuple" }, { name: "dest", type: "address" }, { name: "value", type: "uint128" }, { name: "cc", type: "map(uint32,varuint32)" }, { name: "sendFlags", type: "uint16" }, { name: "payload", type: "cell" }, { name: "bounce", type: "bool" }], name: "trans", type: "tuple" }] }, { name: "getUpdateData", inputs: [{ name: "updateDataId", type: "uint64" }], outputs: [{ components: [{ name: "id", type: "uint64" }, { name: "confirmationsMask", type: "uint32" }, { name: "signsRequired", type: "uint8" }, { name: "signsReceived", type: "uint8" }, { components: [{ name: "owner_pubkey", type: "optional(uint256)" }, { name: "owner_address", type: "optional(address)" }, { name: "index", type: "uint8" }], name: "creator", type: "tuple" }, { name: "owners_pubkey", type: "uint256[]" }, { name: "owners_address", type: "address[]" }, { name: "reqConfirms", type: "uint8" }, { name: "reqConfirmsData", type: "uint8" }], name: "data", type: "tuple" }] }, { name: "getTransactions", inputs: [], outputs: [{ components: [{ name: "id", type: "uint64" }, { name: "confirmationsMask", type: "uint32" }, { name: "signsRequired", type: "uint8" }, { name: "signsReceived", type: "uint8" }, { components: [{ name: "owner_pubkey", type: "optional(uint256)" }, { name: "owner_address", type: "optional(address)" }, { name: "index", type: "uint8" }], name: "creator", type: "tuple" }, { name: "dest", type: "address" }, { name: "value", type: "uint128" }, { name: "cc", type: "map(uint32,varuint32)" }, { name: "sendFlags", type: "uint16" }, { name: "payload", type: "cell" }, { name: "bounce", type: "bool" }], name: "transactions", type: "tuple[]" }] }, { name: "getUpdateDatas", inputs: [], outputs: [{ components: [{ name: "id", type: "uint64" }, { name: "confirmationsMask", type: "uint32" }, { name: "signsRequired", type: "uint8" }, { name: "signsReceived", type: "uint8" }, { components: [{ name: "owner_pubkey", type: "optional(uint256)" }, { name: "owner_address", type: "optional(address)" }, { name: "index", type: "uint8" }], name: "creator", type: "tuple" }, { name: "owners_pubkey", type: "uint256[]" }, { name: "owners_address", type: "address[]" }, { name: "reqConfirms", type: "uint8" }, { name: "reqConfirmsData", type: "uint8" }], name: "data", type: "tuple[]" }] }, { name: "getTransactionIds", inputs: [], outputs: [{ name: "ids", type: "uint64[]" }] }, { name: "getUpdateCodeIds", inputs: [], outputs: [{ name: "ids", type: "uint64[]" }] }, { name: "getCustodians", inputs: [], outputs: [{ components: [{ name: "owner_pubkey", type: "optional(uint256)" }, { name: "owner_address", type: "optional(address)" }, { name: "index", type: "uint8" }], name: "custodians", type: "tuple[]" }] }, { name: "getVersion", inputs: [], outputs: [{ name: "value0", type: "string" }, { name: "value1", type: "string" }] }], events: [{ name: "TransferAccepted", inputs: [{ name: "payload", type: "bytes" }], outputs: [] }], fields: [{ init: true, name: "_pubkey", type: "uint256" }, { init: false, name: "_timestamp", type: "uint64" }, { init: false, name: "_constructorFlag", type: "bool" }, { init: false, name: "m_ownerKey", type: "optional(uint256)" }, { init: false, name: "m_ownerAddress", type: "optional(address)" }, { init: false, name: "m_requestsMask", type: "uint256" }, { init: false, name: "m_requestsMaskData", type: "uint256" }, { components: [{ name: "id", type: "uint64" }, { name: "confirmationsMask", type: "uint32" }, { name: "signsRequired", type: "uint8" }, { name: "signsReceived", type: "uint8" }, { components: [{ name: "owner_pubkey", type: "optional(uint256)" }, { name: "owner_address", type: "optional(address)" }, { name: "index", type: "uint8" }], name: "creator", type: "tuple" }, { name: "dest", type: "address" }, { name: "value", type: "uint128" }, { name: "cc", type: "map(uint32,varuint32)" }, { name: "sendFlags", type: "uint16" }, { name: "payload", type: "cell" }, { name: "bounce", type: "bool" }], init: false, name: "m_transactions", type: "map(uint64,tuple)" }, { components: [{ name: "id", type: "uint64" }, { name: "confirmationsMask", type: "uint32" }, { name: "signsRequired", type: "uint8" }, { name: "signsReceived", type: "uint8" }, { components: [{ name: "owner_pubkey", type: "optional(uint256)" }, { name: "owner_address", type: "optional(address)" }, { name: "index", type: "uint8" }], name: "creator", type: "tuple" }, { name: "owners_pubkey", type: "uint256[]" }, { name: "owners_address", type: "address[]" }, { name: "reqConfirms", type: "uint8" }, { name: "reqConfirmsData", type: "uint8" }], init: false, name: "m_data", type: "map(uint64,tuple)" }, { components: [{ name: "owner_pubkey", type: "optional(uint256)" }, { name: "owner_address", type: "optional(address)" }, { name: "index", type: "uint8" }], init: false, name: "m_custodians", type: "map(uint256,tuple)" }, { init: false, name: "m_custodianCount", type: "uint8" }, { init: false, name: "m_defaultRequiredConfirmations", type: "uint8" }, { init: false, name: "m_defaultRequiredConfirmationsData", type: "uint8" }, { init: false, name: "_max_cleanup_operations", type: "uint256" }] };

// contracts/multisig_code.b64.txt
var multisig_code_b64_default = "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";

// src/background.js
var MULTISIG_ABI = UpdateCustodianMultisigWallet_abi_default;
var MULTISIG_CODE = multisig_code_b64_default.trim();
var NETWORK = "https://shellnet.ackinacki.org";
var STORE_KEY = "wallet.vault.v1";
var callbacks = /* @__PURE__ */ new Map();
var SESSION = { password: null, unlocked: false };
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
async function ensureOffscreen() {
  const r = await chrome.runtime.sendMessage({ target: "offscreen", method: "ping" }).catch(() => null);
  if (!r) {
    await chrome.offscreen.createDocument({
      url: "offscreen.html",
      reasons: ["BLOBS"],
      justification: "Hosts the TVM SDK (wasm) for signing and encoding."
    });
  }
}
function callSdk(method, params) {
  return new Promise((resolve, reject) => {
    const id = crypto.randomUUID();
    const timer = setTimeout(() => {
      callbacks.delete(id);
      reject(new Error("sdk timeout: " + method));
    }, 3e4);
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
async function deriveAccountId(pubkeyHex) {
  const dataRes = await callSdk("abi.encode_initial_data", {
    abi: { type: "Json", value: JSON.stringify(MULTISIG_ABI) },
    initial_data: { _pubkey: "0x" + pubkeyHex }
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
    { name: "PBKDF2", salt, iterations: 21e4, hash: "SHA-256" },
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
async function accountState(accountId) {
  const r = await fetch(`${NETWORK}/v2/account?account_id=${accountId}&dapp_id=${accountId}`, {
    headers: { accept: "application/json" }
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
        body: JSON.stringify(payload)
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
      await new Promise((r) => setTimeout(r, 2e3));
    }
  }
  throw lastErr || new Error("broadcast failed");
}
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
        flags: flags === void 0 ? 1 : flags,
        payload: payload || ""
      }
    },
    signer: { type: "Keys", keys: { secret: kp.secret, public: kp.public } },
    is_internal: true
  });
  return body.body;
}
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
      unsigned: params.data
    });
    return res;
  }
  throw new Error("unknown method: " + method);
}
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  void (async () => {
    try {
      switch (msg && msg.kind) {
        case "vault_status": {
          const vault = await loadVault();
          sendResponse({ ok: true, unlocked: SESSION.unlocked, hasVault: !!vault });
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
      sendResponse({ ok: false, error: e && e.message || String(e) });
    }
  })();
  return true;
});
console.log("[bg] acki nacki wallet background ready");
//# sourceMappingURL=background.js.map
