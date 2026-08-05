/*
 * SIIR Protocol — Factory
 *
 * Deploys Company SIIR contracts. The factory is the Dapp ID root: every
 * company it deploys (and everything the companies deploy) inherits the
 * factory's Dapp ID.
 *
 * The factory never modifies deployed companies. It only creates them.
 */
pragma gosh-solidity >=0.76.1;
pragma AbiHeader expire;
pragma AbiHeader pubkey;

import "./CompanySIIR.sol";

contract SIIRFactory {
    string constant version = "1.1.0";

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

    event CompanyDeployed(address company, address founder, string name, uint8 issuanceModel);

    constructor(uint64 value, TvmCell companyCode) accept {
        gosh.cnvrtshellq(value);
        tvm.accept();
        _ownerPubkey = tvm.pubkey();
        _companyCode = companyCode;
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

    function getFactoryInfo() external view returns (uint256 ownerPubkey, string ver) {
        return (_ownerPubkey, version);
    }

    function getVersion() external pure returns (string, string) {
        return (version, "SIIRFactory");
    }
}
