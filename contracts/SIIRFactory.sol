/*
 * SIIR Protocol — Factory
 *
 * Deploys Company SIIR contracts. The factory is the Dapp ID root: every
 * company it deploys (and everything the companies deploy) inherits the
 * factory's Dapp ID.
 *
 * v2.0: the factory also keeps the company directory (Dapp ID -> name map)
 * and deploys the protocol marketplace, both registered on-chain so any
 * client (static explorer included) can list companies and listings by
 * decoding this single contract's state.
 *
 * v2.1: deployCompany passes the governance & dissolution configuration
 * (governanceEnabled, quorumPermille, dissolutionRule, dissolutionDest)
 * through to the company contract (see SIIR.md §Governance §Dissolution).
 *
 * v2.3: SHELL fuel. The founder wallet (the `founder` argument of
 * deployCompany) sends the call as an internal message attaching SHELL; the
 * factory converts exactly the deploy fuel — its own gas, the child's
 * `initialValue` native reserve, and the forward fees of the constructor
 * body and company code cell — and refunds the excess. The owner-key path
 * (external message, no currencies possible) is kept for the factory
 * operator and runs on the factory's bootstrap reserve.
 *
 * The factory never modifies deployed companies. It only creates them.
 *
 * v2.6: the factory deploys the protocol explorer alongside the marketplace
 * and registers every company there (SIIRExplorer.registerCompany) — the
 * on-chain directory used by clients. The factory is also upgradeable by its
 * owner key (updateCode, tvm.setcode — state preserved). CompanySIIR stays
 * immutable forever.
 */
pragma gosh-solidity >=0.76.1;
pragma AbiHeader expire;
pragma AbiHeader pubkey;

import "./CompanySIIR.sol";
import "./SIIRMarketplace.sol";
import "./SIIRExplorer.sol";
import "./SIIRFuel.sol";

