"use strict";
/* wallet.js - external-wallet signer abstraction for SIIR.
   The app never holds keys: a connected wallet (a MetaMask-like extension
   injecting `window.ackiWallet` with an EIP-1193-ish request() API) signs
   the 32-byte data_to_sign of an ABI message and returns the 64-byte
   ed25519 signature; this file stitches it into the external message and
   submits it to the chain relay.

   A clearly-labeled dev-only in-memory provider (DemoProvider) keeps the
   write path testable without any wallet installed. It uses a pure-JS
   ed25519 (RFC 8032) and is NOT safe for real value.

   Wallet provider contract (documented for future wallet authors):
     window.ackiWallet.request({ method, params })
       acki_connect     []              -> { pubkey: "<64 hex>", address: "0:<64 hex>" }
       acki_getAccount  []              -> { pubkey, address }
       acki_signData    [dataToSignHex] -> "<128 hex>" (64-byte ed25519 signature)

   Message layout (verified byte-for-byte against tvm-cli / acki SDK 3.0.2):
     data_to_sign = repr_hash( cell( dst_addr 267b ++ [1][pubkey 256b][time 64b]
                                       [expire 32b][func_id 32b], ref: args ) )
     ext-in msg   = "10" "00" dst_addr 267b "0000"(import_fee=0) "0"(no init)
                    "1"(body ref) ref( signed_body )
*/

// ---------- pure-JS ed25519 (RFC 8032) - DEV provider only ----------

const ED_P = (1n << 255n) - 19n;
const ED_L = (1n << 252n) + 27742317777372353535851937790883648493n;

function edInv0(a) {
    let v = ((a % ED_P) + ED_P) % ED_P;
    let e = ED_P - 2n;
    let r = 1n;
    while (e > 0n) {
        if (e & 1n) r = (r * v) % ED_P;
        v = (v * v) % ED_P;
        e >>= 1n;
    }
    return r;
}

const edPow = (a, e) => {
    let r = 1n;
    a = ((a % ED_P) + ED_P) % ED_P;
    while (e > 0n) {
        if (e & 1n) r = (r * a) % ED_P;
        a = (a * a) % ED_P;
        e >>= 1n;
    }
    return r;
};

const ED_D = ((ED_P - 121665n * edInv0(121666n) % ED_P) + ED_P) % ED_P;
const ED_I = edPow(2n, (ED_P - 1n) / 4n); // sqrt(-1)
const ED_BX = 15112221349535400772501151409588531511454012693041857206046113283949847762202n;
const ED_BY = 46316835694926478169428394003475163141307993866256225615783033603165251855960n;

const edInv = (a) => edPow(a, ED_P - 2n);

const edEncode = (x, y, z) => {
    if (z !== undefined && z !== 1n) {
        const iz = edInv0(z);
        x = x * iz % ED_P;
        y = y * iz % ED_P;
    }
    const out = new Uint8Array(32);
    let v = y | ((x & 1n) << 255n);
    for (let i = 0; i < 32; i++) {
        out[i] = Number(v & 0xffn);
        v >>= 8n;
    }
    return out;
};

// extended twisted Edwards coords (a = -1): x=X/Z, y=Y/Z, t=XY/Z
const edPoint = (x, y) => ({ X: x, Y: y, Z: 1n, T: (x * y) % ED_P });
const edB = edPoint(ED_BX, ED_BY);

const edAdd = (p, q) => {
    const modP = (v) => ((v % ED_P) + ED_P) % ED_P;
    const A = modP(p.Y - p.X) * modP(q.Y - q.X) % ED_P;
    const B = modP(p.Y + p.X) * modP(q.Y + q.X) % ED_P;
    const C = 2n * ED_D % ED_P * p.T % ED_P * q.T % ED_P;
    const D = 2n * p.Z % ED_P * q.Z % ED_P;
    const E = modP(B - A);
    const F = modP(D - C);
    const G = modP(D + C);
    const H = modP(B + A);
    return { X: E * F % ED_P, Y: G * H % ED_P, T: E * H % ED_P, Z: F * G % ED_P };
};

