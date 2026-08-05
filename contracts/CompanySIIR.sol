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
    string constant version = "1.2.0";

    // Fixed-point scale for the dividend index (9 decimals = SHELL decimals)
    uint128 constant SCALE = 1e9;

    // SHELL is ecc currency id 2 (the computation token, cross-DAPP transferable).
    // eccUSDC (TIP-3-style ecc id 3) is the second supported dividend currency.
    uint32 constant CURRENCY_SHELL = 2;
    uint32 constant CURRENCY_USDC  = 3;

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

    // ---------- the register ----------
    mapping(uint256 => SIIR) _siirs;   // serial id -> record
    uint256 _nextId;

    // ---------- treasury / dividends ----------
    // Two independent tracks, one per supported payout currency (SHELL and
    // eccUSDC). Each has its own accumulated index and total deposited, and
    // every SIIR carries a per-track checkpoint. A single deposit may credit
    // either or both tracks; claim() pays out both in one transfer.
    uint128 _dividendIndex;      // accumulated SHELL value per weight unit, x SCALE
    uint128 _dividendIndexUsdc;  // accumulated eccUSDC value per weight unit, x SCALE
    uint128 _totalWeight;        // sum of weights of all issued SIIRs
    uint128 _deposited;          // total SHELL ever deposited
    uint128 _depositedUsdc;      // total eccUSDC ever deposited

    struct TierPlan {
        uint128 count;          // SIIRs in this plan
        uint128 weight;         // weight per SIIR
        string label;           // display tier label ("" = none)
        bool issued;            // true once minted
    }

    struct SIIR {
        uint128 weight;
        address owner;
        uint128 checkpoint;     // SHELL dividend index at last claim
        uint128 checkpointUsdc; // eccUSDC dividend index at last claim
        uint64 createdAt;
        uint32 round;           // plan/round index this SIIR came from
        string label;           // display tier label
        string metadataUri;     // deed artwork / document URI
    }

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
    event SIIRMinted(uint256 id, uint32 round, address owner, uint128 weight, string label, string metadataUri);
    event SIIRTransferred(uint256 id, address from, address to, uint64 timestamp);
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
        for (uint256 i = 0; i < plan.count; i++) {
            SIIR s;
            s.weight = plan.weight;
            s.owner = _founder;
            s.createdAt = uint64(block.timestamp);
            s.round = _planIndex;
            s.label = plan.label;
            s.metadataUri = _metadataUri;
            _siirs[_nextId] = s;
            emit SIIRMinted(_nextId, s.round, s.owner, s.weight, s.label, s.metadataUri);
            _nextId++;
        }
        _issuedCount += plan.count;
        _totalWeight += plan.weight * plan.count;
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
            require(_siirs.exists(id), ERR_NO_SIIR);
            require(_siirs[id].owner == msg.sender, ERR_NOT_OWNER);
            _siirs[id].owner = newOwner;
            uint256 n = _historyCount[id];
            _history[id][n] = HistoryEntry(msg.sender, newOwner, uint64(block.timestamp));
            _historyCount[id] = n + 1;
            emit SIIRTransferred(id, msg.sender, newOwner, uint64(block.timestamp));
        }
    }

    // ---------- treasury / dividends ----------
    /// Anyone may deposit SHELL (ecc currency id 2) and/or eccUSDC (ecc
    /// currency id 3). Unlike VMSHELL, these transfer across Dapp IDs, so
    /// contributors are never bound by app boundaries. Each track has its own
    /// index; the deposit is split by what the message actually carried.
    function depositDividends() public internalMsg {
        uint128 shell = uint128(msg.currencies[CURRENCY_SHELL]);
        uint128 usdc  = uint128(msg.currencies[CURRENCY_USDC]);
        require(shell > 0 || usdc > 0, ERR_NOTHING_DEPOSITED);
        require(_totalWeight > 0, ERR_BAD_ISSUANCE);
        tvm.accept();
        if (shell > 0) {
            _deposited += shell;
            _dividendIndex += shell * SCALE / _totalWeight;
            emit DividendDeposited(msg.sender, CURRENCY_SHELL, shell, _dividendIndex);
        }
        if (usdc > 0) {
            _depositedUsdc += usdc;
            _dividendIndexUsdc += usdc * SCALE / _totalWeight;
            emit DividendDeposited(msg.sender, CURRENCY_USDC, usdc, _dividendIndexUsdc);
        }
    }

    /// Claim pending dividends for owned SIIRs. Both tracks are settled in one
    /// transfer: the caller receives its share of SHELL and of eccUSDC in the
    /// same message, so funds arrive at the wallet on any Dapp ID.
    function claim(uint256[] ids) public internalMsg {
        uint128 totalShell = 0;
        uint128 totalUsdc  = 0;
        for (uint256 i = 0; i < ids.length; i++) {
            uint256 id = ids[i];
            require(_siirs.exists(id), ERR_NO_SIIR);
            require(_siirs[id].owner == msg.sender, ERR_NOT_OWNER);
            SIIR s = _siirs[id];
            uint128 pendingShell = s.weight * (_dividendIndex - s.checkpoint) / SCALE;
            if (pendingShell > 0) {
                _siirs[id].checkpoint = _dividendIndex;
                totalShell += pendingShell;
                emit DividendClaimed(id, msg.sender, CURRENCY_SHELL, pendingShell, _dividendIndex);
            }
            uint128 pendingUsdc = s.weight * (_dividendIndexUsdc - s.checkpointUsdc) / SCALE;
            if (pendingUsdc > 0) {
                _siirs[id].checkpointUsdc = _dividendIndexUsdc;
                totalUsdc += pendingUsdc;
                emit DividendClaimed(id, msg.sender, CURRENCY_USDC, pendingUsdc, _dividendIndexUsdc);
            }
        }
        require(totalShell > 0 || totalUsdc > 0, ERR_NO_CLAIM);
        tvm.accept();
        if (totalShell > 0 && address(this).currencies[CURRENCY_SHELL] >= totalShell) {
            mapping(uint32 => varuint32) c;
            c[CURRENCY_SHELL] = totalShell;
            msg.sender.transfer({value: varuint16(0), flag: 1, currencies: c});
        }
        if (totalUsdc > 0 && address(this).currencies[CURRENCY_USDC] >= totalUsdc) {
            mapping(uint32 => varuint32) c;
            c[CURRENCY_USDC] = totalUsdc;
            msg.sender.transfer({value: varuint16(0), flag: 1, currencies: c});
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
        uint128 dividendIndexUsdc,
        uint128 deposited,
        uint128 depositedUsdc,
        uint256 nextId
    ) {
        return (
            _name, _description, _website, _metadataUri,
            _factory, _founder, _founderPubkey,
            _issuanceModel, _totalWeight, _issuedCount,
            _dividendIndex, _dividendIndexUsdc, _deposited, _depositedUsdc, _nextId
        );
    }

    function getPlans() external view returns (TierPlan[] plans) {
        return _plans;
    }

    function getSIIR(uint256 id) external view returns(
        uint128 weight,
        address owner,
        uint128 checkpoint,
        uint128 checkpointUsdc,
        uint64 createdAt,
        uint32 round,
        string label,
        string metadataUri
    ) {
        require(_siirs.exists(id), ERR_NO_SIIR);
        SIIR s = _siirs[id];
        return (s.weight, s.owner, s.checkpoint, s.checkpointUsdc, s.createdAt, s.round, s.label, s.metadataUri);
    }

    function getOwnerOf(uint256 id) external view returns (address) {
        require(_siirs.exists(id), ERR_NO_SIIR);
        return _siirs[id].owner;
    }

    function getClaimable(uint256 id) external view returns (uint128 shell, uint128 usdc) {
        require(_siirs.exists(id), ERR_NO_SIIR);
        SIIR s = _siirs[id];
        shell = s.weight * (_dividendIndex - s.checkpoint) / SCALE;
        usdc = s.weight * (_dividendIndexUsdc - s.checkpointUsdc) / SCALE;
    }

    function getClaimableOf(address owner) external view returns (uint128 shell, uint128 usdc) {
        uint256[] ids = _idsOf(owner);
        for (uint256 i = 0; i < ids.length; i++) {
            SIIR s = _siirs[ids[i]];
            shell += s.weight * (_dividendIndex - s.checkpoint) / SCALE;
            usdc += s.weight * (_dividendIndexUsdc - s.checkpointUsdc) / SCALE;
        }
    }

    function getBalanceOf(address owner) external view returns (uint256 count) {
        return _idsOf(owner).length;
    }

    function getSIIRsOf(address owner) external view returns (uint256[] ids) {
        return _idsOf(owner);
    }

    function _idsOf(address owner) private view returns (uint256[] ids) {
        uint256[] buf = new uint256[](_nextId - 1);
        uint256 n = 0;
        for (uint256 id = 1; id < _nextId; id++) {
            if (_siirs.exists(id) && _siirs[id].owner == owner) {
                buf[n] = id;
                n++;
            }
        }
        uint256[] res = new uint256[](n);
        for (uint256 i = 0; i < n; i++) { res[i] = buf[i]; }
        return res;
    }

    /// Fingerprint of the immutable deed data. Anyone can verify forever
    /// that a SIIR's creation data has never changed.
    function getFingerprint(uint256 id) external view returns (uint256 fp) {
        require(_siirs.exists(id), ERR_NO_SIIR);
        SIIR s = _siirs[id];
        return tvm.hash(abi.encode(s.weight, s.createdAt, s.round, s.label, s.metadataUri));
    }

    function getHistory(uint256 id) external view returns (HistoryEntry[] entries) {
        require(_siirs.exists(id), ERR_NO_SIIR);
        uint256 n = _historyCount[id];
        entries = new HistoryEntry[](n);
        for (uint256 i = 0; i < n; i++) {
            entries[i] = _history[id][i];
        }
        return entries;
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
