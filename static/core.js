"use strict";
/* core.js - port of scripts/mirror.py to plain JS (BigInt, crypto.subtle).
   Read-only decode of CompanySIIR persistent state from a mirror-node BOC. */

// ---------- helpers ----------

function b64ToBytes(s) {
    const bin = atob(s);
    const u = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i);
    return u;
}

function bitsFromBytes(bytes, nBits) {
    let out = "";
    for (let i = 0; i < nBits; i++) {
        out += (bytes[i >> 3] >> (7 - (i & 7))) & 1 ? "1" : "0";
    }
    return out;
}

function bytesFromBits(bits) {
    const out = new Uint8Array(Math.ceil(bits.length / 8));
    for (let i = 0; i < bits.length; i++) {
        if (bits[i] === "1") out[i >> 3] |= 1 << (7 - (i & 7));
    }
    return out;
}

function toHex(bytes) {
    let s = "";
    for (const b of bytes) s += b.toString(16).padStart(2, "0");
    return s;
}

function hex0x64(v) {
    return "0x" + BigInt(v).toString(16).padStart(64, "0");
}

function bin(v, n) {
    return BigInt(v).toString(2).padStart(n, "0");
}

function dictGet(map, key, def) {
    if (!map) return def;
    const v = map[String(key)];
    return v === undefined ? def : v;
}

// ---------- BOC parsing ----------

const BOC_GENERIC_TAG = 0xB5EE9C72;
const BOC_GENERIC_V2_TAG = 0xB6FF9A73;

class Cell {
    constructor(bits, refs) {
        this.bits = bits;
        this.refs = refs;
    }
}

function parseBoc(data) {
    let bytes;
    if (typeof data === "string") {
        // info.data is plain base64 (its text coincidentally starts with
        // "te6c" since that IS the base64 of magic b5ee9c72). Only strip a
        // literal "te6c"/"te6s" text marker when the plain decode is invalid.
        let s = data.trim();
        bytes = b64ToBytes(s);
        const magicOf = (b) => ((b[0] << 24) | (b[1] << 16) | (b[2] << 8) | b[3]) >>> 0;
        if (magicOf(bytes) !== BOC_GENERIC_TAG && magicOf(bytes) !== BOC_GENERIC_V2_TAG
            && (s.startsWith("te6c") || s.startsWith("te6s"))) {
            bytes = b64ToBytes(s.slice(4));
        }
    } else {
        bytes = data;
    }
    const magic = ((bytes[0] << 24) | (bytes[1] << 16) | (bytes[2] << 8) | bytes[3]) >>> 0;
    if (magic !== BOC_GENERIC_TAG && magic !== BOC_GENERIC_V2_TAG) {
        throw new Error("NOT_BOC magic=0x" + magic.toString(16));
    }

    let pos = 4;
    const byte_ = () => bytes[pos++];
    const be = (n) => {
        let v = 0;
        for (let i = 0; i < n; i++) v = v * 256 + bytes[pos + i];
        pos += n;
        return v;
    };

    const first = byte_();
    const indexIncluded = (first & 0x80) !== 0;
    const hasCrc = (first & 0x40) !== 0;
    const refSize = first & 0x07;
    if ((first & 0x18) !== 0) throw new Error("non-zero flags field not supported");
    if (refSize === 0 || refSize > 4) throw new Error("invalid ref size");
    const offsetSize = byte_();
    if (offsetSize === 0 || offsetSize > 8) throw new Error("invalid offset size");

    const cellsCount = be(refSize);
    const rootsCount = be(refSize);
    be(refSize);                // absent cells
    be(offsetSize);             // tot_cells_size
    const hasBig = magic === BOC_GENERIC_V2_TAG;
    if (hasBig) {
        be(refSize);            // big_cells_count
        be(offsetSize);         // big_cells_size
    }
    if (cellsCount === 0 || rootsCount === 0) throw new Error("empty BOC");

    const rootsIndexes = [];
    for (let i = 0; i < rootsCount; i++) rootsIndexes.push(be(refSize));
    if (indexIncluded) pos += cellsCount * offsetSize;

    const findTag = (bs) => {
        let length = bs.length * 8;
        for (let i = bs.length - 1; i >= 0; i--) {
            const x = bs[i];
            if (x === 0) { length -= 8; continue; }
            let skip = 1, mask = 1;
            while ((x & mask) === 0) { skip++; mask <<= 1; }
            length -= skip;
            break;
        }
        return length;
    };

    const rawCells = [];
    for (let i = 0; i < cellsCount; i++) {
        const d1 = byte_();
        if (d1 === 13) { // big cell
            const length = be(3);
            const db = bytes.subarray(pos, pos + length);
            pos += length;
            rawCells.push({ d1, bitLen: length * 8, refIdx: [], data: db });
            continue;
        }
        const d2 = byte_();
        const refsN = d1 & 0x07;
        if (d1 & 0x10) throw new Error("cell hashes not supported");
        let byteLen = d2 >> 1;
        let bitLen;
        if (d2 & 1) { bitLen = null; byteLen += 1; } else bitLen = byteLen * 8;
        const dataBytes = bytes.subarray(pos, pos + byteLen);
        pos += byteLen;
        if (bitLen === null) bitLen = findTag(dataBytes);
        const refIdx = [];
        for (let r = 0; r < refsN; r++) refIdx.push(be(refSize));
        rawCells.push({ d1, bitLen, refIdx, data: dataBytes });
    }
    if (hasCrc) pos += 4;

    const cellObjs = new Array(cellsCount);
    for (let i = 0; i < cellsCount; i++) {
        cellObjs[i] = new Cell(bitsFromBytes(rawCells[i].data, rawCells[i].bitLen), []);
    }
    for (let i = 0; i < cellsCount; i++) {
        cellObjs[i].refs = rawCells[i].refIdx.map((j) => cellObjs[j]);
    }
    return { root: cellObjs[rootsIndexes[0]], cells: cellObjs };
}