const edDbl = (p) => {
    const modP = (v) => ((v % ED_P) + ED_P) % ED_P;
    const A = p.X * p.X % ED_P;
    const B = p.Y * p.Y % ED_P;
    const C = 2n * p.Z % ED_P * p.Z % ED_P;
    const E = modP(modP(p.X + p.Y) * modP(p.X + p.Y) - A - B);
    const G = modP(B - A);
    const F = modP(G - C);
    const H = modP(-A - B);
    return { X: E * F % ED_P, Y: G * H % ED_P, T: E * H % ED_P, Z: F * G % ED_P };
};

const edScalarMult = (p, n) => {
    let r = { X: 0n, Y: 1n, Z: 1n, T: 0n };
    let q = p;
    let k = n;
    while (k > 0n) {
        if (k & 1n) r = edAdd(r, q);
        q = edDbl(q);
        k >>= 1n;
    }
    return r;
};

const edClamp = (h32) => {
    const a = h32.slice();
    a[0] &= 248;
    a[31] &= 127;
    a[31] |= 64;
    let v = 0n;
    for (let i = 31; i >= 0; i--) v = (v << 8n) | BigInt(a[i]);
    return v;
};

const edBytesToBig = (b) => {
    let v = 0n;
    for (let i = b.length - 1; i >= 0; i--) v = (v << 8n) | BigInt(b[i]);
    return v;
};

function concatBytes(a, b) {
    const out = new Uint8Array(a.length + b.length);
    out.set(a, 0);
    out.set(b, a.length);
    return out;
}

async function edKeypair(seed32) {
    const h = new Uint8Array(await crypto.subtle.digest("SHA-512", seed32));
    const a = edClamp(h.subarray(0, 32));
    const A = edScalarMult(edB, a);
    const pub = edEncode(A.X, A.Y, A.Z);
    return { seed: seed32, prefix: h.subarray(32, 64), pub, a };
}

async function edSign(kp, msg) {
    const r = edBytesToBig(new Uint8Array(await crypto.subtle.digest("SHA-512", concatBytes(kp.prefix, msg)))) % ED_L;
    const R = edScalarMult(edB, r);
    const Renc = edEncode(R.X, R.Y, R.Z);
    const k = edBytesToBig(new Uint8Array(await crypto.subtle.digest("SHA-512", concatBytes(concatBytes(Renc, kp.pub), msg)))) % ED_L;
    const S = (r + k * kp.a) % ED_L;
    const out = new Uint8Array(64);
    out.set(Renc, 0);
    let v = S;
    for (let i = 32; i < 64; i++) { out[i] = Number(v & 0xffn); v >>= 8n; }
    return out;
}

// ---------- SIIRWallet address derivation ----------

