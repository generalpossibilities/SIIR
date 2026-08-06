/*
 * SIIR Protocol — Company SIIR Contract
 *
 * The shareholder register. One immutable contract per company, for life.
 *
 * - Ownership lives inside the SIIR records (the register), not in balances.
 * - SIIRs are non-fungible deeds: serial, weight, owner, history, fingerprint.
 * - Dividends belong to the SIIR: pending value = weight x (index - checkpoint).
 * - Claim is a single action from the holding wallet; value is sent as SHELL.
 * - Supply grows only as declared at creation (full capitalization or rounds).
 * - SIIR cannot be burned. Ever.
 *
 * v2.0: lazy derived registry. issue() is O(1): the plan record IS the mint.
 * Every id in an issued plan is a real SIIR, derived on demand —
 *   weight/round/label/metadata from the plan, owner from _segments.
 * Only deviations (custom label/metadata) materialize in _siirs; ownership
 * moves live in compact range segments, so 10B+ SIIRs mint in one message
 * and whole ranges transfer in one record. Dividend checkpoints are per
 * plan (index at issue time) for untouched ids, per id once claimed.
 *
 * v1 note: dividends are paid in SHELL (ecc currency id 2). Unlike VMSHELL —
 * which is nullified across Dapp IDs — SHELL travels between any Dapp IDs, so
 * any wallet anywhere can deposit and withdraw. The accounting is
 * asset-agnostic; swapping to a TIP-3 ecc token (e.g. eccUSDC) is a drop-in
 * payout module change, not an accounting change.
 */
pragma gosh-solidity >=0.76.1;
pragma AbiHeader expire;
pragma AbiHeader pubkey;

