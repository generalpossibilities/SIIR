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
 * The factory never modifies deployed companies. It only creates them.
 */
pragma gosh-solidity >=0.76.1;
pragma AbiHeader expire;
pragma AbiHeader pubkey;

import "./CompanySIIR.sol";
import "./SIIRMarketplace.sol";

contract SIIRFactory {
    string constant version = "2.0.0";

    uint16 constant ERR_NOT_OWNER = 200;
    uint16 constant ERR_BAD_ARGS   = 201;
    uint16 constant ERR_LOGO_TOO_LARGE    = 202;
    uint16 constant ERR_SIIR_IMG_TOO_LARGE = 203;
    uint16 constant ERR_UI_TOO_LARGE      = 204;
    uint16 constant ERR_CHARTER_TOO_LARGE = 205;

    // On-chain content caps, matching CompanySIIR (validated here so a bad
    // upload fails fast at the factory instead of as a construction revert).
    uint32 constant MAX_LOGO_SIZE        = 1 << 20;
    uint32 constant MAX_SIIR_IMAGE_SIZE  = 1 << 20;
    uint32 constant MAX_UI_SIZE          = 4 << 20;
    uint32 constant MAX_CHARTER_SIZE     = 1 << 20;

    modifier accept() {
        tvm.accept();
        _;
    }

    uint256 _ownerPubkey;
    TvmCell _companyCode;
    TvmCell _marketplaceCode;
    address _marketplace;

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

    constructor(uint64 value, TvmCell companyCode, TvmCell marketplaceCode) accept {
        gosh.cnvrtshellq(value);
        tvm.accept();
        _ownerPubkey = tvm.pubkey();
        _companyCode = companyCode;
        _marketplaceCode = marketplaceCode;
        _marketplace = new SIIRMarketplace{
            stateInit: abi.encodeStateInit({
                contr: SIIRMarketplace,
                varInit: {_factory: address(this)},
                code: marketplaceCode
            }),
            value: varuint16(1000000000),
            flag: 1
        }();
    }

    modifier onlyOwner() {
        require(msg.pubkey() == _ownerPubkey, ERR_NOT_OWNER);
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
        uint128 initialValue
    ) public onlyOwner returns (address company) {
        require(plans.length > 0, ERR_BAD_ARGS);
        require(founder.value != 0, ERR_BAD_ARGS);
        require(bytes(logoImage).length <= MAX_LOGO_SIZE, ERR_LOGO_TOO_LARGE);
        require(bytes(siirImage).length <= MAX_SIIR_IMAGE_SIZE, ERR_SIIR_IMG_TOO_LARGE);
        require(bytes(ui).length <= MAX_UI_SIZE, ERR_UI_TOO_LARGE);
        require(bytes(charter).length <= MAX_CHARTER_SIZE, ERR_CHARTER_TOO_LARGE);
        company = new CompanySIIR{
            stateInit: _companyStateInit(founder, founderPubkey),
            value: varuint16(initialValue),
            flag: 1
        }(name, description, website, metadataUri, issuanceModel, plans, logoImage, siirImage, ui, charter);
        emit CompanyDeployed(company, founder, name, issuanceModel);
        _registerCompany(company, name, issuanceModel, founder);
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

    function getMarketplaceAddress() external view returns (address) {
        return _marketplace;
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