const WALLET_CODE = "te6ccgECGAEAA2EABCSK7VMg4wMgwP/jAiDA/uMC8gsVAwEXArSNCGAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAT4aSHbPNMAAY4igwjXGCD4KMjOzsn5AAHTAAGU0/9QM5MC+ELiIPhl+RDyqJXTAAHyeuLTPwETAgFO+EMhufK0IPgjgQPoqIIIG3dAoLnytPhj0x8B+CO88rnTHwHbPPI8BANa7UTQgQFA1yHXCgD4ZiLQ0wP6QDD4aak4ANwhxwDjAiHXDR/yvCHjAwHbPPI8FBQEAzIgwAHjAiCCEAUqrdG64wIgghB5hDEouuMCEQ4FA14w+Eby4Ez4Qm7jACGT1NHQ3vpA03/SANMf9ARZbwIB0x/0BFlvAgHU0ds82zzyABMGEgL++EUgbpIwcN74Srry4fQibxAibxC68uH1+ABtcJVTBG8QuY5VUwRvEYAg9A7ystcLH1MCgCD0Dm+hMfLR9SD4J28RgCD0Dm+Rk/oEMN61f1MlbxGAIPQO8rLXC3++8uH2UxRvEYAg9A7ystcLfyPIWPoGWYAg9EMypOgwU1HbPAkHAULbPFUEtXdVFMjPhYDKAM+EQM4B+gL0AHHPC23MyXH7AFsIADZy+CdvEYAg9A5vkZP6BDDetX8hvvLh9rU/xycCMoIAw1DbPIIQHc1lAKC1f1igtX8B2zygtX8MCgGO2zwhgwf5QTAhwgCOFSGltf8yI9DXSVy8b5GUXKG1/95sId4BtX8ibxKotX8BtX8ibxGotX+gtX8BbxABhA+gtX+rD6C1fzELAFJwXyBvA4AZ+DMgbvLQjCBu8n/Q0wcx0z9SIm9QMtM/UiJvUTLXCz9vUgEQ2zyDD6mGtX8NADaAFfgzIG7y0IwgbvJ/0NMH0z/TP9MH1ws/bEEDejD4RvLgTPhCbuMA0ds8I44kJdDTAfpAMDHIz4cgznHPC2FeIMjPkhSqt0bL/8t/zM3JcPsAkl8D4uMA8gATDxIBKvhKcvgnbxGAIPQOb5GT+gQw3rV/iBAACjEuMC4wAh4w+EJu4wD4RvJz0ds88gATEgAk+Er4Q/hCyMv/yz/Pg8v/ye1UACjtRNDT/9M/0wDT/9H4avhm+GP4YgAK+Eby4EwCEPSkIPS98sBOFxYAFHNvbCAwLjc5LjMAAA=="; // SIIRWallet code cell (from SIIRWallet.tvc)

async function walletAddressFor(pubkeyHex) {
    const code = parseBoc(WALLET_CODE).root;
    const P = bin(BigInt("0x" + pubkeyHex), 256);
    const data = new Cell(P + "0".repeat(64) + "0" + P, []);
    const stateInit = new Cell("00110", [code, data]);
    return "0:" + toHex(await cellHash(stateInit));
}

// ---------- ABI message assembly (mirrors the acki SDK 3.0.x path) ----------

async function sha256Hex(s) {
    const d = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
    return toHex(new Uint8Array(d));
}

// sha256("name(inputs)(outputs)v{major}")[..4] & 0x7FFFFFFF
async function funcIdFor(abi, method) {
    const f = abi.functions.find((fn) => fn.name === method);
    if (!f) throw new Error("function not in ABI: " + method);
    const inputs = f.inputs.map((i) => i.type);
    const outputs = (f.outputs || []).map((o) => o.type);
    const major = String(abi["ABI version"] || 2).split(".")[0];
    const sig = `${method}(${inputs.join(",")})(${outputs.join(",")})v${major}`;
    const h = await sha256Hex(sig);
    return Number(BigInt("0x" + h.slice(0, 8)) & 0x7fffffffn);
}

// ABI v2 param -> { bits, refs } (subset needed by SIIR actions)
function packParam(type, value) {
    if (type === "address") return { bits: addrToBits(value), refs: [] };
    if (type === "bool") return { bits: value ? "1" : "0", refs: [] };
    const um = /^uint(\d+)$/.exec(type);
    if (um) return { bits: bin(BigInt(value), parseInt(um[1], 10)), refs: [] };
    const im = /^int(\d+)$/.exec(type);
    if (im) {
        const n = parseInt(im[1], 10);
        let v = BigInt(value);
        if (v < 0n) v = (1n << BigInt(n)) + v;
        return { bits: bin(v, n), refs: [] };
    }
    if (type === "string") {
        const b = new TextEncoder().encode(String(value));
        let bits = bin(BigInt(b.length), 32);
        for (const c of b) bits += bin(BigInt(c), 8);
        return { bits, refs: [] };
    }
    if (type.endsWith("[]")) {
        const inner = type.slice(0, -2);
        const size = /^uint(\d+)$/.exec(inner);
        if (!size) throw new Error("unsupported array element type: " + inner);
        const n = parseInt(size[1], 10);
        const arr = Array.isArray(value) ? value : [];
        const dict = buildDict(arr.map((v, i) => ({ key: BigInt(i), value: bin(BigInt(v), n) })), 32);
        const bits = bin(BigInt(arr.length), 32) + (arr.length ? "1" : "0");
        return { bits, refs: arr.length ? [dict] : [] };
    }
    if (type === "cell") {
        const c = typeof value === "string" ? parseBoc(value).root : value;
        return { bits: "", refs: [c] };
    }
    throw new Error("unsupported ABI type: " + type);
}