contract SIIRFactory is SIIRFuel {
    string constant version = "2.6.0";

    uint16 constant ERR_NOT_OWNER = 200;
    uint16 constant ERR_BAD_ARGS   = 201;
    uint16 constant ERR_LOGO_TOO_LARGE    = 202;
    uint16 constant ERR_SIIR_IMG_TOO_LARGE = 203;
    uint16 constant ERR_UI_TOO_LARGE      = 204;
    uint16 constant ERR_CHARTER_TOO_LARGE = 205;
    uint16 constant ERR_PLAN_IMG_TOO_LARGE = 206;

    // On-chain content caps, matching CompanySIIR (validated here so a bad
    // upload fails fast at the factory instead of as a construction revert).
    uint32 constant MAX_LOGO_SIZE        = 1 << 20;
    uint32 constant MAX_SIIR_IMAGE_SIZE  = 1 << 20;
    uint32 constant MAX_PLAN_IMAGE_SIZE  = 1 << 12;  // 4 KiB per tier art (deploy-message budget is the real cap)
    uint32 constant MAX_UI_SIZE          = 4 << 20;
    uint32 constant MAX_CHARTER_SIZE     = 1 << 20;

    modifier accept() {
        tvm.accept();
        _;
    }

    uint256 _ownerPubkey;
    TvmCell _code;
    TvmCell _companyCode;
    TvmCell _marketplaceCode;
    TvmCell _explorerCode;
    address _marketplace;
    address _explorer;

    // Value attached to one protocol push (company register / snapshot hop).
    // v2.6: children inherit this factory's Dapp ID, so native VMSHELL holds.
    uint128 constant PUSH_VALUE = 1 vmshell;

    // ---------- company directory (Dapp ID -> name) ----------
    struct CompanyEntry {
        address company;
        string name;
        uint8 issuanceModel;
        address founder;
    }
    mapping(uint32 => CompanyEntry) _companies;
    uint32 _companyCount;

    event CompanyDeployed(address company, address founder, string name, uint8 issuanceModel);
    event CompanyRegistered(uint32 index, address company, string name);

    constructor(uint64 value, TvmCell companyCode, TvmCell marketplaceCode, TvmCell explorerCode) accept {
        gosh.cnvrtshellq(value);
        tvm.accept();
        _ownerPubkey = tvm.pubkey();
        _code = tvm.code();
        _companyCode = companyCode;
        _marketplaceCode = marketplaceCode;
        _explorerCode = explorerCode;
        _marketplace = new SIIRMarketplace{
            stateInit: abi.encodeStateInit({
                contr: SIIRMarketplace,
                varInit: {_factory: address(this)},
                code: marketplaceCode
            }),
            value: varuint16(1000000000),
            flag: 1
        }(_ownerPubkey);
        _explorer = new SIIRExplorer{
            stateInit: abi.encodeStateInit({
                contr: SIIRExplorer,
                varInit: {_factory: address(this)},
                code: explorerCode
            }),
            value: varuint16(1000000000),
            flag: 1
        }(_ownerPubkey);
    }

    /// deployCompany may be called by the founder wallet itself (internal
    /// message, SHELL-fueled) or by the factory owner's key (external
    /// message; runs on the factory's bootstrap native reserve).
    modifier onlyOwnerOrFounder(address founder) {
        require(msg.sender == founder || msg.pubkey() == _ownerPubkey, ERR_NOT_OWNER);
        tvm.accept();
        _;
    }

    /// Deploy a company's one immutable SIIR contract.
    /// @param name        company name
    /// @param description company description
    /// @param website     company website
    /// @param metadataUri identity NFT metadata URI (documents, artwork)
    /// @param founder     founder wallet address
    /// @param founderPubkey founder public key (external auth)
    /// @param issuanceModel MODEL_FULL_CAP or MODEL_ROUNDS
    /// @param plans       declared issuance plans (count, weight, label) — locked forever
    /// @param logoImage   company logo as base64 data URI, stored on-chain
    /// @param siirImage   deed card image (base64 data URI) used for every SIIR
    /// @param ui          optional static app bundle (HTML/JS, base64 data URI)
    /// @param charter     immutable founder commitments / rules of the company
    /// @param initialValue VMSHELL to fund the company contract at deploy
    /// @param governanceEnabled dissolution needs a weighted SIIR vote when true
    /// @param quorumPermille  weight share (0-1000) required to dissolve
    /// @param dissolutionRule  unclaimed-treasury rule (0 treasury, 1 charity,
    ///                         2 DAO, 3 burn) — immutable, chosen at creation
    /// @param dissolutionDest fixed destination address (rules 1-2)
    function deployCompany(
        string name,
        string description,
        string website,
        string metadataUri,
        address founder,
        uint256 founderPubkey,
        uint8 issuanceModel,
        CompanySIIR.TierPlan[] plans,
        string logoImage,
        string siirImage,
        string ui,
        string charter,
        uint128 initialValue,
        bool governanceEnabled,
        uint16 quorumPermille,
        uint8 dissolutionRule,
        address dissolutionDest
    ) public onlyOwnerOrFounder(founder) returns (address company) {
        require(plans.length > 0, ERR_BAD_ARGS);
        require(founder.value != 0, ERR_BAD_ARGS);
        require(bytes(logoImage).length <= MAX_LOGO_SIZE, ERR_LOGO_TOO_LARGE);
        require(bytes(siirImage).length <= MAX_SIIR_IMAGE_SIZE, ERR_SIIR_IMG_TOO_LARGE);
        require(bytes(ui).length <= MAX_UI_SIZE, ERR_UI_TOO_LARGE);
        require(bytes(charter).length <= MAX_CHARTER_SIZE, ERR_CHARTER_TOO_LARGE);
        for (uint256 i = 0; i < plans.length; i++) {
            require(plans[i].count > 0, ERR_BAD_ARGS);
            require(bytes(plans[i].image).length <= MAX_PLAN_IMAGE_SIZE, ERR_PLAN_IMG_TOO_LARGE);
        }
        TvmCell init = _companyStateInit(founder, founderPubkey);
        TvmCell body = abi.encodeBody(CompanySIIR, name, description, website, metadataUri,
            issuanceModel, plans, logoImage, siirImage, ui, charter,
            governanceEnabled, quorumPermille, dissolutionRule, dissolutionDest,
            _explorer);
        address company = address.makeAddrStd(0, tvm.hash(init));
        if (msg.sender == founder) {
            // founder wallet path: the attached SHELL pays the child's deploy
            // value + the factory's own gas + both forward fees + the explorer
            // register push; excess goes back to the founder wallet
            _fuel(_fuelDeploy(initialValue, init, body) + _registerFuel(company, name, issuanceModel, founder));
        }
        company = new CompanySIIR{
            stateInit: init,
            value: varuint16(initialValue),
            flag: 1
        }(name, description, website, metadataUri, issuanceModel, plans,
          logoImage, siirImage, ui, charter,
          governanceEnabled, quorumPermille, dissolutionRule, dissolutionDest,
          _explorer);
        emit CompanyDeployed(company, founder, name, issuanceModel);
        _registerCompany(company, name, issuanceModel, founder);
        if (_explorer.value != 0) {
            SIIRExplorer(_explorer).registerCompany{
                value: varuint16(PUSH_VALUE),
                flag: 1
            }(company, name, issuanceModel, founder);
        }
    }

    function _registerBody(address company, string name, uint8 issuanceModel, address founder)
        private pure returns (TvmCell) {
        return abi.encodeBody(SIIRExplorer.registerCompany, company, name, issuanceModel, founder);
    }

    /// SHELL fuel for the explorer register push after a founder-wallet deploy.
    function _registerFuel(address company, string name, uint8 issuanceModel, address founder)
        private pure returns (uint128) {
        return PUSH_VALUE + _estimateFwdFee(_registerBody(company, name, issuanceModel, founder));
    }

    function _registerCompany(address company, string name, uint8 issuanceModel, address founder) private {
        // one entry per company; deploy is idempotent-safe for re-deploys
        for (uint32 i = 0; i < _companyCount; i++) {
            if (_companies[i].company == company) {
                _companies[i] = CompanyEntry(company, name, issuanceModel, founder);
                return;
            }
        }
        _companies[_companyCount] = CompanyEntry(company, name, issuanceModel, founder);
        emit CompanyRegistered(_companyCount, company, name);
        _companyCount++;
    }

    function _companyStateInit(address founder, uint256 founderPubkey) private view returns (TvmCell) {
        return abi.encodeStateInit({
            contr: CompanySIIR,
            varInit: {
                _factory: address(this),
                _founder: founder,
                _founderPubkey: founderPubkey
            },
            code: _companyCode
        });
    }

    /// Deterministic company address for a given founder (before deploy).
    function getCompanyAddress(address founder, uint256 founderPubkey) external view returns (address) {
        return address.makeAddrStd(0, tvm.hash(_companyStateInit(founder, founderPubkey)));
    }

    function getCompanyCode() external view returns (TvmCell) {
        return _companyCode;
    }

    function getMarketplaceCode() external view returns (TvmCell) {
        return _marketplaceCode;
    }

    function getExplorerCode() external view returns (TvmCell) {
        return _explorerCode;
    }

    function getMarketplaceAddress() external view returns (address) {
        return _marketplace;
    }

    function getExplorerAddress() external view returns (address) {
        return _explorer;
    }

    /// Factory-owner upgrade: replace this contract's code in place. State
    /// (company/marketplace/explorer code cells + addresses) is preserved.
    /// Marketplace and explorer have their own owner-key updateCode.
    function updateCode(TvmCell newCode) public {
        require(msg.pubkey() == _ownerPubkey, ERR_NOT_OWNER);
        tvm.accept();
        _code = newCode;
        tvm.setcode(newCode);
        tvm.commit();
    }

    // ---------- company directory getters ----------
    function getCompanyCount() external view returns (uint32 count) {
        return _companyCount;
    }

    function getCompanyList(uint32 offset, uint8 limit) external view returns (
        address[] company,
        string[] name,
        uint8[] issuanceModel,
        address[] founder
    ) {
        uint32 n = offset < _companyCount ? (_companyCount - offset) : 0;
        if (n > uint32(limit)) n = uint32(limit);
        company = new address[](n);
        name = new string[](n);
        issuanceModel = new uint8[](n);
        founder = new address[](n);
        for (uint32 i = 0; i < n; i++) {
            CompanyEntry e = _companies[offset + i];
            company[i] = e.company;
            name[i] = e.name;
            issuanceModel[i] = e.issuanceModel;
            founder[i] = e.founder;
        }
    }

    function getFactoryInfo() external view returns (uint256 ownerPubkey, string ver) {
        return (_ownerPubkey, version);
    }

    function getVersion() external pure returns (string, string) {
        return (version, "SIIRFactory");
    }
}