// ---------- cell hashing (TVM representation hash) ----------

function cellDepth(cell) {
    if (cell.refs.length === 0) return 0;
    return 1 + Math.max(...cell.refs.map(cellDepth));
}

async function cellHash(cell) {
    const n = cell.bits.length;
    const tag = n % 8 !== 0;
    let dataBits = cell.bits;
    if (tag) dataBits += "1" + "0".repeat(7 - (n % 8));
    const d1 = cell.refs.length & 0x07;
    const d2 = ((n >> 3) << 1) | (tag ? 1 : 0);
    const dataBytes = bytesFromBits(dataBits);

    const depthBytes = new Uint8Array(cell.refs.length * 2);
    for (let i = 0; i < cell.refs.length; i++) {
        const d = cellDepth(cell.refs[i]);
        depthBytes[i * 2] = (d >> 8) & 0xff;
        depthBytes[i * 2 + 1] = d & 0xff;
    }
    const childHashes = [];
    for (const r of cell.refs) childHashes.push(await cellHash(r));

    const packed = new Uint8Array(2 + dataBytes.length + depthBytes.length + 32 * cell.refs.length);
    packed[0] = d1;
    packed[1] = d2;
    packed.set(dataBytes, 2);
    packed.set(depthBytes, 2 + dataBytes.length);
    let o = 2 + dataBytes.length + depthBytes.length;
    for (const h of childHashes) { packed.set(h, o); o += 32; }

    const digest = await crypto.subtle.digest("SHA-256", packed);
    return new Uint8Array(digest);
}

// ---------- bit slice ----------

class Slice {
    constructor(cell) {
        this.cell = cell;
        this.off = 0;
    }
    readBit() { return this.cell.bits[this.off++]; }
    readUint(nBits) {
        const b = this.cell.bits.slice(this.off, this.off + nBits);
        this.off += nBits;
        return b === "" ? 0n : BigInt("0b" + b);
    }
    readBool() { return this.readBit() === "1"; }
    readString() {
        const nBytes = Number(this.readUint(32));
        let s = "";
        for (let i = 0; i < nBytes; i++) s += String.fromCharCode(Number(this.readUint(8)));
        return s;
    }
    readAddress() {
        const tag = Number(this.readUint(2));
        if (tag === 2) {
            this.off += 1; // anycast
            let wc = Number(this.readUint(8));
            if (wc === 255) wc = -1;
            return wc + ":" + this.readUint(256).toString(16).padStart(64, "0");
        }
        if (tag === 3) {
            this.off += 1;
            const n = Number(this.readUint(9));
            return "0:" + this.readUint(n).toString(16).padStart(64, "0");
        }
        return null;
    }
}

// ---------- dict (hashmapE) decoding ----------

function readLabel(bits, off, maxv) {
    if (off >= bits.length) return ["", off];
    if (bits[off] === "0") { // hml_short
        off += 1;
        let n = 0;
        while (off < bits.length && bits[off] === "1") { n++; off++; }
        if (off < bits.length) off += 1;
        return [bits.slice(off, off + n), off + n];
    }
    const k = maxv === 0 ? 0 : maxv.toString(2).length;
    if (off + 1 >= bits.length || off + 3 > bits.length) return ["", bits.length];
    if (bits[off + 1] === "0") { // hml_long
        const n = parseInt(bits.slice(off + 2, off + 2 + k) || "0", 2);
        return [bits.slice(off + 2 + k, off + 2 + k + n), off + 2 + k + n];
    }
    // hml_same
    const v = bits[off + 2];
    const n = parseInt(bits.slice(off + 3, off + 3 + k) || "0", 2);
    return [v.repeat(n), off + 3 + k];
}

function walkDict(cell, keyBits, valueDecoder, out, prefix, bitLen, valueInRef) {
    const [label, off] = readLabel(cell.bits, 0, bitLen);
    prefix += label;
    const remaining = bitLen - label.length;
    if (remaining === 0) {
        let val;
        if (valueInRef && cell.refs.length) {
            val = valueDecoder(new Slice(cell.refs[0]));
        } else {
            val = valueDecoder(new Slice(new Cell(cell.bits.slice(off), cell.refs)));
        }
        out[BigInt("0b" + (prefix || "0")).toString()] = val;
        return;
    }
    const rem2 = remaining - 1;
    for (const bi of [0, 1]) {
        const child = bi < cell.refs.length ? cell.refs[bi] : null;
        if (child) walkDict(child, keyBits, valueDecoder, out, prefix + bi, rem2, valueInRef);
    }
}

function decodeDict(cell, keyBits, valueDecoder, valueInRef) {
    const out = {};
    if (!cell || cell.bits[0] === "0" || cell.bits[0] === undefined) return out;
    walkDict(cell, keyBits, valueDecoder, out, "", keyBits, valueInRef);
    return out;
}

// ---------- ABI size / cell breaks ----------

function maxBitsFor(t) {  // per-compiler ABITypeSize.maxBits
    if (t.startsWith("uint") || t.startsWith("int")) return parseInt(t.slice(4) || "256", 10);
    if (t === "bool") return 1;
    if (t === "address") return 591;
    return 0;
}