function packParams(abiInputs, params) {
    const b = new Builder();
    const refs = [];
    for (const inp of abiInputs) {
        const p = packParam(inp.type, params[inp.name]);
        if (p.bits) b.storeBits(p.bits);
        for (const r of p.refs) refs.push(r);
    }
    const cell = b.asCell();
    for (const r of refs) cell.refs.push(r);
    return cell;
}

// ABI v2 max serialized sizes (TokenValue::max_bit_size / max_refs_count in
// tvm_abi), used by the SDK's pack_cells_into_chain to decide when a value
// fits in the current cell or must be chained into a reference.
const MAX_CELL_BITS = 1023;
const MAX_CELL_REFS = 4;

function maxBitSize(type) {
    if (type === "bool") return 1;
    if (type === "address") return 591;
    if (type === "cell" || type === "string" || type === "bytes") return 0;
    if (type === "time") return 64;
    if (type === "expire") return 32;
    if (type === "pubkey") return 257;
    const um = /^u?int(\d+)$/.exec(type);
    if (um) return parseInt(um[1], 10);
    if (type.endsWith("[]")) return 33;
    throw new Error("maxBitSize: unsupported type " + type);
}

function maxRefs(type) {
    if (type === "bool" || type === "address" || /^u?int(\d+)$/.test(type)
        || type === "time" || type === "expire" || type === "pubkey") return 0;
    if (type === "cell" || type === "string" || type === "bytes" || type.endsWith("[]")) return 1;
    throw new Error("maxRefs: unsupported type " + type);
}

// pack_cells_into_chain: append each SerializedValue to the current cell while
// it fits (by max sizes); on overflow start a new cell that the previous one
// references. Returns the chain root.
function chainValues(values) {
    values = values.slice().reverse();
    const packed = [values.pop()];
    while (values.length) {
        const value = values.pop();
        const last = packed[packed.length - 1];
        const remainingBits = MAX_CELL_BITS - last.maxBits;
        const remainingRefs = MAX_CELL_REFS - last.maxRefs;
        if (remainingBits < value.maxBits || remainingRefs < value.maxRefs) {
            packed.push(value);
        } else if (value.maxRefs > 0 && remainingRefs === value.maxRefs) {
            const rem = values.reduce((a, v) => ({ bits: a.bits + v.maxBits, refs: a.refs + v.maxRefs }), { bits: 0, refs: 0 });
            if (rem.refs === 0 && rem.bits + value.maxBits <= remainingBits) {
                last.bits += value.bits;
                last.refs.push(...value.refs);
                last.maxBits += value.maxBits;
                last.maxRefs += value.maxRefs;
            } else {
                packed.push(value);
            }
        } else {
            last.bits += value.bits;
            last.refs.push(...value.refs);
            last.maxBits += value.maxBits;
            last.maxRefs += value.maxRefs;
        }
    }
    const cells = packed.map((p) => new Cell(p.bits, p.refs));
    for (let i = cells.length - 2; i >= 0; i--) cells[i].refs.push(cells[i + 1]);
    return cells[0];
}

