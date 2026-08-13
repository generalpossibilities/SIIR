/*
 * SIIR Protocol — Explorer
 *
 * On-chain registry of every company the factory has deployed, plus the
 * latest published snapshot of each company's register & treasury state.
 *
 * TVM has no synchronous cross-contract reads, so every datum here is
 * PUSHED, never fetched:
 *   - the factory registers a company at deploy (registerCompany)
 *   - each company publishes a snapshot on issue() and depositDividends()
 *     (pushSnapshot from the company's own address)
 * Clients enumerate companies here and read live detail from each
 * company's own getters; this contract is discovery + aggregation only.
 *
 * Protocol plumbing, not a trust-bearing register: the factory owner key
 * may upgrade this contract's code in place (tvm.setcode) — CompanySIIR
 * itself stays immutable forever.
 */
pragma gosh-solidity >=0.76.1;
pragma AbiHeader expire;
pragma AbiHeader pubkey;

contract SIIRExplorer {
    string constant version = "1.0.0";

    uint16 constant ERR_NOT_FACTORY = 400;
    uint16 constant ERR_NOT_OWNER   = 401;
    uint16 constant ERR_NOT_COMPANY = 402;

    modifier accept() {
        tvm.accept();
        _;
    }

    address static _factory;
    uint256 _ownerPubkey;

    struct CompanyEntry {
        address company;
        string name;
        uint8 issuanceModel;
        address founder;
        // last published snapshot (0 until the company issues)
        uint128 totalWeight;     // issued weight so far
        uint128 issuedCount;     // SIIRs issued so far
        uint32 planCount;        // plans declared at creation (immutable)
        uint32 planIndex;        // plans issued so far
        uint128 dividendIndex;   // headline track: first non-SHELL currency
        uint128 deposited;       // headline track: total deposited
        uint64 updatedAt;
    }

    mapping(address => CompanyEntry) _companies;  // company -> entry
    address[] _order;                             // registration order
    uint32 _count;

    event CompanyRegistered(address company, string name, uint8 issuanceModel, address founder);
    event CompanyUpdated(address company, uint128 totalWeight, uint128 issuedCount, uint64 timestamp);

    constructor(uint256 ownerPubkey) accept {
        require(msg.sender == _factory, ERR_NOT_FACTORY);
        _ownerPubkey = ownerPubkey;
    }

    /// Factory-only: register a company right after deploying it. Re-register
    /// (idempotent, same address) refreshes the identity fields.
    function registerCompany(
        address company,
        string name,
        uint8 issuanceModel,
        address founder
    ) public accept {
        require(msg.sender == _factory, ERR_NOT_FACTORY);
        if (!_companies.exists(company)) {
            _order.push(company);
            _count++;
        }
        _companies[company] = CompanyEntry(
            company, name, issuanceModel, founder,
            0, 0, 0, 0, 0, 0, uint64(block.timestamp));
        emit CompanyRegistered(company, name, issuanceModel, founder);
    }

    /// Company-only: publish the latest register/treasury headline after
    /// issue() or depositDividends(). A company's address is bound to its
    /// code, so msg.sender == company cannot be forged.
    function pushSnapshot(
        address company,
        uint128 totalWeight,
        uint128 issuedCount,
        uint32 planCount,
        uint32 planIndex,
        uint128 dividendIndex,
        uint128 deposited
    ) public accept {
        require(msg.sender == company, ERR_NOT_COMPANY);
        require(_companies.exists(company), ERR_NOT_COMPANY);
        CompanyEntry e = _companies[company];
        e.totalWeight = totalWeight;
        e.issuedCount = issuedCount;
        e.planCount = planCount;
        e.planIndex = planIndex;
        e.dividendIndex = dividendIndex;
        e.deposited = deposited;
        e.updatedAt = uint64(block.timestamp);
        _companies[company] = e;
        emit CompanyUpdated(company, totalWeight, issuedCount, uint64(block.timestamp));
    }

    /// Factory-owner upgrade: replace this contract's code in place. The
    /// address (and every dapp-id child) is preserved; state is preserved.
    function updateCode(TvmCell newCode) public {
        require(msg.pubkey() == _ownerPubkey, ERR_NOT_OWNER);
        tvm.accept();
        tvm.setcode(newCode);
        tvm.commit();
    }

    // ---------- getters (off-chain emulation, no gas) ----------
    function getCompanyCount() external view returns (uint32 count) {
        return _count;
    }

    function getCompany(address company) external view returns (
        address addr,
        string name,
        uint8 issuanceModel,
        address founder,
        uint128 totalWeight,
        uint128 issuedCount,
        uint32 planCount,
        uint32 planIndex,
        uint128 dividendIndex,
        uint128 deposited,
        uint64 updatedAt
    ) {
        CompanyEntry e = _companies[company];
        return (e.company, e.name, e.issuanceModel, e.founder,
            e.totalWeight, e.issuedCount, e.planCount, e.planIndex,
            e.dividendIndex, e.deposited, e.updatedAt);
    }

    function getCompanyList(uint32 offset, uint8 limit) external view returns (
        address[] company,
        string[] name,
        uint8[] issuanceModel,
        address[] founder,
        uint128[] totalWeight,
        uint128[] issuedCount,
        uint32[] planCount,
        uint32[] planIndex,
        uint128[] dividendIndex,
        uint128[] deposited,
        uint64[] updatedAt
    ) {
        uint32 n = offset < _count ? (_count - offset) : 0;
        if (n > uint32(limit)) n = uint32(limit);
        company = new address[](n);
        name = new string[](n);
        issuanceModel = new uint8[](n);
        founder = new address[](n);
        totalWeight = new uint128[](n);
        issuedCount = new uint128[](n);
        planCount = new uint32[](n);
        planIndex = new uint32[](n);
        dividendIndex = new uint128[](n);
        deposited = new uint128[](n);
        updatedAt = new uint64[](n);
        for (uint32 i = 0; i < n; i++) {
            CompanyEntry e = _companies[_order[offset + i]];
            company[i] = e.company;
            name[i] = e.name;
            issuanceModel[i] = e.issuanceModel;
            founder[i] = e.founder;
            totalWeight[i] = e.totalWeight;
            issuedCount[i] = e.issuedCount;
            planCount[i] = e.planCount;
            planIndex[i] = e.planIndex;
            dividendIndex[i] = e.dividendIndex;
            deposited[i] = e.deposited;
            updatedAt[i] = e.updatedAt;
        }
    }

    function getVersion() external pure returns (string, string) {
        return (version, "SIIRExplorer");
    }
}