function abiTypeSize(t) {
    if (t.endsWith("[]")) return [33, 1];
    if (t.startsWith("uint") || t.startsWith("int")) return [parseInt(t.slice(4) || "256", 10), 0];
    if (t === "bool") return [1, 0];
    if (t === "address") return [591, 0];
    if (t === "string" || t === "bytes") return [0, 1];
    if (t === "cell") return [0, 1]; // TvmCell stores as a cell reference
    if (t.startsWith("map(")) return [1, 1];
    return [0, 0];
}

function computeCellBreaks(fields, bitOffset) {
    const sizes = fields.map((f) => abiTypeSize(f.type));
    const n = fields.length;
    const sufB = new Array(n + 1).fill(0);
    const sufR = new Array(n + 1).fill(0);
    for (let i = n - 1; i >= 0; i--) {
        sufB[i] = sufB[i + 1] + sizes[i][0];
        sufR[i] = sufR[i + 1] + sizes[i][1];
    }
    let bits = bitOffset, refs = 0;
    const breaks = new Array(n).fill(false);
    for (let i = 0; i < n; i++) {
        const mb = sizes[i][0], mr = sizes[i][1];
        if (bits + sufB[i] <= 1023 && refs + sufR[i] <= 4) {
            bits += mb; refs += mr;
        } else {
            bits += mb; refs += mr;
            if (bits > 1023 || refs >= 4) {
                breaks[i] = true;
                bits = mb; refs = mr;
            }
        }
    }
    return breaks;
}

// ---------- address helpers ----------

function dappAddr(dappId, stdAddr) {
    if (!dappId || !stdAddr) return "";
    return dappId + "::" + String(stdAddr).split(":")[1];
}

// ---------- MirrorState ----------

class MirrorState {
    constructor(addr, fields, net) {
        this.address = addr;
        this.net = net;
        this.fields = fields;
        this.state = {};
        this.rawCells = {};
        this._decoded = false;
        this.error = null;
    }

    async load() {
        try {
            const b64 = await this.fetchData();
            const { root } = parseBoc(b64);
            this._decode(root);
            this._decoded = true;
        } catch (e) {
            this.error = (e && e.message) || String(e);
        }
        return this;
    }