function paramValue(type, value) {
    const p = packParam(type, value);
    return { bits: p.bits, refs: p.refs, maxBits: maxBitSize(type), maxRefs: maxRefs(type) };
}

async function encodeUnsignedMessage(abi, dst, method, params, { pubkey, time, expire }) {
    const funcId = await funcIdFor(abi, method);
    const values = [
        // 591-bit sign-reserve (max_bit_size(Address)) — drained below
        { bits: "0".repeat(591), refs: [], maxBits: 591, maxRefs: 0 },
        { bits: "1", refs: [], maxBits: 1, maxRefs: 0 },
        { bits: bin(BigInt("0x" + pubkey), 256), refs: [], maxBits: 257, maxRefs: 0 },
        { bits: bin(BigInt(time), 64), refs: [], maxBits: 64, maxRefs: 0 },
        { bits: bin(BigInt(expire), 32), refs: [], maxBits: 32, maxRefs: 0 },
        { bits: bin(BigInt(funcId), 32), refs: [], maxBits: 32, maxRefs: 0 },
    ];
    for (const inp of abi.functions.find((f) => f.name === method).inputs) {
        values.push(paramValue(inp.type, params[inp.name]));
    }
    const root = chainValues(values);
    const drainedBits = root.bits.slice(591);
    const bodyNoSig = new Cell(drainedBits, root.refs);
    const dataToSign = new Cell(addrToBits(dst) + drainedBits, root.refs);
    return { funcId, args: packParams(abi.functions.find((f) => f.name === method).inputs, params),
             dstBits: addrToBits(dst), bodyNoSig, dataToSign, pubkey, time, expire };
}

// signed body: [1][sig 512b] ++ drained unsigned body (header + args + refs)
function signedBody(pubkey, time, expire, funcId, bodyNoSig, sigHex) {
    const b = new Builder()
        .storeBool(true)
        .storeBits(bin(BigInt("0x" + sigHex), 512));
    const cell = b.asCell();
    cell.bits += bodyNoSig.bits;
    for (const r of bodyNoSig.refs) cell.refs.push(r);
    return cell;
}

// ext-in message: "10" "00" dst 267b "0000" "0"(no init) + body Either:
// "0" = body inline, "1" = body in reference (SDK behaviour)
function extInMessage(dstBits, bodyCell) {
    if (bodyCell.bits.length + 277 <= MAX_CELL_BITS && bodyCell.refs.length <= MAX_CELL_REFS) {
        return new Cell("1000" + dstBits + "000000" + bodyCell.bits, bodyCell.refs);
    }
    return new Cell("1000" + dstBits + "000001", [bodyCell]);
}

async function signedMessageBoc(enc, sigHex) {
    const body = signedBody(enc.pubkey, enc.time, enc.expire, enc.funcId, enc.bodyNoSig, sigHex);
    return extInMessage(enc.dstBits, body);
}

function relayPayload(msgCell, msgIdHex, dst) {
    const raw = String(dst).split(":")[1];
    return {
        id: msgIdHex,
        body: bytesToB64(writeBoc(msgCell)),
        expire_at: null,
        thread_id: "0".repeat(68),
        ext_message_token: null,
        dapp_id: raw,
        account_id: raw,
    };
}

// ---------- wallet providers ----------

const WALLET_STORE_KEY = "siir.wallet";

class InjectedProvider {
    constructor(w) {
        this.w = w;
        this._info = null;
    }
    static detect() {
        const w = window.ackiWallet;
        return w && typeof w.request === "function" ? new InjectedProvider(w) : null;
    }
    get name() { return "external wallet (ackiWallet)"; }
    get isDemo() { return false; }
    async connect() {
        const info = await this.w.request({ method: "acki_connect", params: [] });
        this._info = info;
        return info;
    }
    async getAccount() {
        if (!this._info) this._info = await this.w.request({ method: "acki_getAccount", params: [] });
        return this._info;
    }
    async signData(dataHex) {
        const sig = await this.w.request({ method: "acki_signData", params: [dataHex] });
        return String(sig).replace(/^0x/, "");
    }
}