contract CompanySIIR {
    // ---------- constants ----------
    string constant version = "2.0.0";

    // Fixed-point scale for the dividend index (9 decimals = SHELL decimals)
    uint128 constant SCALE = 1e9;

    // SHELL is ecc currency id 2 (the computation token, cross-DAPP transferable).
    // eccUSDC (TIP-3-style ecc id 3) is the second supported dividend currency.
    uint32 constant CURRENCY_SHELL = 2;
    uint32 constant CURRENCY_USDC  = 3;

    uint128 constant MAX_UINT128 = 340282366920938463463374607431768211455;

    // Gas kept on the company contract for its own operations
    uint128 constant GAS_RESERVE = 1 vmshell;

    // Issuance models
    uint8 constant MODEL_FULL_CAP = 0;
    uint8 constant MODEL_ROUNDS   = 1;

    // Errors
    uint16 constant ERR_NOT_OWNER         = 100;
    uint16 constant ERR_NOT_FOUNDER       = 101;
    uint16 constant ERR_BAD_ISSUANCE      = 102;
    uint16 constant ERR_NO_SIIR           = 103;
    uint16 constant ERR_NO_CLAIM          = 104;
    uint16 constant ERR_SUPPLY_EXCEEDED   = 105;
    uint16 constant ERR_ALREADY_ISSUED    = 106;
    uint16 constant ERR_NOTHING_DEPOSITED = 107;
    uint16 constant ERR_LOGO_TOO_LARGE    = 108;
    uint16 constant ERR_SIIR_IMG_TOO_LARGE = 109;
    uint16 constant ERR_UI_TOO_LARGE      = 110;
    uint16 constant ERR_CHARTER_TOO_LARGE = 111;
    uint16 constant ERR_ALREADY_RATIFIED  = 112;

    // On-chain content caps (Acki Nacki storage is free, but bounded so a
    // single account never becomes pathological). Base64 data-URI strings.
    uint32 constant MAX_LOGO_SIZE        = 1 << 20;  // 1 MiB
    uint32 constant MAX_SIIR_IMAGE_SIZE  = 1 << 20;  // 1 MiB
    uint32 constant MAX_UI_SIZE          = 4 << 20;  // 4 MiB (static HTML/JS bundle)
    uint32 constant MAX_CHARTER_SIZE     = 1 << 20;  // 1 MiB (immutable commitment text)

    modifier accept() {
        tvm.accept();
        _;
    }

    // ---------- static (part of the address, immutable) ----------
    address static _factory;
    address static _founder;
    uint256 static _founderPubkey;

    // ---------- identity ----------
    string _name;
    string _description;
    string _website;
    string _metadataUri;

    // ---------- on-chain content (supplied at deployment, immutable) ----------
    // Base64 data-URI strings, stored on-chain; Acki Nacki storage is free.
    // _logoImage:      company logo / brand.
    // _siirImage:      the deed card image shown for every SIIR of this company.
    // _ui:             optional static app bundle (HTML/JS) served by a gateway.
    // _charter:        the founder's immutable commitments / rules of the company.
    string _logoImage;
    string _siirImage;
    string _ui;
    string _charter;
    bool _charterRatified;   // once the founder's own key acknowledges the charter

    // ---------- issuance ----------
    uint8 _issuanceModel;
    TierPlan[] _plans;          // declared at creation, locked forever
    uint32 _planIndex;          // next plan that may be issued
    uint128 _issuedCount;       // SIIRs issued so far
    // Lazy per-plan state: a plan's SIIRs are derived, not stored.
    mapping(uint256 => uint256) _planStartId;   // first id of each issued plan
    mapping(uint256 => uint256) _planEndId;     // last id of each issued plan
    mapping(uint256 => uint64)  _planIssuedAt;  // mint timestamp of each plan

    // ---------- the register ----------
    // Only deviations from plan defaults are stored per id (custom label /
    // metadata). Everything else about an id is derived: weight/createdAt/
    // round from its plan, owner from _segments.
    mapping(uint256 => SIIROverride) _siirs;   // id -> deviation override
    uint256 _nextId;

    // ---------- ownership: compact range segments ----------
    // Every issued SIIR is covered by exactly one segment. Minting appends
    // the founder's range; a transfer splits one segment into up to three
    // (O(1) per move), so a range of 10B SIIRs moves in a single record.
    Segment[] _segments;                       // insertion order, non-overlapping
    mapping(uint256 => HistoryEntry[]) _rangeHistory;  // range moves, keyed by segment start id

    // ---------- treasury / dividends ----------
    // Payout is currency-agnostic: every ecc currency id ever deposited
    // (SHELL=2, eccUSDC=3, NACKL=1, or any future token a network wallet
    // creates with its own ecc id) becomes a dividend track. Each track has
    // its own accumulated index, its own total deposited, and its own
    // checkpoint per SIIR. A deposit message names the ids it attaches;
    // claim() pays out every track in one transfer.
    mapping(uint32 => uint128) _dividendIndex;  // accumulated value per weight unit x SCALE, per currency
    mapping(uint32 => uint128) _deposited;      // total ever deposited, per currency
    uint32[] _divCurrencies;                    // active tracks, insertion order
    uint128 _totalWeight;                       // sum of weights of all issued SIIRs

    uint32 constant MAX_DIV_CURRENCIES = 64;    // tracks a treasury may ever register
    uint16 constant ERR_TOO_MANY_CURRENCIES = 121;

    struct TierPlan {
        uint128 count;          // SIIRs in this plan
        uint128 weight;         // weight per SIIR
        string label;           // display tier label ("" = none)
        bool issued;            // true once minted
    }

    struct SIIR {
        // fully derived view of one deed (what the getters return)
        uint128 weight;
        address owner;
        uint64 createdAt;
        uint32 round;
        string label;
        string metadataUri;
    }

    struct SIIROverride {
        string label;           // deviating display tier label ("" = none)
        string metadataUri;     // deviating deed artwork / document URI
    }

    struct Segment {
        uint256 start;          // first id of the range
        uint256 end;            // last id of the range
        address owner;          // every id in the range belongs to this owner
    }

    // per-SIIR dividend checkpoint, per currency: value of _dividendIndex[cur]
    // when the SIIR last claimed cur (only set once a derived id claims; until
    // then the plan-level checkpoint applies)
    mapping(uint256 => mapping(uint32 => uint128)) _checkpoint;

    // per-plan dividend checkpoint, per currency: value of _dividendIndex[cur]
    // at the moment the plan was issued (untouched ids inherit this)
    mapping(uint256 => mapping(uint32 => uint128)) _planCheckpoint;

    struct HistoryEntry {
        address from;
        address to;
        uint64 timestamp;
    }

    // history of transfers per SIIR: _history[id][index] oldest -> newest
    mapping(uint256 => mapping(uint256 => HistoryEntry)) _history;
    mapping(uint256 => uint256) _historyCount;

    // ---------- events ----------
    event CompanyCreated(address factory, address founder, string name, uint8 issuanceModel);
    event PlanMinted(uint256 planIndex, uint256 startId, uint256 endId, uint128 weight, uint64 timestamp);
    event SIIRTransferred(uint256 id, address from, address to, uint64 timestamp);
    event RangeTransferred(uint256 startId, uint256 endId, address from, address to, uint64 timestamp);
    event DividendDeposited(address depositor, uint32 currency, uint128 amount, uint128 dividendIndex);
    event DividendClaimed(uint256 id, address holder, uint32 currency, uint128 amount, uint128 dividendIndex);
    event CharterRatified(uint256 founderPubkey, uint64 timestamp);

    // ---------- constructor ----------
    constructor(
        string name,
        string description,
        string website,
        string metadataUri,
        uint8 issuanceModel,
        TierPlan[] plans,
        string logoImage,
        string siirImage,
        string ui,
        string charter
    ) accept {
        gosh.cnvrtshellq(0);
        tvm.accept();
        require(msg.sender == _factory, ERR_NOT_OWNER);
        require(issuanceModel == MODEL_FULL_CAP || issuanceModel == MODEL_ROUNDS, ERR_BAD_ISSUANCE);
        require(bytes(logoImage).length <= MAX_LOGO_SIZE, ERR_LOGO_TOO_LARGE);
        require(bytes(siirImage).length <= MAX_SIIR_IMAGE_SIZE, ERR_SIIR_IMG_TOO_LARGE);
        require(bytes(ui).length <= MAX_UI_SIZE, ERR_UI_TOO_LARGE);
        require(bytes(charter).length <= MAX_CHARTER_SIZE, ERR_CHARTER_TOO_LARGE);
        _name = name;
        _description = description;
        _website = website;
        _metadataUri = metadataUri;
        _issuanceModel = issuanceModel;
        _plans = plans;
        _logoImage = logoImage;
        _siirImage = siirImage;
        _ui = ui;
        _charter = charter;
        _nextId = 1;
        emit CompanyCreated(_factory, _founder, _name, _issuanceModel);
    }

    // ---------- auth helpers ----------
    /// Internal: the founder wallet contract. External: the founder's pubkey.
    /// (Acki Nacki external messages arrive with msg.sender = an addr_extern,
    /// so founder auth cannot rely on msg.sender == address(this).)
    function _isFounder() private view {
        require(
            (msg.sender == _founder) ||
            (msg.pubkey() == _founderPubkey),
            ERR_NOT_FOUNDER
        );
        tvm.accept();
    }

    /// Owners act through their wallet contracts (internal messages).

    // ---------- charter ----------
    /// The founder personally acknowledges the immutable charter with their
    /// own key. One-time, timestamped, irreversible. If the founder later acts
    /// contrary to what the charter promises, the acknowledgment + original
    /// statement are on-chain proof — usable against them.
    function ratifyCharter() public {
        _isFounder();
        require(!_charterRatified, ERR_ALREADY_RATIFIED);
        _charterRatified = true;
        emit CharterRatified(_founderPubkey, uint64(block.timestamp));
    }

    // ---------- issuance ----------
    /// Mint the next declared plan/round in batches.
    /// Full capitalization: the single genesis plan. Rounds: the next round plan.
    /// Every SIIR is minted to the founder.
    function issue() public {
        _isFounder();
        require(_planIndex < _plans.length, ERR_SUPPLY_EXCEEDED);
        TierPlan plan = _plans[_planIndex];
        require(!plan.issued, ERR_ALREADY_ISSUED);
        tvm.accept();
        _mintPlan(plan);
        _plans[_planIndex].issued = true;
        _planIndex++;
    }

    function _mintPlan(TierPlan plan) private {
        require(plan.count > 0, ERR_BAD_ISSUANCE);
        require(plan.weight <= MAX_UINT128 / plan.count, ERR_SUPPLY_EXCEEDED);
        uint128 added = plan.weight * plan.count;
        require(_totalWeight <= MAX_UINT128 - added, ERR_SUPPLY_EXCEEDED);
        uint256 start = _nextId;
        uint256 end = start + plan.count - 1;
        _planStartId[_planIndex] = start;
        _planEndId[_planIndex] = end;
        _planIssuedAt[_planIndex] = uint64(block.timestamp);
        for (uint256 c = 0; c < _divCurrencies.length; c++) {
            // untouched ids inherit the index at issue, so a plan never
            // captures dividends deposited before it existed
            _planCheckpoint[_planIndex][_divCurrencies[c]] = _dividendIndex[_divCurrencies[c]];
        }
        _nextId = end + 1;
        _issuedCount += plan.count;
        _totalWeight = _totalWeight + added;
        // the founder owns the whole range from day one; extend the founder's
        // trailing segment when plans are minted back to back
        uint256 n = _segments.length;
        if (n > 0 && _segments[n - 1].owner == _founder && _segments[n - 1].end + 1 == start) {
            _segments[n - 1].end = end;
        } else {
            _segments.push(Segment(start, end, _founder));
        }
        emit PlanMinted(_planIndex, start, end, plan.weight, uint64(block.timestamp));
    }

    // ---------- resolution ----------
    /// Derive the full deed record for an id: plan defaults overlaid with the
    /// per-id override (label/metadata) and the owning segment.
    function _resolve(uint256 id) private view returns (SIIR s, uint256 planIdx) {
        require(id >= 1 && id < _nextId, ERR_NO_SIIR);
        for (planIdx = 0; planIdx < _planIndex; planIdx++) {
            if (id >= _planStartId[planIdx] && id <= _planEndId[planIdx]) break;
        }
        require(planIdx < _planIndex, ERR_NO_SIIR);
        TierPlan plan = _plans[planIdx];
        s.weight = plan.weight;
        s.createdAt = _planIssuedAt[planIdx];
        s.round = uint32(planIdx);
        if (_siirs.exists(id)) {
            s.label = _siirs[id].label;
            s.metadataUri = _siirs[id].metadataUri;
        } else {
            s.label = plan.label;
            s.metadataUri = _metadataUri;
        }
        for (uint256 i = 0; i < _segments.length; i++) {
            if (id >= _segments[i].start && id <= _segments[i].end) {
                s.owner = _segments[i].owner;
                break;
            }
        }
        require(s.owner.value != 0, ERR_NO_SIIR);
    }

    // ---------- transfer ----------
    /// Transfer SIIRs. Only the current owner of each SIIR may move it.
    /// Ownership is a state change in the register; the SIIR carries its
    /// history, and pending dividends stay attached (cum-dividend).
    function transfer(uint256[] ids, address newOwner) public {
        require(newOwner.value != 0, ERR_NOT_OWNER);
        require(msg.sender != newOwner, ERR_NOT_OWNER);
        tvm.accept();
        for (uint256 i = 0; i < ids.length; i++) {
            uint256 id = ids[i];
            (SIIR s, ) = _resolve(id);
            require(s.owner == msg.sender, ERR_NOT_OWNER);
            _splitSegmentFor(id, id, msg.sender, newOwner);
            uint256 n = _historyCount[id];
            _history[id][n] = HistoryEntry(msg.sender, newOwner, uint64(block.timestamp));
            _historyCount[id] = n + 1;
            emit SIIRTransferred(id, msg.sender, newOwner, uint64(block.timestamp));
        }
    }

    /// Transfer a whole contiguous range [start, end] in one record. The
    /// range must lie inside a single segment owned by the caller.
    function transferRange(uint256 start, uint256 end, address newOwner) public {
        require(newOwner.value != 0, ERR_NOT_OWNER);
        require(msg.sender != newOwner, ERR_NOT_OWNER);
        require(start >= 1 && start <= end && end < _nextId, ERR_NO_SIIR);
        tvm.accept();
        uint256 i;
        bool found = false;
        for (i = 0; i < _segments.length; i++) {
            if (_segments[i].start <= start && end <= _segments[i].end) {
                found = true;
                break;
            }
        }
        require(found, ERR_NO_SIIR);
        require(_segments[i].owner == msg.sender, ERR_NOT_OWNER);
        _splitSegmentFor(start, end, msg.sender, newOwner);
        _rangeHistory[start].push(HistoryEntry(msg.sender, newOwner, uint64(block.timestamp)));
        emit RangeTransferred(start, end, msg.sender, newOwner, uint64(block.timestamp));
    }

    /// Replace the segment containing [start, end] with up to three pieces:
    /// left remnant (old owner), the moved range (new owner), right remnant
    /// (old owner). Empty pieces are skipped. (No fixed-size arrays: sold
    /// 0.79.3 miscompiles `uint256[3]` locals into empty dynamic arrays,
    /// making any indexed write throw exit 50.)
    function _splitSegmentFor(uint256 start, uint256 end, address from, address to) private {
        uint256 i;
        for (i = 0; i < _segments.length; i++) {
            if (_segments[i].start <= start && end <= _segments[i].end) break;
        }
        uint256 a = _segments[i].start;
        uint256 b = _segments[i].end;
        bool left = a < start;
        bool right = end < b;
        if (left) {
            _segments[i] = Segment(a, start - 1, from);
            _segments.push(Segment(start, end, to));
            if (right) {
                _segments.push(Segment(end + 1, b, from));
            }
        } else {
            _segments[i] = Segment(start, end, to);
            if (right) {
                _segments.push(Segment(end + 1, b, from));
            }
        }
    }

    // ---------- treasury / dividends ----------
    /// Anyone may deposit SHELL (ecc currency id 2) and/or eccUSDC (ecc
    /// currency id 3). Unlike VMSHELL, these transfer across Dapp IDs, so
    /// contributors are never bound by app boundaries. Each track has its own
    /// index; the deposit is split by what the message actually carried.
    function depositDividends(uint32[] currencyIds) public internalMsg {
        uint128 total = 0;
        require(_totalWeight > 0, ERR_BAD_ISSUANCE);
        tvm.accept();
        for (uint256 i = 0; i < currencyIds.length; i++) {
            uint32 cur = currencyIds[i];
            uint128 amount = uint128(msg.currencies[cur]);
            if (amount == 0) continue;
            require(_divCurrencies.length < MAX_DIV_CURRENCIES ||
                    _dividendIndex.exists(cur), ERR_TOO_MANY_CURRENCIES);
            if (!_dividendIndex.exists(cur)) {
                // first deposit in this currency; it becomes a payout track
                _divCurrencies.push(cur);
            }
            _deposited[cur] += amount;
            _dividendIndex[cur] += amount * SCALE / _totalWeight;
            total += amount;
            emit DividendDeposited(msg.sender, cur, amount, _dividendIndex[cur]);
        }
        require(total > 0, ERR_NOTHING_DEPOSITED);
    }

    /// Claim pending dividends for owned SIIRs. Every active payout track is
    /// settled in one transfer: the caller receives its share of SHELL,
    /// eccUSDC, and any other currency the company treasury has ever received
    /// — in the same message, so funds arrive at the wallet on any Dapp ID,
    /// including currency ids created after this company was deployed.
    function claim(uint256[] ids) public internalMsg {
        mapping(uint32 => uint128) totals;
        uint128 combined = 0;
        for (uint256 i = 0; i < ids.length; i++) {
            uint256 id = ids[i];
            (SIIR s, ) = _resolve(id);
            require(s.owner == msg.sender, ERR_NOT_OWNER);
            for (uint256 c = 0; c < _divCurrencies.length; c++) {
                uint32 cur = _divCurrencies[c];
                uint128 cp = _checkpoint[id].exists(cur)
                    ? _checkpoint[id][cur]
                    : _planCheckpoint[s.round][cur];
                uint128 pending = s.weight * (_dividendIndex[cur] - cp) / SCALE;
                if (pending > 0) {
                    _checkpoint[id][cur] = _dividendIndex[cur];
                    totals[cur] += pending;
                    combined += pending;
                    emit DividendClaimed(id, msg.sender, cur, pending, _dividendIndex[cur]);
                }
            }
        }
        require(combined > 0, ERR_NO_CLAIM);
        tvm.accept();
        mapping(uint32 => varuint32) cc2;
        bool any = false;
        for (uint256 c = 0; c < _divCurrencies.length; c++) {
            uint32 cur = _divCurrencies[c];
            uint128 amount = totals[cur];
            if (amount > 0 && address(this).currencies[cur] >= amount) {
                cc2[cur] = amount;
                any = true;
            }
        }
        // one payout message carrying every track (a 0-gram message bounces
        // at the receiver and its bounce cannot pay the return fee, losing
        // the currency; always attach VMSHELL gas)
        if (any) {
            msg.sender.transfer({value: varuint16(1000000000), flag: 1, currencies: cc2});
        }
    }

    // ---------- getters (off-chain emulation, no gas) ----------
    function getCompanyInfo() external view returns(
        string name,
        string description,
        string website,
        string metadataUri,
        address factory,
        address founder,
        uint256 founderPubkey,
        uint8 issuanceModel,
        uint128 totalWeight,
        uint128 issuedCount,
        uint128 dividendIndex,
        uint128 deposited,
        uint128 dividendCount,
        uint256 nextId
    ) {
        return (
            _name, _description, _website, _metadataUri,
            _factory, _founder, _founderPubkey,
            _issuanceModel, _totalWeight, _issuedCount,
            _dividendIndex[CURRENCY_SHELL], _deposited[CURRENCY_SHELL],
            uint128(_divCurrencies.length), _nextId
        );
    }

    /// Every active payout track: currency id, its accumulated index, and its
    /// total deposited. This is the full money picture — any coin ever attached
    /// to the treasury, including tokens created after deployment.
    function getDividendCurrencies() external view returns (
        uint32[] ids,
        uint128[] indices,
        uint128[] deposits
    ) {
        for (uint256 i = 0; i < _divCurrencies.length; i++) {
            uint32 cur = _divCurrencies[i];
            ids.push(cur);
            indices.push(_dividendIndex[cur]);
            deposits.push(_deposited[cur]);
        }
    }

    function getPlans() external view returns (TierPlan[] plans) {
        return _plans;
    }

    function getSIIR(uint256 id) external view returns(
        uint128 weight,
        address owner,
        uint64 createdAt,
        uint32 round,
        string label,
        string metadataUri
    ) {
        (SIIR s, ) = _resolve(id);
        return (s.weight, s.owner, s.createdAt, s.round, s.label, s.metadataUri);
    }

    function getOwnerOf(uint256 id) external view returns (address) {
        (SIIR s, ) = _resolve(id);
        return s.owner;
    }

    function getClaimable(uint256 id) external view returns (uint32[] currencies, uint128[] amounts) {
        (SIIR s, ) = _resolve(id);
        for (uint256 i = 0; i < _divCurrencies.length; i++) {
            uint32 cur = _divCurrencies[i];
            uint128 cp = _checkpoint[id].exists(cur)
                ? _checkpoint[id][cur]
                : _planCheckpoint[s.round][cur];
            currencies.push(cur);
            amounts.push(s.weight * (_dividendIndex[cur] - cp) / SCALE);
        }
    }

    function getClaimableOf(address owner) external view returns (uint32[] currencies, uint128[] amounts) {
        mapping(uint32 => uint128) totals;
        for (uint256 i = 0; i < _segments.length; i++) {
            if (_segments[i].owner != owner) continue;
            for (uint256 id = _segments[i].start; id <= _segments[i].end; id++) {
                (SIIR s, ) = _resolve(id);
                for (uint256 c = 0; c < _divCurrencies.length; c++) {
                    uint32 cur = _divCurrencies[c];
                    uint128 cp = _checkpoint[id].exists(cur)
                        ? _checkpoint[id][cur]
                        : _planCheckpoint[s.round][cur];
                    totals[cur] += s.weight * (_dividendIndex[cur] - cp) / SCALE;
                }
            }
        }
        for (uint256 i = 0; i < _divCurrencies.length; i++) {
            uint32 cur = _divCurrencies[i];
            currencies.push(cur);
            amounts.push(totals[cur]);
        }
    }

    function getBalanceOf(address owner) external view returns (uint256 count) {
        for (uint256 i = 0; i < _segments.length; i++) {
            if (_segments[i].owner == owner) {
                count += _segments[i].end - _segments[i].start + 1;
            }
        }
    }

    /// Ownership as compact ranges: [starts[i], ends[i]] each fully owned by
    /// `owner`. Enumeration at 10B scale — one record per range, not per id.
    function getSIIRsOf(address owner) external view returns (uint256[] starts, uint256[] ends) {
        for (uint256 i = 0; i < _segments.length; i++) {
            if (_segments[i].owner == owner) {
                starts.push(_segments[i].start);
                ends.push(_segments[i].end);
            }
        }
    }

    /// The whole ownership picture: every segment of the register.
    function getSegments() external view returns (Segment[] segments) {
        return _segments;
    }

    /// Fingerprint of the immutable deed data. Anyone can verify forever
    /// that a SIIR's creation data has never changed.
    function getFingerprint(uint256 id) external view returns (uint256 fp) {
        (SIIR s, ) = _resolve(id);
        return tvm.hash(abi.encode(s.weight, s.createdAt, s.round, s.label, s.metadataUri));
    }

    function getHistory(uint256 id) external view returns (HistoryEntry[] entries) {
        require(id >= 1 && id < _nextId, ERR_NO_SIIR);
        uint256 n = 0;
        for (uint256 i = 0; i < _segments.length; i++) {
            if (id >= _segments[i].start && id <= _segments[i].end) {
                n += _rangeHistory[_segments[i].start].length;
            }
        }
        n += _historyCount[id];
        entries = new HistoryEntry[](n);
        uint256 k = 0;
        for (uint256 i = 0; i < _segments.length; i++) {
            if (id >= _segments[i].start && id <= _segments[i].end) {
                for (uint256 j = 0; j < _rangeHistory[_segments[i].start].length; j++) {
                    entries[k] = _rangeHistory[_segments[i].start][j];
                    k++;
                }
            }
        }
        for (uint256 i = 0; i < _historyCount[id]; i++) {
            entries[k] = _history[id][i];
            k++;
        }
    }

    // ---------- on-chain content getters ----------
    /// Logo image (base64 data URI), supplied by the company at deployment.
    function getCompanyImage() external view returns (string img) {
        return _logoImage;
    }

    /// Deed card image used for every SIIR of this company.
    function getSIIRImage() external view returns (string img) {
        return _siirImage;
    }

    /// Optional static app bundle (HTML/JS) — served by a gateway, stored on-chain.
    function getUI() external view returns (string ui) {
        return _ui;
    }

    /// The founder's immutable commitments. `ratified` is true only after the
    /// founder's own key acknowledged it on-chain (see ratifyCharter).
    function getCharter() external view returns (string charter, bool ratified) {
        return (_charter, _charterRatified);
    }

    /// Stable hash of the charter text — investors can pin this to a copy they
    /// keep, confident the on-chain text can never change.
    function getCharterFingerprint() external view returns (uint256 fp) {
        return tvm.hash(abi.encode(_charter));
    }

    /// Sizes of the on-chain content (for clients that need them up front).
    function getContentInfo() external view returns (
        uint32 logoSize,
        uint32 siirImageSize,
        uint32 uiSize
    ) {
        return (
            uint32(bytes(_logoImage).length),
            uint32(bytes(_siirImage).length),
            uint32(bytes(_ui).length)
        );
    }

    function getVersion() external pure returns (string, string) {
        return (version, "CompanySIIR");
    }
}