    async fetchData() {
        const [dapp, acct] = this.address.split("::");
        const query = `{blockchain{account(dapp_id:"${dapp}",account_id:"${acct}"){info{data}}}}`;
        const res = await fetch(`https://${this.net}/graphql`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ query }),
        });
        const body = await res.json();
        const data = body && body.data && body.data.blockchain &&
            body.data.blockchain.account && body.data.blockchain.account.info &&
            body.data.blockchain.account.info.data;
        if (!data) throw new Error("account has no data (not active / not found)");
        return data;
    }

    rawString(cell) {
        let out = "";
        while (cell) {
            const full = cell.bits.length >> 3;
            for (let i = 0; i < full; i++) {
                out += String.fromCharCode(parseInt(cell.bits.slice(i * 8, i * 8 + 8), 2));
            }
            cell = cell.refs.length ? cell.refs[0] : null;
        }
        return out.replace(/\x00+$/, "");
    }

    decodeTuple(comps, sl) {
        const breaks = computeCellBreaks(comps, 0);
        const vals = [];
        let refIdx = 0;
        for (let i = 0; i < comps.length; i++) {
            if (breaks[i]) {
                if (refIdx >= sl.cell.refs.length) break;
                sl = new Slice(sl.cell.refs[refIdx]);
                refIdx = 0;
            }
            const t = comps[i].type;
            if (t === "string") {
                vals.push(refIdx < sl.cell.refs.length
                    ? this.rawString(sl.cell.refs[refIdx++])
                    : "");
            } else if (t.startsWith("uint") || t.startsWith("int")) {
                vals.push(sl.readUint(parseInt(t.slice(4) || "256", 10)));
            } else if (t === "bool") {
                vals.push(sl.readBool());
            } else if (t === "address") {
                vals.push(sl.readAddress());
            } else if (t === "tuple") {
                vals.push(this.decodeTuple(comps[i].components || [], sl));
            } else {
                vals.push(null);
            }
        }
        return vals;
    }

    decodeScalar(t, sl) {
        if (t.startsWith("uint") || t.startsWith("int")) return sl.readUint(parseInt(t.slice(4) || "256", 10));
        if (t === "bool") return sl.readBool();
        if (t === "address") return sl.readAddress();
        return null;
    }

    valueDecoder(vt, keyBits, comps) {
        // (value_in_ref, decoder) per compiler doesDictStoreValueInRef
        if (vt === "tuple") {
            const mb = (comps || []).reduce((s, c) => s + maxBitsFor(c.type), 0);
            return {
                valueInRef: !(12 + keyBits + mb < 1023),
                dec: (sl) => this.decodeTuple(comps || [], sl),
            };
        }
        if (vt.startsWith("map(")) {
            const m = vt.match(/^map\(([^,]+),(.+)\)$/);
            const innerBits = parseInt(m[1].slice(4), 10);
            const inner = this.valueDecoder(m[2], innerBits, comps);
            const nested = (v) => {
                if ((v.cell.bits[0] || "0") !== "1" || !v.cell.refs.length) return {};
                return decodeDict(v.cell.refs[0], innerBits, inner.dec, inner.valueInRef);
            };
            return { valueInRef: !(12 + keyBits + 1 < 1023), dec: nested };
        }
        if (vt.endsWith("[]")) {
            // dynamic array as a map value: 32-bit length + 1 present bit,
            // then a ref to the dict root (same layout as top-level arrays)
            const et = vt.slice(0, -2);
            let dec2;
            if (et === "tuple") {
                dec2 = (sl) => this.decodeTuple(comps || [], sl);
            } else {
                dec2 = (sl) => this.decodeScalar(et, sl);
            }
            const arr = (v) => {
                const nLen = Number(v.readUint(32));
                if (!v.readBool() || nLen === 0 || !v.cell.refs.length) return {};
                const r = v.cell.refs[0];
                const mb = et === "tuple"
                    ? (comps || []).reduce((s, c) => s + maxBitsFor(c.type), 0)
                    : maxBitsFor(et);
                const dict = decodeDict(r, 32, dec2, !(12 + 32 + mb < 1023));
                const out = {};
                for (let k = 0; k < nLen; k++) out[String(k)] = dict[String(k)] ?? null;
                return out;
            };
            return { valueInRef: !(12 + keyBits + 33 < 1023), dec: arr };
        }
        return {
            valueInRef: !(12 + keyBits + maxBitsFor(vt) < 1023),
            dec: (sl) => this.decodeScalar(vt, sl),
        };
    }

    decodeMapField(field, cell) {
        const m = field.type.match(/^map\(([^,]+),(.+)\)$/);
        if (!m) return null;
        const keyBits = parseInt(m[1].slice(4), 10);
        const comps = field.components || [];
        const { valueInRef, dec } = this.valueDecoder(m[2], keyBits, comps);
        return decodeDict(cell, keyBits, dec, valueInRef);
    }

    _decode(root) {
        const fields = this.fields;
        let headBits = 0, headN = 0;
        for (const f of fields) {
            if (headBits === 0 && f.name.includes("pubkey")) { headBits += 256; headN++; continue; }
            if (headBits === 256 && f.name.includes("timestamp")) { headBits += 64; headN++; continue; }
            if (headBits === 320 && f.name.includes("constructor")) { headBits += 1; headN++; continue; }
            break;
        }
        const body = fields.slice(headN);
        const breaks = computeCellBreaks(body, headBits);

        let cur = root;
        let bitOff = headBits;
        let refIdx = 0;
        for (let i = 0; i < body.length; i++) {
            const f = body[i];
            const name = f.name, t = f.type;
            try {
                if (breaks[i]) {
                    cur = cur.refs[refIdx];
                    refIdx = 0;
                    bitOff = 0;
                }
                if (t.endsWith("[]")) {
                    const nRaw = parseInt(cur.bits.slice(bitOff, bitOff + 32) || "0", 2);
                    const present = cur.bits[bitOff + 32] === "1";
                    bitOff += 33;
                    if (!present || nRaw === 0) { this.state[name] = []; continue; }
                    const r = cur.refs[refIdx++];
                    const et = t.slice(0, -2);
                    let vref, dec;
                    if (et === "tuple") {
                        const comps = f.components || [];
                        vref = !(12 + 32 + comps.reduce((s, c) => s + maxBitsFor(c.type), 0) < 1023);
                        dec = (sl) => this.decodeTuple(comps, sl);
                    } else {
                        vref = !(12 + 32 + maxBitsFor(et) < 1023);
                        dec = (sl) => this.decodeScalar(et, sl);
                    }
                    const arr = decodeDict(r, 32, dec, vref);
                    const out = [];
                    for (let k = 0; k < nRaw; k++) out.push(arr[String(k)] ?? null);
                    this.state[name] = out;
                } else if (t.startsWith("uint") || t.startsWith("int")) {
                    const n = parseInt(t.slice(4) || "256", 10);
                    const b = cur.bits.slice(bitOff, bitOff + n) || "0";
                    this.state[name] = BigInt("0b" + b);
                    bitOff += n;
                } else if (t === "bool") {
                    this.state[name] = cur.bits[bitOff] === "1";
                    bitOff += 1;
                } else if (t === "address") {
                    const tag = cur.bits.slice(bitOff, bitOff + 2);
                    let wc = parseInt(cur.bits.slice(bitOff + 3, bitOff + 11) || "0", 2);
                    const addr = BigInt("0b" + (cur.bits.slice(bitOff + 11, bitOff + 267) || "0"));
                    if (wc === 255) wc = -1;
                    this.state[name] = tag === "10" ? wc + ":" + addr.toString(16).padStart(64, "0") : null;
                    bitOff += 267;
                } else if (t === "string") {
                    const r = cur.refs[refIdx++];
                    this.state[name] = this.rawString(r);
                    this.rawCells[name] = r;
                } else if (t === "cell") {
                    this.state[name] = null;
                    if (refIdx < cur.refs.length) refIdx++; // TvmCell: one ref
                } else if (t.startsWith("map(")) {
                    if (cur.bits[bitOff] !== "1") { this.state[name] = {}; bitOff += 1; continue; }
                    bitOff += 1;
                    const r = cur.refs[refIdx++];
                    this.state[name] = this.decodeMapField(f, r);
                } else {
                    this.state[name] = null;
                }
            } catch (e) {
                this.state[name] = null;
            }
        }
    }

    // ---------- derived getters (mirror the contract) ----------

    companyInfo() {
        const st = this.state;
        return {
            name: st._name || "",
            description: st._description || "",
            website: st._website || "",
            metadataUri: st._metadataUri || "",
            factory: st._factory || "",
            founder: st._founder || "",
            founderPubkey: hex0x64(st._founderPubkey || 0n),
            issuanceModel: String(st._issuanceModel || 0),
            totalWeight: String(st._totalWeight || 0n),
            issuedCount: String(st._issuedCount || 0n),
            dividendIndex: String(dictGet(this._divIndex(), 2, 0n)),
            deposited: String(dictGet(this._deposited(), 2, 0n)),
            dividendCount: String(this._divCurrencies().length),
            nextId: hex0x64(st._nextId || 0n),
        };
    }

    _divCurrencies() { return this.state._divCurrencies || []; }
    _checkpoint(id) { return this.state._checkpoint || {}; }
    _divIndex() { return this.state._dividendIndex || {}; }
    _deposited() { return this.state._deposited || {}; }

    // ---------- lazy derived register ----------
    // A SIIR id is real the moment its plan is issued. The full record is
    // derived: weight/createdAt/round from the plan, label/metadata from the
    // plan (unless overridden per id), owner from the owning segment.

    _plansRaw() { return this.state._plans || []; }

    segments() {
        return (this.state._segments || []).map((s) => s && ({
            start: s[0], end: s[1], owner: s[2],
        })).filter(Boolean);
    }

    overrides() { return this.state._siirs || {}; }  // id -> [label, metadataUri]

    _planStart() { return this.state._planStartId || {}; }
    _planEnd() { return this.state._planEndId || {}; }
    _planIssuedAt() { return this.state._planIssuedAt || {}; }
    _planCheckpoint() { return this.state._planCheckpoint || {}; }

    _planOf(id) {
        const starts = this._planStart();
        for (const k in starts) {
            const s = starts[k], e = this._planEnd()[k];
            if (s !== undefined && e !== undefined && id >= s && id <= e) return BigInt(k);
        }
        return null;
    }

    resolve(id) {
        const pid = this._planOf(id);
        if (pid === null) return null;
        const p = this._plansRaw()[Number(pid)];
        if (!p) return null;
        const ov = dictGet(this.overrides(), id, null);
        let owner = null;
        for (const seg of this.segments()) {
            if (id >= seg.start && id <= seg.end) { owner = seg.owner; break; }
        }
        if (!owner) return null;
        return {
            weight: String(p[1]),
            owner,
            createdAt: String(dictGet(this._planIssuedAt(), pid, 0n)),
            round: String(pid),
            label: ov ? (ov[0] || "") : (p[2] || ""),
            metadataUri: ov ? (ov[1] || "") : (this.state._metadataUri || ""),
        };
    }

    siir(id) { return this.resolve(id); }

    segmentsOf(owner) {
        return this.segments().filter((s) => s.owner === owner);
    }

    // ownership as compact ranges [{start, end}] — never per-id, so 10B
    // SIIRs enumerate in one record per range
    idsOf(owner) {
        return this.segmentsOf(owner).map((s) => ({ start: s.start, end: s.end }));
    }

    balanceOf(owner) {
        let n = 0n;
        for (const s of this.segmentsOf(owner)) n += s.end - s.start + 1n;
        return n;
    }

    _checkpointFlat(id) {
        return dictGet(this._checkpoint(), id) || {};
    }

    _checkpointFor(id, pid, cur) {
        const own = dictGet(this._checkpointFlat(id), cur, null);
        if (own !== null) return own;
        return dictGet(dictGet(this._planCheckpoint(), pid, {}), cur, 0n);
    }

    claimable(id) {
        const s = this.resolve(id);
        if (!s) return [[], []];
        const pid = this._planOf(id);
        const cur = [], amt = [];
        for (const c of this._divCurrencies()) {
            const idx = dictGet(this._divIndex(), c, 0n);
            const cp = this._checkpointFor(id, pid, c);
            const pending = (BigInt(s.weight) * (idx - cp)) / 1000000000n;
            cur.push(String(c));
            amt.push(pending.toString());
        }
        return [cur, amt];
    }

    claimableOf(owner) {
        const totals = {};
        const cs = this._divCurrencies();
        const owned = this.segmentsOf(owner);
        for (const seg of owned) {
            const pid = this._planOf(seg.start);
            if (pid === null) continue;
            const w = this._plansRaw()[Number(pid)][1];
            const n = seg.end - seg.start + 1n;
            for (const c of cs) {
                const k = String(c);
                const idx = dictGet(this._divIndex(), c, 0n);
                const cp = dictGet(dictGet(this._planCheckpoint(), pid, {}), c, 0n);
                totals[k] = (totals[k] || 0n) + (w * (idx - cp)) / 1000000000n * n;
            }
        }
        // per-id checkpoint overrides inside owned ranges: swap their plan
        // share for the individually-claimed share
        for (const oid in this.overrides()) {
            const ob = BigInt(oid);
            if (!owned.some((r) => ob >= r.start && ob <= r.end)) continue;
            const s = this.resolve(ob);
            if (!s) continue;
            const pid = this._planOf(ob);
            const w = BigInt(s.weight);
            for (const c of cs) {
                const k = String(c);
                if (dictGet(this._checkpointFlat(ob), c, null) === null) continue;
                const idx = dictGet(this._divIndex(), c, 0n);
                const cpOwn = this._checkpointFor(ob, pid, c);
                const cpPlan = dictGet(dictGet(this._planCheckpoint(), pid, {}), c, 0n);
                totals[k] = (totals[k] || 0n) + (w * (idx - cpOwn)) / 1000000000n
                    - (w * (idx - cpPlan)) / 1000000000n;
            }
        }
        return [
            cs.map((c) => String(c)),
            cs.map((c) => String(totals[String(c)] || 0n)),
        ];
    }

    dividends() {
        const ids = [], idx = [], dep = [];
        for (const c of this._divCurrencies()) {
            const k = String(c);
            ids.push(k);
            idx.push(String(dictGet(this._divIndex(), c, 0n)));
            dep.push(String(dictGet(this._deposited(), c, 0n)));
        }
        return { ids, indices: idx, deposits: dep };
    }

    plansAbi() {
        return (this.state._plans || []).map((p) => ({
            count: String(p[0]),
            weight: String(p[1]),
            label: p[2] || "",
            issued: !!p[3],
            image: p[4] || "",
        }));
    }

    history(id) {
        const h = this.state._history || {};
        const rh = this.state._rangeHistory || {};
        const entries = [];
        // range moves: every segment whose range contains the id contributed
        // one entry per transferRange that created it
        for (const seg of this.segments()) {
            if (id < seg.start || id > seg.end) continue;
            const rhh = rh[String(seg.start)] || {};
            for (const k in rhh) {
                const e = rhh[k];
                if (e) entries.push({ from: e[0] || "", to: e[1] || "", timestamp: String(dictGet(e, 2, 0n)) });
            }
        }
        // single-id transfers
        const cnt = dictGet(this.state._historyCount || {}, id, 0n);
        const hh = h[String(id)] || {};
        for (let i = 0n; i < cnt; i++) {
            const e = hh[String(i)];
            if (e) entries.push({ from: e[0] || "", to: e[1] || "", timestamp: String(dictGet(e, 2, 0n)) });
        }
        return entries;
    }

    contentInfo() {
        const stLen = (s) => (s === undefined || s === null ? 0 : new TextEncoder().encode(s).length);
        return {
            logoSize: String(stLen(this.state._logoImage)),
            siirImageSize: String(stLen(this.state._siirImage)),
            uiSize: String(stLen(this.state._ui)),
        };
    }

    charter() {
        return { charter: this.state._charter || "", ratified: !!this.state._charterRatified };
    }

    // every granted co-founder; the original founder is baked into the
    // address and never listed here
    coFounders() {
        return (this.state._coFounders || []).map((e) => ({
            wallet: e[0] || "",
            pubkey: hex0x64(e[1] || 0n),
            grantedAt: String(e[2] || 0n),
        }));
    }

    founderRights(wallet, pubkey) {
        const w = wallet || "";
        const p = pubkey ? hex0x64(pubkey) : "";
        for (const e of this.state._coFounders || []) {
            if (w && e[0] === w) return true;
            if (p && e[1] && hex0x64(e[1]) === p) return true;
        }
        return false;
    }

    async charterFingerprint() {
        const ch = this.state._charter || "";
        if (!ch) return "0";
        const root = this.rawCells._charter;
        if (!root) return "0";
        const h = await cellHash(new Cell("", [root]));
        return "0x" + toHex(h);
    }

    // Protocol-committed design digest (CompanySIIR.getDesignDigest): XOR of
    // sha256 atoms over the immutable design params — mirrors the contract's
    // designDigestOf(). Each atom = the TVM cell representation hash of the
    // value: sha256(d1 || d2 || data-with-completion-tag); d1 = refs count,
    // d2 = (bits/8)<<1 (byte-aligned). Integers use type-width bit length;
    // strings >127 bytes hash as a 127-byte ref chain (leaf depth 0).
    async designDigest() {
        const st = this.state || {};
        const enc = new TextEncoder();
        const sha = async (bytes) => new Uint8Array(await crypto.subtle.digest("SHA-256", bytes));
        const toBytes = (v, n) => {
            const out = new Uint8Array(n);
            let x = BigInt(v);
            for (let i = n - 1; i >= 0; i--) { out[i] = Number(x & 0xffn); x >>= 8n; }
            return out;
        };
        const xor = (a, b) => {
            const o = new Uint8Array(32);
            for (let i = 0; i < 32; i++) o[i] = a[i] ^ b[i];
            return o;
        };
        const atomInt = async (v, bits) =>
            await sha(new Uint8Array([0, bits / 4, ...toBytes(v, bits / 8)]));
        const atomBool = async (v) => await sha(new Uint8Array([0, 1, v ? 0xc0 : 0x40]));
        const atomBytes = async (data) => {
            if (!data.length) return await sha(new Uint8Array([0, 0]));
            if (data.length <= 127)
                return await sha(new Uint8Array([0, data.length * 2, ...data]));
            const chunks = [];
            for (let i = 0; i < data.length; i += 127) chunks.push(data.slice(i, i + 127));
            const tail = chunks[chunks.length - 1];
            let depth = 0;
            let hv = await sha(new Uint8Array([0, tail.length * 2, ...tail]));
            for (let i = chunks.length - 2; i >= 0; i--) {
                const c = chunks[i];
                hv = await sha(new Uint8Array([1, 254, ...c, depth >> 8, depth & 0xff, ...hv]));
                depth++;
            }
            return hv;
        };
        const raw = (s) => enc.encode(s || "");
        const st8 = (v) => Number(st[v] ?? 0n);
        let acc = await atomInt(st8("_issuanceModel"), 8);
        acc = xor(acc, await atomBool(!!st._governanceEnabled));
        acc = xor(acc, await atomInt(st8("_quorumPermille"), 16));
        acc = xor(acc, await atomInt(st8("_dissolutionRule"), 8));
        const dest = String(st._dissolutionDest || "").split(":")[1] || "0";
        acc = xor(acc, await atomInt(BigInt("0x" + dest), 256));
        for (const s of [st._name, st._description, st._website, st._metadataUri,
                         st._logoImage, st._siirImage, st._ui, st._charter]) {
            acc = xor(acc, await atomBytes(raw(s)));
        }
        const plans = st._plans || [];
        acc = xor(acc, await atomInt(plans.length, 16));
        for (const p of plans) {
            acc = xor(acc, await atomInt(p[0], 128));
            acc = xor(acc, await atomInt(p[1], 128));
            acc = xor(acc, await atomBytes(raw(p[2])));
            acc = xor(acc, await atomBytes(raw(p[4])));
        }
        const recomputed = toHex(acc);
        let committed = "";
        if (st._designDigest !== undefined && st._designDigest !== null && st._designDigest !== 0n) {
            committed = BigInt(st._designDigest).toString(16).padStart(64, "0");
        }
        return { committed, recomputed, match: !!committed && committed === recomputed };
    }

    async fingerprint(id) {
        const s = this.resolve(id);
        if (!s) return null;
        const bits = bin(BigInt(s.weight), 128) + bin(BigInt(s.createdAt), 64) + bin(BigInt(s.round), 32);
        const cell = new Cell(bits, []);
        for (const txt of [s.label || "", s.metadataUri || ""]) {
            const bytes = new TextEncoder().encode(txt);
            cell.refs.push(new Cell(bitsFromBytes(bytes, bytes.length * 8), []));
        }
        const h = await cellHash(cell);
        return "0x" + toHex(h);
    }

    full() {
        return {
            company: this.companyInfo(),
            plans: this.plansAbi(),
            content: this.contentInfo(),
        };
    }
}

