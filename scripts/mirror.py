#!/usr/bin/env python3
"""
mirror.py - read-only mirror-node client for CompanySIIR contracts.

Fetches a company's full account state with ONE GraphQL call to the Acki
Nacki mirror node, decodes the contract data cell per the ABI `fields`
layout, and reconstructs every getter result locally:

  * getCompanyInfo, getDividendCurrencies, getPlans, getContentInfo
  * getSIIR / getOwnerOf / getBalanceOf / getSIIRsOf
  * getClaimable / getClaimableOf   (weight * (index - checkpoint) / SCALE)
  * getHistory, getFingerprint      (tvm.hash of the ABI-encoded tuple)
  * getCompanyImage / getSIIRImage / getUI / getCharter / getCharterFingerprint

No tvm-cli, no subprocesses: the whole register is decoded from one
state snapshot. Pure stdlib (urllib + hashlib).

Usage:
    from mirror import MirrorState
    ms = MirrorState(addr, abi_path, net="shellnet.ackinacki.org")
    ms.company_info()        # -> dict shaped like tvm-cli getCompanyInfo
    ms.siir(1)               # -> dict shaped like tvm-cli getSIIR
"""

import base64
import hashlib
import json
import re
import sys
import urllib.request


class Cell:
    __slots__ = ("bits", "refs")

    def __init__(self, bits, refs):
        self.bits = bits
        self.refs = refs

    def __repr__(self):
        return f"<Cell bits={len(self.bits)} refs={len(self.refs)}>"


BOC_GENERIC_TAG = 0xB5EE9C72
BOC_GENERIC_V2_TAG = 0xB6FF9A73  # with big cells

def parse_boc(data):
    """Parse a bag-of-cells into (root Cell, [Cell]).

    Header per tvm_types/boc.rs BocReader::read_header (acki fork):

      magic u32 | first_byte | offset_size
      cells_count, roots_count, absent_count : ##(ref_size * 8)
      tot_cells_size : ##(offset_size * 8)
      [big_cells_count, big_cells_size]
      roots_indexes : roots_count * ref_size
      [index : cells_count * offset_size]   (if index_included)
      cells | [crc32c u32]                  (if has_crc)

    first_byte: bit7 index_included, bit6 has_crc, bit5 cache bits,
                bits3-4 flags (must be 0), bits0-2 ref_size.

    Cell descriptor: d1: bit7-6 level mask, bit4 store_hashes, bit3 exotic,
    bits0-2 refs_count; d1 == 13 (0b1101) marks a big cell (3-byte len
    follows, no d2). d2: bit0 "tag completed" (bit len not a multiple of
    8), bits1-7 = byte len / 2. When tag-completed the bit length is found
    by find_tag() scanning back from the end of the data.
    """
    if isinstance(data, str):
        data = base64.b64decode(data)
    if isinstance(data, bytes) and data[:4] in (b"te6c", b"te6s"):
        data = base64.b64decode(data[4:])
    magic = int.from_bytes(data[:4], "big")
    if magic not in (BOC_GENERIC_TAG, BOC_GENERIC_V2_TAG):
        raise ValueError("not a BOC (magic 0x%08x)" % magic)
    pos = [4]

    def byte():
        b = data[pos[0]]
        pos[0] += 1
        return b

    def be(n):
        v = int.from_bytes(data[pos[0]:pos[0] + n], "big")
        pos[0] += n
        return v

    first = byte()
    index_included = bool(first & 0x80)
    has_crc = bool(first & 0x40)
    ref_size = first & 0x07
    if (first & 0x18) != 0:
        raise ValueError("non-zero flags field is not supported")
    if ref_size == 0 or ref_size > 4:
        raise ValueError("invalid ref size %d" % ref_size)
    offset_size = byte()
    if offset_size == 0 or offset_size > 8:
        raise ValueError("invalid offset size %d" % offset_size)

    cells_count = be(ref_size)
    roots_count = be(ref_size)
    be(ref_size)  # absent cells (must be 0)
    be(offset_size)  # tot_cells_size (validated implicitly by exact parse)
    has_big = magic == BOC_GENERIC_V2_TAG
    if has_big:
        be(ref_size)  # big_cells_count
        be(offset_size)  # big_cells_size
    if cells_count == 0 or roots_count == 0:
        raise ValueError("empty BOC")
    roots_indexes = [be(ref_size) for _ in range(roots_count)]
    if index_included:
        pos[0] += cells_count * offset_size

    def find_tag(bits):
        length = len(bits) * 8
        for x in reversed(bits):
            if x == 0:
                length -= 8
            else:
                skip = 1
                mask = 1
                while (x & mask) == 0:
                    skip += 1
                    mask <<= 1
                length -= skip
                break
        return length

    raw_cells = []
    for _ in range(cells_count):
        d1 = byte()
        if d1 == 13:  # big cell: d1 + 3-byte length, no d2, refs implied 0
            length = be(3)
            data_bytes = data[pos[0]:pos[0] + length]
            pos[0] += length
            raw_cells.append((d1, length * 8, [], data_bytes))
            continue
        d2 = byte()
        refs_n = d1 & 0x07
        store_hashes = bool(d1 & 0x10)
        if store_hashes:
            raise ValueError("cell hashes not supported")
        byte_len = d2 >> 1
        if d2 & 1:
            bit_len = None
            byte_len += 1
        else:
            bit_len = byte_len * 8
        data_bytes = data[pos[0]:pos[0] + byte_len]
        pos[0] += byte_len
        if bit_len is None:
            bit_len = find_tag(data_bytes)
        ref_idx = [be(ref_size) for _ in range(refs_n)]
        raw_cells.append((d1, bit_len, ref_idx, data_bytes))

    if has_crc:
        pos[0] += 4

    cell_objs = [Cell(None, None)] * cells_count
    for i, (_, bit_len, ref_idx, _) in enumerate(raw_cells):
        bit_str = "".join(f"{b:08b}" for b in raw_cells[i][3])[:bit_len]
        cell_objs[i] = Cell(bit_str, [])
    for i, (_, _, ref_idx, _) in enumerate(raw_cells):
        cell_objs[i].refs = [cell_objs[j] for j in ref_idx]
    return cell_objs[roots_indexes[0]], cell_objs


