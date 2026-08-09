# Decoding Acki Nacki shellnet: account-state BOCs, cell format, and message transport

> How to read the mirror node's account state and submit transactions without
> tvm-cli. Written after fully decoding the format on 2026-08-05 against
> `shellnet.ackinacki.org` (the SIIR project's "mirror-node hardening" task).
> If you ever need to parse account state from an Acki Nacki GraphQL mirror,
> or send an external message directly, this document is the shortcut.

---

## 1. The problem

The SIIR gateway (`scripts/gateway.py`) spawns `tvm-cli run <addr> <method>`
for every getter. Each spawn is ~30s of a full Rust process + GraphQL round
trip. We wanted a fast in-process mirror-node client (`scripts/mirror.py`)
that does ONE GraphQL call per company, decodes the account's persistent
state (a BOC), and computes every getter result locally.

The blocker:

```
Mirror node GraphQL works: blockchain.account(dapp_id, account_id)
returns info.data = the contract persistent-state BOC.
Blocked on decoding the BOC: the header is NOT standard te6.
Header bytes at offset 4: 01 02 41 01 00 09 9a 00 01 93 00 ...
— no known varuint scheme (count-prefix, LEB128 bit7, bit6) produces
sane counts from it.
```

That note was wrong in one crucial way: **the header IS standard**. The
parser we had tried varuint-encoded sizes; the format uses **fixed-width**
sizes. The fix unlocks everything else.

---

## 2. The blocker, dissected

A naive BOC parser (like the old `parse_boc` in `mirror.py`) reads the header
like this (varuint / count-prefix scheme):

```
magic b5ee9c72
flags_ver  = 0x01
n          = byte() + 1   # 0x02 + 1 = 3
cell_count = next 3 bytes # 0x410100 = 4,260,096 cells  ← nonsense
```

`4,260,096` cells is the kind of "no known varuint scheme produces sane
counts" dead end that was hit. The error was assuming the sizes are
varuint (length-prefixed) instead of fixed-width integers whose width is
announced by two one-byte fields at the start of the header.

---

## 3. The breakthrough: the header, correctly

The authoritative format is `BocReader::read_header` in
`tvmlabs/tvm-sdk` → `tvm_types/src/boc.rs` (line 1051). For our blob:

```
bytes:  b5 ee 9c 72 | 01 | 02 | 41 | 01 | 00 | 09 9a | 00 | 01 93 00 00 ...
        ── magic ──   │    │    │    │    │    │      │    └── cell data (cell[0])
                      │    │    │    │    │    │      └── roots_indexes: 1 byte = 0x00
                      │    │    │    │    │    └── tot_cells_size: 2 bytes = 0x099a = 2458
                      │    │    │    │    └── absent_count: 1 byte = 0x00
                      │    │    │    └── roots_count: 1 byte = 0x01  (1 root)
                      │    │    └── cells_count: 1 byte = 0x41 = 65 cells
                      │    └── offset_size = 0x02 (2 bytes)
                      └── first_byte = 0x01
```

Header layout for `BOC_GENERIC_TAG` (`0xb5ee9c72`) and `BOC_GENERIC_V2_TAG`
(`0xb6ff9a73`, adds big cells):

| offset | field | encoding |
|---|---|---|
| 0 | magic | u32 BE |
| 4 | first_byte | bit7 `index_included`, bit6 `has_crc`, bit5 `cache_bits`, bits3-4 flags (must be 0), **bits0-2 `ref_size`** (1..4) |
| 5 | offset_size | u8 (1..8) |
| ... | cells_count | `ref_size` bytes BE |
| ... | roots_count | `ref_size` bytes BE |
| ... | absent_count | `ref_size` bytes BE (must be 0) |
| ... | tot_cells_size | `offset_size` bytes BE |
| ... | big_cells_count, big_cells_size | (V2 only) `ref_size` / `offset_size` bytes |
| ... | roots_indexes | `roots_count` × `ref_size` bytes (cell indices, for generic tags) |
| ... | index | `cells_count` × `offset_size` bytes (only if `index_included`) |
| ... | cells | see §4 |
| end | crc32c | 4 bytes LE (only if `has_crc`) |

Decoded values for `/tmp/opencode/acct.boc` (2470 bytes):

```
ref_size = 1        (low 3 bits of first byte 0x01)
offset_size = 2
cells_count  = 0x41 = 65
roots_count  = 0x01 = 1
absent_count = 0x00 = 0
tot_cells_size = 0x099a = 2458
roots_indexes = [0]
```

Sanity: `4 (magic) + 1 + 1 + 1+1+1 (counts) + 2 (tot) + 1 (root idx) + 2458
(data) = 2470` — byte-exact end of file. This is the test that proves the
header parse is right: **the parser must consume the whole file, no more,
no less.**

---

## 4. Cell descriptors (the acki variant)

The descriptor differs from mainnet TON in the bit layout of `d1` — this is
the `tvm_types/src/cell/mod.rs` version (`REFS_D1_MASK = 7`, big-cell marker
`d1 == 13`).

### d1 (first descriptor byte)

| bits | meaning |
|---|---|
| 7-6 | level mask |
| 4 (0x10) | store_hashes (hashes+depths stored after d1d2) |
| 3 (0x08) | exotic |
| 0-2 (0x07) | **refs_count (3 bits, not 4!)** |

Special: `d1 == 13` (0b1101) marks a **big cell**: a 3-byte length follows
(no d2 byte), then that many data bytes; refs count is implicitly 0.
(`is_big_cell` checks the exact value 13, not a flag bit.)

### d2 (second descriptor byte)

- bit0 = 1 → "tag completed": the cell's bit length is **not** a multiple
  of 8. Data bytes = `(d2 >> 1) + 1`.
- bit0 = 0 → bit length is a multiple of 8: `bit_len = (d2 >> 1) * 8`,
  data bytes = `d2 >> 1`.

### find_tag (exact bit length of a tag-completed cell)

Scan the data bytes from the END:

```
length = len(bytes) * 8
for x in reversed(bytes):
    if x == 0: length -= 8
    else:
        skip = 1; mask = 1
        while (x & mask) == 0: skip += 1; mask <<= 1
        length -= skip
        break
return length
```

### Refs

After the data come `refs_count` indices, each `ref_size` bytes BE. Every
ref index must be **greater than the current cell index** (forward refs
only) and `< cells_count`.

### Verification against the real account state

65 cells parsed; end position 2470 = file length. Cell contents are plain
readable strings — this is what a "persistent state" actually is:

```
cell[46] = 47656e65736973          = "Genesis"
cell[61] = 697066733a2f2f516d5349495264656d6f  = "ipfs://QmSIIRdemo"
cell[62] = 68747470733a2f2f6e6a642e6578616d706c65 = "https://njd.example"
cell[63] = 534949522064656d6f20636f6d70616e79  = "SIIR demo company"
cell[64] = 4e4a442056656e7475726573           = "NJD Ventures"
cell[47..52]  = charter text (1016-bit chunks, ref-chained)
cell[53..57]  = data:text/html;base64,... (UI)
cell[55..60]  = data:image/svg+xml;base64,... (logo / deed image)
```

---

## 5. Address encoding (MsgAddressInt)

An address in contract data is 267 bits (not 267+something, and the
addr_std tag is **2**, not 1):

```
AddrStd:  10 | anycast(1 bit) | workchain(8 bits, signed i8) | address(256 bits)
           └ tag: 0b10 = AddrStd, 0b11 = AddrVar, 0b00 = none, 0b01 = extern
```

Source: `tvm_block/src/messages.rs` — `Serializable for MsgAddressInt`
(`append_raw(&[0x80], 2)` = `$10`), `MsgAddrStd::write_to` (anycast →
workchain → address).

The old mirror.py read `tag == 1` as addr_std and `tag == 2` as addr_var —
wrong on both counts. With `tag == 2 → AddrStd`:

```
root cell, fields in order (ABI "fields" array, init fields first):
  pubkey(uint256)  = 0x0
  timestamp(uint64)= 1785904558919
  constructorFlag  = true
  factory(address) = 0:ce31c59c80895b5075efdacc9b0fe1d419937b81df0804f93fd5455d06a87f22
  ── root cell fully consumed (588 bits = 256+64+1+267) ──
continuation cell (root.refs[0]), 523 bits:
  founder(address) = 0:4de04d6ac25902a1ddb4618d9b3b7f4e86dab3799b9469a41a9c5cb2af267818
  founderPubkey    = 0x569cbb0dd8327c0f9e4d35ee65f14c2c0ca84c5803fe6292035f02f2711c6f81
```

All three values are **byte-identical** to `tvm-cli run getCompanyInfo` on
the same address — the decode is verified end to end.

Layout rule (Everscale Solidity storage): fixed-size fields are packed
inline into the root cell; when the cell runs out of bits, the remaining
fixed fields continue in the first ref cell; dynamic fields (string / map /
array) are placed in ref cells after them.

---

## 6. Message transport (how anything actually happens on shellnet)

### Reads — GraphQL mirror (read-only)

```
POST https://shellnet.ackinacki.org/graphql
Content-Type: application/json
User-Agent: Mozilla/5.0 ... (403 without a browser-like UA)

{blockchain{account(dapp_id:"<64hex>",account_id:"<64hex>"){info{data}}}}
{info{version time latency rempEnabled endpoints}}
```

The mirror (`ackinacki/ackinacki` repo, crate `gql-server`) exposes only a
QueryRoot: `account`, `accounts`, `block`, `transactions`, `message`,
`transaction`, `events`, `block_by_height`, `bk_set_updates`,
`finalized_timestamp`, `info`. **There are no mutations, no sendMessage,
no postRequests.** Live values: `rempEnabled=false`, `endpoints=[]`.

### Writes — external messages go to the Block Keeper API

**VERIFIED LIVE 2026-08-09** (browser wasm SDK → router → BP → on-chain
`exit_code: 0`): the wire format is NOT `message` — the fields are `id`,
`body`, `account_id`, `dapp_id`:

```
POST https://shellnet.ackinacki.org/v2/messages
X-EXT-MSG-SENT: <epoch milliseconds>
Content-Type: application/json

body: JSON array, one element per external message:
      [{ "id": <64-hex message_hash> (the BOC hash, used as nonce),
         "body": <base64 external-message BOC>,
         "account_id": <64hex>,   # destination account id
         "dapp_id": <64hex> }]    # destination dapp id

response: {"result": { "message_hash", "block_hash", "tx_hash",
                       "thread_id", "producers", "current_time",
                       "account_id", "dapp_id", "exit_code",
                       "aborted", "ext_out_msgs" },
           "error":  { "code", "message", "data" },
           "ext_message_token": ...}
```

Notes from the live run:
- The message-router (shellnet.ackinacki.org) validates `account_id` and
  `dapp_id` as 64-hex and forwards to the BP (`shellnet-2.testbk.ackinacki.org`)
  over plain http → 308 redirect to https. The router injects an
  `ext_message_token` object into each element; the BP accepts it.
- The BP expects the field name `body` (the deployed http-server's
  `IncomingMessage { id, body, thread_id?, ext_message_token?, dapp_id,
  account_id }`); `message` → `400 Invalid request body`.
- Transient `501 Unsupported method ('POST')` was observed from Cloudflare
  edge nodes (curl and Chrome fetch both hit it intermittently) — retry.
- Duplicate send (same message_hash twice) → `TVM_ERROR` compute-phase.
- Verified: tx visible in GraphQL mirror (`last_paid` on the account updates
  to `state_timestamp`, message hash queryable as an ExtIn message).

Live proof: `POST https://shellnet.ackinacki.org/v2/messages` with `{}`
returns HTTP 200 with `{"result":null,"error":{"code":"BAD_REQUEST",
"message":"Incorrect request","data":null},"ext_message_token":null}` — the
endpoint exists and speaks the ExtMsgRunResponse shape.

Source: `ackinacki/ackinacki` → `message-router/src/process_ext_messages.rs`
and `defaults.rs`: `DEFAULT_BK_API_MESSAGES_PATH = "/v2/messages"`,
`DEFAULT_BM_API_MESSAGES_PATH = "/bm/v2/messages"` (block-manager variant),
3 retries on 429/5xx with exponential backoff. The same host proxies both
`/graphql` and `/v2/messages`.

### Wait for settlement — back to GraphQL

After sending, tvm-cli polls the mirror:

```
query transaction($hash:String!){blockchain{transaction(hash:$hash){boc out_messages{boc}}}}
```

and walks the tx tree (`send_message: id=` → `send_message result: id=` →
`wait_for_transaction: tx_hash=`). REMP states in the SDK
(`RempSentToValidators`, `RempIncludedIntoBlock`, …) describe propagation
phases; the shellnet mirror reports `rempEnabled=false`.

### Headers the SDK sends (seen in the binary)

```
tvmclient-core-version
tvmclient-binding-library
tvmclient-binding-version
X-AckiNacki-Expected-Account-Boc-Version
```

---

## 7. How the decode was actually found (the method, so you can repeat it)

1. **Dump the binary strings** — `strings /path/to/tvm-cli` revealed the
   crate layout (`tvm_client/src/processing/send_message.rs`,
   `tvm_types/src/boc.rs`, `tvm_types/src/cell/boc3_cell.rs`), the custom
   headers, `/messages/...` paths, and the exact info query
   `{info{version time latency rempEnabled}}`.
2. **Find the SDK repo** — GitHub search for the crate names →
   `tvmlabs/tvm-sdk` ("Client Libraries and CLI for Acki-Nacki, Venom,
   Everscale, T…"). Clone sparse: `git clone --filter=blob:none --sparse
   <url> && git sparse-checkout set tvm_types tvm_block tvm_client`.
   `tvm_types/src/boc.rs` and `tvm_types/src/cell/mod.rs` are the ground
   truth for the wire format.
3. **Probe the live network** — curl `/graphql` info and `/v2/messages`.
   The `BAD_REQUEST` response shape proves the send endpoint and its JSON
   envelope without sending a real message.
4. **Verify locally against a saved blob** — decode, then check:
   header fields are sane (65 cells, 1 root, 2458 data bytes), the parser
   ends exactly at EOF, and cells contain recognizable plaintext.
5. **Verify end-to-end against tvm-cli** — decode the same live account
   and diff field by field with `tvm-cli run ... getCompanyInfo "{}"`.
   Byte-identical values = done.

---

## 8. Reference implementation

`scripts/mirror.py` in this repo now contains the working `parse_boc`
(fixed-width header, 3-bit refs descriptor, big cells, find_tag, correct
root selection, and refs linked after all cells exist — a one-pass
placeholder-ref bug was fixed). Core, in full:

```python
BOC_GENERIC_TAG = 0xB5EE9C72
BOC_GENERIC_V2_TAG = 0xB6FF9A73  # with big cells

def parse_boc(data):
    if isinstance(data, str):
        data = base64.b64decode(data)
    if isinstance(data, bytes) and data[:4] in (b"te6c", b"te6s"):
        data = base64.b64decode(data[4:])
    magic = int.from_bytes(data[:4], "big")
    if magic not in (BOC_GENERIC_TAG, BOC_GENERIC_V2_TAG):
        raise ValueError("not a BOC (magic 0x%08x)" % magic)
    pos = [4]

    def byte():
        b = data[pos[0]]; pos[0] += 1; return b

    def be(n):
        v = int.from_bytes(data[pos[0]:pos[0] + n], "big")
        pos[0] += n; return v

    first = byte()
    index_included = bool(first & 0x80)
    has_crc = bool(first & 0x40)
    ref_size = first & 0x07
    if (first & 0x18) != 0: raise ValueError("non-zero flags")
    offset_size = byte()
    cells_count = be(ref_size)
    roots_count = be(ref_size)
    be(ref_size)              # absent (must be 0)
    be(offset_size)           # tot_cells_size
    if magic == BOC_GENERIC_V2_TAG:
        be(ref_size); be(offset_size)
    roots_indexes = [be(ref_size) for _ in range(roots_count)]
    if index_included:
        pos[0] += cells_count * offset_size

    def find_tag(bits):
        length = len(bits) * 8
        for x in reversed(bits):
            if x == 0: length -= 8
            else:
                skip = 1; mask = 1
                while (x & mask) == 0: skip += 1; mask <<= 1
                length -= skip; break
        return length

    raw = []
    for _ in range(cells_count):
        d1 = byte()
        if d1 == 13:  # big cell
            length = be(3)
            b = data[pos[0]:pos[0] + length]; pos[0] += length
            raw.append((d1, length * 8, [], b)); continue
        d2 = byte()
        refs_n = d1 & 0x07
        if d1 & 0x10: raise ValueError("cell hashes not supported")
        byte_len = d2 >> 1
        if d2 & 1: bit_len = None; byte_len += 1
        else: bit_len = byte_len * 8
        b = data[pos[0]:pos[0] + byte_len]; pos[0] += byte_len
        if bit_len is None: bit_len = find_tag(b)
        ref_idx = [be(ref_size) for _ in range(refs_n)]
        raw.append((d1, bit_len, ref_idx, b))

    if has_crc: pos[0] += 4

    cells = [Cell(None, None)] * cells_count
    for i, (_, bl, _, b) in enumerate(raw):
        cells[i] = Cell("".join(f"{x:08b}" for x in b)[:bl], [])
    for i, (_, _, ref_idx, _) in enumerate(raw):
        cells[i].refs = [cells[j] for j in ref_idx]
    return cells[roots_indexes[0]], cells
```

And the address reader:

```python
def read_address(sl):
    tag = sl.read_uint(2)
    if tag == 2:                     # 0b10 = AddrStd
        sl.off += 1                  # anycast
        wc = sl.read_uint(8)
        wc = -1 if wc == 255 else wc
        return "%d:%064x" % (wc, sl.read_uint(256))
    return None                      # 0b11 AddrVar / 0b00 none / 0b01 extern
```

Fetch a company state in one call:

```python
q = '{blockchain{account(dapp_id:"%s",account_id:"%s"){info{data}}}}' % (dapp, acct)
POST https://shellnet.ackinacki.org/graphql  {"query": q}   # UA header required
```

---

## 9. Status: verified vs. still open

Verified (byte-identical against tvm-cli / live probes):

- BOC header layout, fixed-width counts, roots selection
- Cell descriptor format (3-bit refs, d1==13 big cells, tag-completed bit lengths)
- Address encoding (AddrStd = 2-bit tag `10` + anycast + i8 workchain + 256 bits)
- Root/continuation packing of the fixed-size storage fields
- Transport: GraphQL mirror read-only, `/v2/messages` for external messages
- Full persistent-state decode in `scripts/mirror.py`: C4 break chain per
  `DecodePositionAbiV2` (dynamic fields placed after fixed ones, continuing
  across ref cells at `abi_decode` breaks), HmLabel walk for hashmapE
  (unary → `7` + value, short → `0` + length, long → `6` + 16-bit length +
  packed keys), compiler dict-value rule (inline iff
  `12 + keyLen + maxBits < 1023`, else value-in-ref with 1-bit marker),
  nested maps (`_checkpoint[id][cur]`, `_history[id][]`), tuple breaks,
  `uint32[]`-before-`uint` decode order.
- `cell_hash` matches SDK descriptor math (`calc_d1`: level/refs flags;
  `calc_d2`: `(bitlen//8)<<1 | !aligned`; marker-bit padding; child
  **depths (u16 BE) before child hashes**, all depths then all hashes).
  Verified: fingerprint(1/2/100) = `0x1163cfaf…` and charter fingerprint
  `0x73075fe3…` byte-identical to live tvm-cli.
- `abi.encode` tuple layout for getters returning structs: fixed fields
  inline, strings are bare raw-byte ref cells (no length prefix); a single
  string encodes as a 0-bit cell with 1 ref (the 127-byte chunk chain).
- Gateway parity: all 17 getters (`getCompanyInfo`, `getDividendCurrencies`,
  `getPlans`, `getSIIR`, `getOwnerOf`, `getClaimable`, `getClaimableOf`,
  `getBalanceOf`, `getSIIRsOf`, `getFingerprint`, `getHistory`,
  `getContentInfo`, `getVersion`, `getCharter`, `getCharterFingerprint`)
  match live `tvm-cli` output exactly (modulo tvm-cli's `state_timestamp`
  field); HTTP regression green for the whole explorer.

Notes for parity:
- `getBalanceOf` returns a 64-hex-digit string (`0x…63`), as tvm-cli does.
- `getSIIRsOf` returns zero-padded 64-hex ids.
- `getContentInfo` sizes are the **string byte lengths** of the stored
  content (data-URI), not the decoded payload size.
- `getClaimableOf` aggregates `getClaimable` per SIIR of the owner; currency
  keys are strings (`'2'`), not ints.

Still open:

- Remove the tvm-cli fallback from `gateway.py` (reads via mirror only);
  see `docs/TODO.md` items 2-5 (static client-side app, UI deployability,
  governance, marketplace).

---

## 10. Ground truth files (for future reference)

| What | Where |
|---|---|
| BOC header + cell reading | `tvmlabs/tvm-sdk` → `tvm_types/src/boc.rs` (`read_header` ~line 1051, `read_raw_cell` ~line 1261) |
| Cell descriptor helpers | `tvm_types/src/cell/mod.rs` (`refs_count`/`is_big_cell`/`bit_len`/`find_tag` ~line 978-1053) |
| Address encoding | `tvm_block/src/messages.rs` (`Serializable for MsgAddressInt` line ~454, `MsgAddrStd` line ~129) |
| Message submission | `ackinacki/ackinacki` → `message-router/src/process_ext_messages.rs`, `defaults.rs` (`/v2/messages`, `/bm/v2/messages`) |
| Mirror schema | `ackinacki/ackinacki` → `gql-server/src/schema/graphql_ext/mod.rs` (`QueryRoot` line ~94) |
| Saved decode victim | `/tmp/opencode/acct.boc` (2470 bytes, 65 cells) |
| Working client | `scripts/mirror.py` in this repo |

## 11. Account address derivation (VERIFIED 2026-08-09)

A SIIR-style account is a self-rooted `UpdateCustodianMultisigWallet`
(ABI v2.4). Its address is computed purely locally, with no network call:

```
account_id = hash( state_init = { code, data } )
```

- `code` is fixed (same for every multisig deployment) — extract once via
  `tvm-cli decode stateinit --tvc UpdateCustodianMultisigWallet.tvc`, keep
  the `code` field as a constant.
- `data` = `abi.encode_initial_data({ abi, initial_data: { _pubkey: "0x<pub>" } })`
  with the **full contract ABI JSON** (the ABI's `fields` list contains
  `{init: true, name: "_pubkey", type: "uint256"}`; all other fields encode
  to zero/defaults automatically).
- `account_id` = `boc.get_boc_hash(boc: encode_state_init({code, data}).state_init)`.

Proven byte-for-byte against `tvm-cli genaddr --setkey`:
- founder key → `c4d1738754335536ec61d32bdf872bffd1f9a9a114c4f2bc8328f0726ed275cb`
- new random key `fb663d63…929c0e` → `e0392c357d34e226b205b01e9168f8cf3f2b8bc02552a70b3c851df3de68b5b1`

Gotchas:
- The real ABI must be passed (not a trimmed one): `encode_initial_data`
  with a reduced ABI produced a minimal 60-char data cell that did NOT
  match; the full ABI yields the exact 216-char cell the CLI writes.
- `initial_pubkey` is rejected for ABI 2.4 ("must specify in initial_data");
  pass `_pubkey` inside `initial_data`.