// ---------- SIIRFactory state (company directory + marketplace) ----------

class FactoryState extends MirrorState {
    constructor(addr, net) {
        super(addr, FIELDS.SIIRFactory, net);
    }

    companyCount() { return String(this.state._companyCount || 0n); }

    marketplace() { return this.state._marketplace || ""; }

    ownerPubkey() { return hex0x64(this.state._ownerPubkey || 0n); }

    // directory: index -> [company, name, issuanceModel, founder]
    companies() {
        const m = this.state._companies || {};
        const out = [];
        for (const k in m) {
            const e = m[k];
            if (!e) continue;
            out.push({
                index: Number(k),
                address: dappAddr(this.dappId(), e[0]),
                name: e[1] || "",
                issuanceModel: String(e[2] || 0),
                founder: e[3] || "",
            });
        }
        out.sort((a, b) => a.index - b.index);
        return out;
    }

    company(addr) {
        return this.companies().find((c) => c.address === addr) || null;
    }

    dappId() { return this.address.split("::")[0]; }

    factoryInfo() {
        return {
            count: this.companyCount(),
            marketplace: dappAddr(this.dappId(), this.marketplace()),
            ownerPubkey: this.ownerPubkey(),
        };
    }
}

// ---------- SIIRMarketplace state (ask listings + buy offers) ----------