def cell_depth(cell):
    """TVM cell depth: 0 for leaves, else 1 + max(depth of refs)."""
    if not cell.refs:
        return 0
    return 1 + max(cell_depth(r) for r in cell.refs)


def cell_hash(cell):
    """TVM representation hash of a cell (sha256 of descriptor+data+depth+
    hash of each of its references). d1/d2 per tvm-sdk cell/mod.rs
    calc_d1/calc_d2; the data is padded with a marker 1 bit when the bit
    length is not byte-aligned; each ref contributes its 16-bit depth then
    its 32-byte hash (data_cell.rs hash calculation)."""
    n = len(cell.bits)
    tag = n % 8 != 0
    data_bits = cell.bits
    if tag:
        data_bits += "1" + "0" * (7 - n % 8)
    d1 = len(cell.refs) & 0x07  # level 0, ordinary cell
    d2 = ((n // 8) << 1) + tag
    packed = (
        bytes([d1, d2])
        + bytes(int(data_bits[i:i + 8], 2) for i in range(0, len(data_bits), 8))
        + b"".join(cell_depth(r).to_bytes(2, "big") for r in cell.refs)
        + b"".join(cell_hash(r) for r in cell.refs)
    )
    return hashlib.sha256(packed).digest()


class Slice:
    def __init__(self, cell, bit_offset=0, bits=None):
        self.cell = cell
        self.off = bit_offset
        self._bits = bits if bits is not None else cell.bits

    def remaining(self):
        return len(self._bits) - self.off

    def read_bit(self):
        b = self._bits[self.off]
        self.off += 1
        return b

    def read_uint(self, n):
        v = int(self._bits[self.off:self.off + n] or "0", 2)
        self.off += n
        return v

    def read_bool(self):
        return self.read_bit() == "1"

    def read_string(self):
        n = self.read_uint(32)
        bytes_ = bytearray()
        for _ in range(n):
            bytes_.append(self.read_uint(8))
        return bytes(bytes_).decode("utf-8", "replace")

    def read_address(self):
        """MsgAddressInt (TVM): 00 addr_none, 01 addr_extern,
        10 addr_std (anycast + workchain:int8 + addr:256), 11 addr_var."""
        tag = self.read_uint(2)
        if tag == 2:  # addr_std
            self.off += 1  # anycast (absent here)
            wc = self.read_uint(8)
            if wc == 255:
                wc = -1
            addr = self.read_uint(256)
            return f"{wc}:{addr:064x}"
        if tag == 3:  # addr_var
            self.off += 1
            n = self.read_uint(9)
            addr = self.read_uint(n)
            return f"0:{addr:064x}"
        return None

    def read_ref(self):
        return self.cell.refs[0]

    def load_ref(self):
        r = self.cell.refs[self.off_ref]
        self.off_ref += 1
        return r


def abi_decode(field, sl, decode_map):
    """Decode one ABI field (dict with name/type/components) from a slice."""
    t = field["type"]
    if t.startswith("uint") or t.startswith("int"):
        n = int(t[4:] or 256)
        return sl.read_uint(n)
    if t == "bool":
        return sl.read_bool()
    if t == "address":
        return sl.read_address()
    if t == "string":
        return sl.read_string()
    if t == "bytes":
        n = sl.read_uint(32)
        return bytes(sl.read_uint(8) for _ in range(n)).hex()
    if t.startswith("map("):
        return decode_map(sl)
    if t == "tuple":
        return [abi_decode(f, sl, decode_map) for f in field["components"]]
    if t.endswith("[]"):
        return decode_array(sl, field["components"], decode_map)
    raise ValueError(f"unsupported ABI type {t}")


def read_label(bits, off, maxv):
    """SDK HmLabel reader (dictionary/mod.rs read_label) with
    k = maxv.bit_length() (get_next_size). Returns (label, offset_after)."""
    if off >= len(bits):
        return "", off
    if bits[off] == "0":  # hml_short: 0 {1^n} 0 label
        off += 1
        n = 0
        while off < len(bits) and bits[off] == "1":
            n += 1
            off += 1
        if off < len(bits):
            off += 1
        return bits[off:off + n], off + n
    k = maxv.bit_length() if maxv else 0
    if off + 1 >= len(bits) or off + 3 > len(bits):
        return "", len(bits)
    if bits[off + 1] == "0":  # hml_long: 10 len(k) label
        n = int(bits[off + 2:off + 2 + k] or "0", 2)
        return bits[off + 2 + k:off + 2 + k + n], off + 2 + k + n
    # hml_same: 11 value 1 + len(k)
    v = bits[off + 2]
    n = int(bits[off + 3:off + 3 + k] or "0", 2)
    return v * n, off + 3 + k


def decode_dict(cell, key_bits, value_decoder, value_in_ref=False):
    """Decode a hashmapE (iterate_internal semantics).
    cell = dict root (1 = present, 0 = empty); keys are ints.
    value_in_ref: leaf values live in the leaf's single ref (compiler
    doesDictStoreValueInRef) instead of inline after the label."""
    result = {}
    if not cell or cell.bits[0] == "0":
        return result
    _walk_dict(cell, key_bits, value_decoder, result, "", key_bits, value_in_ref)
    return result


def _walk_dict(cell, key_bits, value_decoder, out, prefix="", bit_len=None,
               value_in_ref=False):
    """iterate_internal(dictionary/mod.rs): read label at current bit_len;
    remaining == 0 -> leaf; else bit_len -= 1 and branch on next bit into
    refs[0]/refs[1]."""
    if bit_len is None:
        bit_len = key_bits
    label, off = read_label(cell.bits, 0, bit_len)
    prefix += label
    remaining = bit_len - len(label)
    if remaining == 0:
        # leaf edge: value after the label. If stored value-in-ref the leaf
        # holds only a bare ref; otherwise the value is the rest (bits+refs).
        if value_in_ref and cell.refs:
            val = value_decoder(Slice(cell.refs[0]))
        else:
            val = value_decoder(Slice(Cell(cell.bits[off:], cell.refs)))
        out[int(prefix or "0", 2)] = val
        return
    remaining -= 1  # one branch bit consumed
    for bi in (0, 1):
        if bi < len(cell.refs):
            _walk_dict(cell.refs[bi], key_bits, value_decoder, out,
                       prefix + str(bi), remaining, value_in_ref)


def decode_array(sl, components, decode_map):
    """Dynamic array: length (uint32) + dict keyed by uint32.
    Layout: 32-bit length then hashmapE<uint32, T>. The dict root is a
    irect cell ref; if length is 0 no dict cells are stored."""
    n = sl.read_uint(32)
    out = []
    if n == 0:
        return out
    # dict root follows
    raise NotImplementedError  # handled in mirror.py _decode via layout


def cell_from_bits(bits, refs=()):
    return Cell(bits, list(refs))


def abi_type_size(t):
    """(maxBits, maxRefs) per compiler ABITypeSize (TVMCommons.cpp)."""
    if t.endswith("[]"):
        return (33, 1)  # dynamic array: 32-bit length + 1-bit present
    if t.startswith("uint") or t.startswith("int"):
        n = int(t[4:] or 256)
        return (n, 0)
    if t == "bool":
        return (1, 0)
    if t == "address":
        return (591, 0)  # AddressInfo::maxBitLength (anycast var worst case)
    if t == "string" or t == "bytes":
        return (0, 1)
    if t.startswith("map("):
        return (1, 1)
    if t == "tuple":
        return (0, 0)
    raise ValueError(f"unsupported ABI type {t}")


def compute_cell_breaks(fields, bit_offset):
    """Replicate DecodePositionAbiV2 (TVMABI.cpp): for each field decide
    whether it starts a new cell (LDREF chain). CellBitLength=1023, max 4 refs."""
    n = len(fields)
    sizes = [abi_type_size(f["type"]) for f in fields]
    suf_b = [0] * (n + 1)
    suf_r = [0] * (n + 1)
    for i in range(n - 1, -1, -1):
        suf_b[i] = suf_b[i + 1] + sizes[i][0]
        suf_r[i] = suf_r[i + 1] + sizes[i][1]
    bits, refs = bit_offset, 0
    breaks = [False] * n
    for i in range(n):
        mb, mr = sizes[i]
        if bits + suf_b[i] <= 1023 and refs + suf_r[i] <= 4:
            bits += mb
            refs += mr
        else:
            bits += mb
            refs += mr
            if bits > 1023 or refs >= 4:
                breaks[i] = True
                bits, refs = mb, mr
    return breaks


class MirrorState:
    """One contract's decoded state, fetched from the mirror node."""

    def __init__(self, address, abi, net="shellnet.ackinacki.org", timeout=30):
        self.address = address
        self.net = net
        self.timeout = timeout
        self.abi = abi if isinstance(abi, dict) else json.load(open(abi))
        self.fields = self.abi.get("fields", [])
        self.state = {}
        self._raw_cells = {}
        self._decode()

    def _fetch_data(self):
        dapp, acct = self.address.split("::")
        q = (
            '{blockchain{account(dapp_id:"%s",account_id:"%s"){info{data}}}}'
            % (dapp, acct)
        )
        req = urllib.request.Request(
            f"https://{self.net}/graphql",
            data=json.dumps({"query": q}).encode(),
            headers={
                "Content-Type": "application/json",
                "User-Agent": (
                    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 "
                    "(KHTML, like Gecko) Chrome/120.0 Safari/537.36"
                ),
            },
        )
        with urllib.request.urlopen(req, timeout=self.timeout) as r:
            body = json.loads(r.read())
        data = body["data"]["blockchain"]["account"]["info"]["data"]
        if not data:
            raise ValueError("account has no data (not active / not found)")
        return data

    @staticmethod
    def _raw_string(cell):
        """String stored as raw ASCII bytes in a cell (data + ref chain)."""
        out = ""
        while cell is not None:
            out += "".join(chr(int(cell.bits[i:i + 8], 2))
                           for i in range(0, len(cell.bits) // 8 * 8, 8))
            cell = cell.refs[0] if cell.refs else None
        return out.rstrip("\x00")

    def _decode(self):
        root, cells = parse_boc(self._fetch_data())
        self._cells = cells

        # C4 header (getOffsetC4): pubkey 256 + timestamp 64 + ctor flag 1.
        fields = self.fields
        head_bits = 0
        head_n = 0
        for f in fields:
            if head_bits == 0 and "pubkey" in f["name"]:
                head_bits += 256
                head_n += 1
                continue
            if head_bits == 256 and "timestamp" in f["name"]:
                head_bits += 64
                head_n += 1
                continue
            if head_bits == 320 and "constructor" in f["name"]:
                head_bits += 1
                head_n += 1
                continue
            break

        body = fields[head_n:]
        breaks = compute_cell_breaks(body, head_bits)

        cur = root
        bit_off = head_bits
        ref_idx = 0
        for i, f in enumerate(body):
            name, t = f["name"], f["type"]
            try:
                if breaks[i]:
                    cur = cur.refs[ref_idx]
                    ref_idx = 0
                    bit_off = 0
                if t.endswith("[]"):
                    n_ = int(cur.bits[bit_off:bit_off + 32] or "0", 2)
                    present = cur.bits[bit_off + 32]
                    bit_off += 33
                    if present == "0" or n_ == 0:
                        self.state[name] = []
                        continue
                    r = cur.refs[ref_idx]
                    ref_idx += 1
                    et = t[:-2]
                    if et == "tuple":
                        comps = f.get("components") or []
                        vref = not (12 + 32 + sum(self._maxbits(c["type"])
                                                  for c in comps) < 1023)
                        dec = lambda v: self._decode_tuple(comps, v)
                    else:
                        vref = not (12 + 32 + self._maxbits(et) < 1023)
                        dec = lambda v: self._decode_scalar(et, v)
                    arr = decode_dict(r, 32, dec, vref)
                    self.state[name] = [arr.get(i) for i in range(n_)]
                elif t.startswith("uint") or t == "int8" or t.startswith("int"):
                    n = int(t[4:] or 256)
                    self.state[name] = int(cur.bits[bit_off:bit_off + n] or "0", 2)
                    bit_off += n
                elif t == "bool":
                    self.state[name] = cur.bits[bit_off] == "1"
                    bit_off += 1
                elif t == "address":
                    wc_b = cur.bits[bit_off:bit_off + 2]
                    anyc = cur.bits[bit_off + 2]
                    wc = int(cur.bits[bit_off + 3:bit_off + 11], 2)
                    addr = int(cur.bits[bit_off + 11:bit_off + 267], 2)
                    if wc == 255:
                        wc = -1
                    if wc_b == "10":
                        self.state[name] = f"{wc}:{addr:064x}"
                    else:
                        self.state[name] = None
                    bit_off += 267
                elif t == "string":
                    r = cur.refs[ref_idx]
                    ref_idx += 1
                    self.state[name] = self._raw_string(r)
                    self._raw_cells[name] = r
                elif t.startswith("map("):
                    if cur.bits[bit_off] == "0":
                        self.state[name] = {}
                        bit_off += 1
                        continue
                    bit_off += 1
                    r = cur.refs[ref_idx]
                    ref_idx += 1
                    self.state[name] = self._decode_map_field(f, r)
                else:
                    self.state[name] = None
            except Exception:
                self.state[name] = None

    def _decode_tuple(self, comps, sl):
        """Decode a tuple/struct value stored as a slice (cell + refs).
        The compiler lays tuple members out with the same
        DecodePositionAbiV2 (TVMABI.cpp:571) used for C4: when a member's
        max bits would overflow the cell it starts a new builder stored as
        the slice's next ref. Strings also consume one ref each, in order."""
        breaks = compute_cell_breaks(comps, 0)
        vals = []
        ref_idx = 0
        for i, c in enumerate(comps):
            if breaks[i]:
                if ref_idx >= len(sl.cell.refs):
                    break
                sl = Slice(sl.cell.refs[ref_idx])
                ref_idx = 0
            t = c["type"]
            if t == "string":
                if ref_idx < len(sl.cell.refs):
                    vals.append(self._raw_string(sl.cell.refs[ref_idx]))
                    ref_idx += 1
                else:
                    vals.append("")
            elif t.startswith("uint") or t.startswith("int"):
                n = int(t[4:] or 256)
                vals.append(sl.read_uint(n))
            elif t == "bool":
                vals.append(sl.read_bool())
            elif t == "address":
                vals.append(sl.read_address())
            elif t == "tuple":
                vals.append(self._decode_tuple(c.get("components", []), sl))
            else:
                vals.append(None)
        return vals

    def _maxbits(self, t):
        """Per-compiler ABITypeSize.maxBits (TVMCommons.cpp:381)."""
        if t.startswith("uint") or t.startswith("int"):
            return int(t[4:] or 256)
        if t == "bool":
            return 1
        if t == "address":
            return 591  # AddressInfo::maxBitLength
        return 0  # string/bytes contribute no bits

    def _value_decoder(self, vt, key_bits, comps):
        """(value_in_ref, decoder) replicating compiler
        doesDictStoreValueInRef (TVMPusher.cpp:253): a value is stored in a
        dict leaf's single ref when 12 + keyLength + maxBits(value) >= 1023
        (MAX_HASH_MAP_INFO_ABOUT_KEY + key + value not fitting one cell)."""
        if vt == "tuple":
            if comps and isinstance(comps[0], dict) and "components" in comps[0]:
                comps = comps[0]["components"]
            mb = sum(self._maxbits(c["type"]) for c in comps)
            return not (12 + key_bits + mb < 1023), \
                lambda v: self._decode_tuple(comps, v)
        if vt.startswith("map("):
            m2 = re.match(r"map\((\w+),(.+)\)$", vt)
            ik, iv = m2.group(1), m2.group(2)
            inner_bits = int(ik[4:])
            inner_ref, inner_dec = self._value_decoder(iv, inner_bits, comps)

            def nested(v):
                # mapping value: 1 present bit + ref to the nested dict root
                if v.cell.bits[:1] != "1" or not v.cell.refs:
                    return {}
                return decode_dict(v.cell.refs[0], inner_bits, inner_dec,
                                   inner_ref)

            return not (12 + key_bits + 1 < 1023), nested
        return not (12 + key_bits + self._maxbits(vt) < 1023), \
            lambda v: self._decode_scalar(vt, v)

    def _decode_map_field(self, field, cell):
        m = re.match(r"map\((\w+),(.+)\)$", field["type"])
        if not m:
            return None
        kt, vt = m.group(1), m.group(2)
        key_bits = int(kt[4:])
        comps = field.get("components") or []
        vref, dec = self._value_decoder(vt, key_bits, comps)
        return decode_dict(cell, key_bits, dec, vref)

    @staticmethod
    def _decode_scalar(t, sl):
        if t.startswith("uint") or t.startswith("int"):
            return sl.read_uint(int(t[4:] or 256))
        if t == "bool":
            return sl.read_bool()
        if t == "address":
            return sl.read_address()
        return None

    # ---------- derived getters (mirror the contract) ----------

    def _siirs(self):
        return self.state.get("_siirs") or {}

    def company_info(self):
        st = self.state
        return {
            "name": st.get("_name") or "",
            "description": st.get("_description") or "",
            "website": st.get("_website") or "",
            "metadataUri": st.get("_metadataUri") or "",
            "factory": st.get("_factory") or "",
            "founder": st.get("_founder") or "",
            "founderPubkey": f"0x{st.get('_founderPubkey') or 0:064x}",
            "issuanceModel": str(st.get("_issuanceModel") or 0),
            "totalWeight": str(st.get("_totalWeight") or 0),
            "issuedCount": str(st.get("_issuedCount") or 0),
            "dividendIndex": str(self._div_index().get(2, 0)),  # CURRENCY_SHELL
            "deposited": str(self._deposited().get(2, 0)),
            "dividendCount": str(len(self._div_currencies())),
            "nextId": f"0x{st.get('_nextId') or 0:064x}",
        }

    def _div_currencies(self):
        return self.state.get("_divCurrencies") or []

    def _checkpoint(self, id):
        m = self.state.get("_checkpoint") or {}
        return m.get(id) or {}

    def _checkpoint_flat(self, id):
        return self._checkpoint(id)

    def _div_index(self):
        return self.state.get("_dividendIndex") or {}

    def _deposited(self):
        return self.state.get("_deposited") or {}

    def siir(self, id):
        s = self._siirs().get(id)
        if not s:
            return None
        return {
            "weight": str(s[0]),
            "owner": s[1],
            "createdAt": str(s[2]),
            "round": str(s[3]),
            "label": s[4] or "",
            "metadataUri": s[5] or "",
        }

    def owner_of(self, id):
        s = self._siirs().get(id)
        return s[1] if s else None

    def balance_of(self, owner):
        return len(self.ids_of(owner))

    def ids_of(self, owner):
        return [i for i, s in self._siirs().items() if s and s[1] == owner]

    def claimable(self, id):
        s = self._siirs().get(id)
        if not s:
            return [], []
        cur, amt = [], []
        for c in self._div_currencies():
            idx = self._div_index().get(c, 0)
            cp = self._checkpoint_flat(id).get(c, 0)
            pending = s[0] * (idx - cp) // 1_000_000_000
            cur.append(str(c))
            amt.append(str(pending))
        return cur, amt

    def claimable_of(self, owner):
        totals = {}
        for id in self.ids_of(owner):
            c_, a_ = self.claimable(id)
            for c, a in zip(c_, a_):
                totals[str(c)] = totals.get(str(c), 0) + int(a)
        return [str(c) for c in self._div_currencies()], [str(totals.get(str(c), 0)) for c in self._div_currencies()]

    def dividends(self):
        ids, idx, dep = [], [], []
        for c in self._div_currencies():
            ids.append(str(c))
            idx.append(str(self._div_index().get(c, 0)))
            dep.append(str(self._deposited().get(c, 0)))
        return {"ids": ids, "indices": idx, "deposits": dep}

    def plans(self):
        return self.state.get("_plans") or []

    def plans_abi(self):
        out = []
        for p in self.state.get("_plans") or []:
            out.append({
                "count": str(p[0]),
                "weight": str(p[1]),
                "label": p[2] or "",
                "issued": bool(p[3]),
            })
        return out

    def history(self, id):
        h = self.state.get("_history") or {}
        n = self.state.get("_historyCount") or {}
        cnt = n.get(id, 0)
        hh = h.get(id) or {}
        entries = []
        for i in range(cnt):
            e = hh.get(i)
            if e:
                entries.append({"from": e[0], "to": e[1], "timestamp": str(e[2])})
        return entries

    def content_info(self):
        return {
            "logoSize": str(len((self.state.get("_logoImage") or "").encode())),
            "siirImageSize": str(len((self.state.get("_siirImage") or "").encode())),
            "uiSize": str(len((self.state.get("_ui") or "").encode())),
        }

    def charter(self):
        return {
            "charter": self.state.get("_charter") or "",
            "ratified": bool(self.state.get("_charterRatified")),
        }

    def charter_fingerprint(self):
        ch = self.state.get("_charter") or ""
        if not ch:
            return "0"
        # tvm.hash(abi.encode(charter)): abi.encode of a single string is a
        # cell with 0 bits + 1 ref (the string's cell chain).
        return "0x" + cell_hash(Cell("", [self._raw_cells["_charter"]])).hex()

    def fingerprint(self, id):
        s = self._siirs().get(id)
        if not s:
            return None
        # abi.encode(weight, createdAt, round, label, metadataUri):
        # ints inline (224 bits), strings stored as bare refs (raw bytes,
        # no length prefix) in the same cell.
        bits = f"{s[0]:0128b}{s[2]:064b}{s[3]:032b}"
        cell = Cell(bits, [])
        for txt in (s[4] or "", s[5] or ""):
            b = txt.encode()
            cell.refs.append(Cell("".join(f"{x:08b}" for x in b), []))
        return "0x" + cell_hash(cell).hex()

    def version(self):
        return ("", "")

    def full(self):
        info = self.company_info()
        return {
            "company": info,
            "treasury": list(zip(self.dividends()["ids"], self.dividends()["indices"], self.dividends()["deposits"])),
            "plans": self.plans_abi(),
            "content": self.content_info(),
            "version": self.version(),
        }


if __name__ == "__main__":
    ms = MirrorState(
        sys.argv[1],
        "/home/kodics/SIIR/contracts/CompanySIIR.abi.json",
        net=sys.argv[2] if len(sys.argv) > 2 else "shellnet.ackinacki.org",
    )
    print(json.dumps(ms.company_info(), indent=1))