class DemoProvider {
    constructor(seedHex) {
        this._seed = hexToBytes(seedHex);
        this._info = null;
    }
    static loadOrCreate() {
        const stored = localStorage.getItem(WALLET_STORE_KEY + ".demo");
        if (stored) return new DemoProvider(stored);
        const seed = crypto.getRandomValues(new Uint8Array(32));
        const hex = toHex(seed);
        localStorage.setItem(WALLET_STORE_KEY + ".demo", hex);
        return new DemoProvider(hex);
    }
    get name() { return "DEV demo signer (in-browser key)"; }
    get isDemo() { return true; }
    async connect() {
        const kp = await edKeypair(this._seed);
        const pub = toHex(kp.pub);
        const address = await walletAddressFor(pub);
        this._info = { pubkey: pub, address };
        return this._info;
    }
    async getAccount() {
        if (!this._info) return this.connect();
        return this._info;
    }
    async signData(dataHex) {
        const kp = await edKeypair(this._seed);
        const sig = await edSign(kp, hexToBytes(dataHex));
        return toHex(sig);
    }
    get seedHex() { return toHex(this._seed); }
}

function hexToBytes(hex) {
    const out = new Uint8Array(hex.length / 2);
    for (let i = 0; i < out.length; i++) out[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
    return out;
}

let _provider = null;

function currentProvider() {
    return _provider;
}

async function connectWallet(forceDemo) {
    const injected = forceDemo ? null : InjectedProvider.detect();
    const provider = injected || DemoProvider.loadOrCreate();
    const info = await provider.connect();
    _provider = provider;
    localStorage.setItem(WALLET_STORE_KEY, provider.isDemo ? "demo" : "injected");
    return { provider, info };
}

async function disconnectWallet() {
    _provider = null;
    localStorage.removeItem(WALLET_STORE_KEY);
}

function storedProviderKind() {
    return localStorage.getItem(WALLET_STORE_KEY);
}

// ---------- one-shot write action ----------

async function signAndSend(abi, dst, method, params, opts) {
    const p = _provider;
    if (!p) throw new Error("no wallet connected");
    const info = await p.getAccount();
    const now = Math.floor(Date.now() / 1000);
    const time = opts && opts.time !== undefined ? opts.time : now;
    const expire = opts && opts.expire !== undefined ? opts.expire : now + 30;
    const enc = await encodeUnsignedMessage(abi, dst, method, params, {
        pubkey: String(info.pubkey).replace(/^0x/, ""),
        time,
        expire,
    });
    const dataToSign = toHex(await cellHash(enc.dataToSign));
    const sigHex = await p.signData(dataToSign);
    const msgCell = await signedMessageBoc(enc, sigHex);
    const msgId = toHex(await cellHash(msgCell));
    const payload = relayPayload(msgCell, msgId, dst);
    return { payload, dataToSign, sigHex, msgId, provider: p, pubkey: info.pubkey, address: info.address };
}

if (typeof module !== "undefined" && module.exports) {
    // node: expose core.js primitives wallet.js relies on as globals
    if (typeof global !== "undefined") {
        const core = require("./core.js");
        for (const g of ["parseBoc", "cellHash", "cellDepth", "Builder", "writeBoc",
                         "buildDict", "addrToBits", "bytesToB64", "toHex", "bin", "Cell"]) {
            if (global[g] === undefined && core[g] !== undefined) global[g] = core[g];
        }
    }
    module.exports = {
        connectWallet, disconnectWallet, currentProvider, storedProviderKind,
        signAndSend, encodeUnsignedMessage, signedMessageBoc, relayPayload,
        funcIdFor, packParams, chainValues, maxBitSize, maxRefs, extInMessage,
        walletAddressFor, edKeypair, edSign, DemoProvider, InjectedProvider,
        WALLET_CODE,
    };
}