class MarketplaceState extends MirrorState {
    constructor(addr, net) {
        super(addr, FIELDS.SIIRMarketplace, net);
    }

    factoryAddr() { return this.state._factory || ""; }

    // the marketplace is a child of a self-rooted factory: its dapp-id is the
    // factory's own hash, so any standard address under it links as dapp::acct
    dappId() { return String(this.state._factory || "").split(":")[1] || ""; }

    listingCount() { return String(this.state._listingCount || 0n); }

    bidCount() { return String(this.state._bidCount || 0n); }

    listings() {
        const m = this.state._listings || {};
        const out = [];
        for (const k in m) {
            const l = m[k];
            if (!l) continue;
            out.push({
                id: k,
                company: dappAddr(this.dappId(), l[0]),
                siirId: String(l[1]),
                seller: l[2] || "",
                askPrice: String(l[3] || 0n),
                currencyId: String(l[4] || 0),
                listedAt: String(l[5] || 0n),
                active: !!l[6],
            });
        }
        out.sort((a, b) => Number(a.id) - Number(b.id));
        return out;
    }

    bids() {
        const m = this.state._bids || {};
        const out = [];
        for (const k in m) {
            const b = m[k];
            if (!b) continue;
            out.push({
                id: k,
                bidder: b[0] || "",
                company: dappAddr(this.dappId(), b[1]),
                siirId: String(b[2]),
                price: String(b[3] || 0n),
                currencyId: String(b[4] || 0),
                validUntil: String(b[5] || 0n),
                accepted: !!b[6],
            });
        }
        out.sort((a, b) => Number(a.id) - Number(b.id));
        return out;
    }
}

// ---------- cell building + BOC writing (for wallet actions) ----------

function crc32c(bytes) {
    const table = new Uint32Array(256);
    for (let i = 0; i < 256; i++) {
        let c = i;
        for (let k = 0; k < 8; k++) c = (c & 1) ? (0x82f63b78 ^ (c >>> 1)) : (c >>> 1);
        table[i] = c >>> 0;
    }
    let crc = 0xffffffff;
    for (const b of bytes) crc = (crc >>> 8) ^ table[(crc ^ b) & 0xff];
    return (crc ^ 0xffffffff) >>> 0;
}

class Builder {
    constructor() {
        this.bits = "";
        this.refs = [];
    }
    storeBits(bits) {
        this.bits += bits;
        return this;
    }
    storeUint(v, n) {
        this.bits += bin(v, n);
        return this;
    }
    storeBool(b) {
        this.bits += b ? "1" : "0";
        return this;
    }
    storeRef(cell) {
        this.refs.push(cell);
        return this;
    }
    asCell() {
        return new Cell(this.bits, this.refs);
    }
}

function bytesToB64(bytes) {
    let s = "";
    for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
    return btoa(s);
}

function writeBoc(root) {
    // SDK ordering: post-order children-first into a temp list, then reversed
    // (root first in the stream); refs = cells_count - temp_index - 1 (forward).
    // Identical cells (same bits + same refs) are deduped like the SDK writer.
    const temp = [];
    const seen = new Set();
    const postOrder = (c) => {
        if (seen.has(c)) return;
        seen.add(c);
        for (const r of c.refs) postOrder(r);
        temp.push(c);
    };
    postOrder(root);
    const fpOf = (c) => c.bits + ":" + c.refs.map((r) => fpOf(r)).join("|");
    const uniq = [];
    const fpMap = new Map();
    const remap = new Map();
    for (const c of temp) {
        const fp = fpOf(c);
        if (fpMap.has(fp)) { remap.set(c, fpMap.get(fp)); continue; }
        fpMap.set(fp, c);
        uniq.push(c);
    }
    const tempIndex = new Map(uniq.map((c, i) => [c, i]));
    const cells = uniq.slice().reverse();
    let refSize = 1;
    while (cells.length > (1 << (8 * refSize)) - 1) refSize++;

    const dataParts = []; // [bytes, bitLen]
    for (const c of cells) {
        const n = c.bits.length;
        let dataBytes;
        if (n % 8 === 0) dataBytes = bytesFromBits(c.bits);
        else dataBytes = bytesFromBits(c.bits + "1" + "0".repeat(7 - (n % 8)));
        dataParts.push([dataBytes, n]);
    }
    const totSize = dataParts.reduce((a, [d]) => a + d.length, 0)
        + cells.reduce((a, c) => a + 2 + c.refs.length * refSize, 0);
    let offsetSize = 1;
    while (totSize > (1 << (8 * offsetSize)) - 1) offsetSize++;

    const out = [];
    const w = (arr) => { for (const b of arr) out.push(b); };
    w([0xb5, 0xee, 0x9c, 0x72]);
    w([refSize]); // no index, no crc (SDK convention)
    w([offsetSize]);
    const pushSize = (v) => {
        for (let i = refSize - 1; i >= 0; i--) w([(v >>> (8 * i)) & 0xff]);
    };
    pushSize(cells.length);
    pushSize(1);
    pushSize(0);
    for (let i = offsetSize - 1; i >= 0; i--) w([(totSize >>> (8 * i)) & 0xff]);
    pushSize(0); // root index (root is first in stream)

    for (let i = 0; i < cells.length; i++) {
        const c = cells[i];
        const [dataBytes, bitLen] = dataParts[i];
        const d1 = c.refs.length & 0x07;
        const tag = bitLen % 8 !== 0;
        const d2 = ((bitLen >> 3) << 1) | (tag ? 1 : 0);
        w([d1, d2]);
        for (const b of dataBytes) w([b]);
        for (const r of c.refs) pushSize(cells.length - tempIndex.get(remap.get(r) || r) - 1);
    }
    return Uint8Array.from(out);
}

// hashmapE dict: entries [{key: BigInt, value: bit-string}], keyBits bit keys.
function buildDict(entries, keyBits) {
    if (!entries.length) return new Cell("", []);
    const k = keyBits.toString(2).length; // label length field width
    const keys = entries.map((e) => bin(e.key, keyBits));
    const vals = entries.map((e) => e.value);

    const hml = (prefix, rem) => {
        const len = prefix.length;
        const nf = bin(len, k);
        if (len === 0) return "00"; // hml_short, unary 0
        const same = /^([01])\1*$/.test(prefix);
        if (same) return "11" + prefix[0] + nf;
        return "10" + nf + prefix;
    };

    const rec = (idxList, rem) => {
        if (idxList.length === 1) {
            const i = idxList[0];
            const label = keys[i].slice(keyBits - rem);
            return new Cell(hml(label, rem) + vals[i], []);
        }
        // common prefix over the remaining bits of the sorted keys
        let p = keyBits - rem;
        let prefix = "";
        while (p < keyBits) {
            const b = keys[idxList[0]][p];
            if (!idxList.every((i) => keys[i][p] === b)) break;
            prefix += b;
            p++;
        }
        const left = [], right = [];
        for (const i of idxList) (keys[i][p] === "0" ? left : right).push(i);
        const cell = new Cell(hml(prefix, rem), [
            rec(left, rem - prefix.length - 1),
            rec(right, rem - prefix.length - 1),
        ]);
        return cell;
    };

    const order = entries.map((_, i) => i).sort((a, b) => (keys[a] < keys[b] ? -1 : 1));
    return rec(order, keyBits);
}

// "0:hex"/"-1:hex" -> 267-bit std address [10][0 anycast][wc][addr]
function addrToBits(addr) {
    const [wcS, hex] = String(addr).split(":");
    const wc = BigInt(wcS);
    return "10" + "0" + (wc === -1n ? bin(255, 8) : bin(0, 8)) + bin(BigInt("0x" + hex), 256);
}

function addrToBitsNoTag(addr) {
    const [wcS, hex] = String(addr).split(":");
    const wc = BigInt(wcS);
    return (wc === -1n ? bin(255, 8) : bin(0, 8)) + bin(BigInt("0x" + hex), 256);
}

const XP = {
    MirrorState, FactoryState, MarketplaceState,
    parseBoc, cellHash, cellDepth, computeCellBreaks, decodeDict, dappAddr,
    Builder, writeBoc, buildDict, addrToBits, addrToBitsNoTag,
    bytesToB64, crc32c, bin, bitsFromBytes, bytesFromBits, Cell, toHex,
};
if (typeof module !== "undefined" && module.exports) module.exports = XP;