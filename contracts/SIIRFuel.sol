/*
 * SIIR Protocol — SHELL-fuel helpers (v2.3.0)
 *
 * The Acki Nacki fuel model: native VMSHELL attached to a message is wiped
 * to zero when the message crosses a Dapp ID boundary, and spendable reserve
 * is only granted by flag-16 funding, deploy value, or an in-contract
 * conversion. SHELL (ecc currency 2) travels freely between any Dapp IDs and
 * converts 1:1 to native via `gosh.cnvrtshellq` (the pattern used by the
 * ecosystem's AFT / AckiSmartWallet contracts).
 *
 * SIIR therefore fuels itself the same way: every payable entry converts
 * just enough attached SHELL to native to pay its own compute, its outbound
 * `value:` and the forward fees of its outbound messages. The caller pays —
 * the contract keeps no long-lived native reserve for user operations.
 * Excess SHELL is refunded to the caller in the same message.
 *
 * Key-signed external messages cannot carry currencies on this network, so
 * founder-key ops (issue, ratify, dissolve, finalize, grant/revoke) are
 * exempt by design and run on the small native reserve the company received
 * at deployment (funded by the founder's deploy SHELL).
 */
pragma gosh-solidity >=0.76.1;

contract SIIRFuel {
    uint32 constant CURRENCY_SHELL = 2;
    uint16 constant ERR_INSUFFICIENT_FUEL = 140;

    int32 constant CFG_GAS_PRICES_WC = 21;   // workchain GasPrices
    int32 constant CFG_FWD_PRICES_WC = 25;   // workchain MsgForwardPrices

    /// Entry-hop compute budget in gas units, priced live via config 21.
    uint64 constant EST_GAS_ENTRY = 50_000;
    /// `value:` for one internal hop / currency payout / refund envelope.
    uint64 constant HOP_VALUE = 0.5 vmshell;
    /// Native value of a child-contract deploy message.
    uint64 constant DEPLOY_VALUE = 5 vmshell;
    /// Slack covering the refund outbound's own envelope + forward fee.
    uint64 constant FUEL_SLACK = 0.5 vmshell;

    struct FwdPrices {
        uint64 lumpPrice;
        uint64 bitPrice;
        uint64 cellPrice;
    }

    /// SHELL attached to the current message (always the same snapshot).
    function _inboundShell() internal pure returns (uint128) {
        return uint128(msg.currencies[CURRENCY_SHELL]);
    }

    function _loadGasPrice() internal pure returns (uint64 gasPrice) {
        optional(TvmCell) cfgOpt = tvm.rawConfigParam(CFG_GAS_PRICES_WC);
        require(cfgOpt.hasValue(), ERR_INSUFFICIENT_FUEL);
        TvmSlice s = cfgOpt.get().toSlice();
        (, , , , gasPrice) = s.load(uint8, uint64, uint64, uint8, uint64);
    }

    function _loadFwdPrices() internal pure returns (FwdPrices p) {
        optional(TvmCell) cfgOpt = tvm.rawConfigParam(CFG_FWD_PRICES_WC);
        require(cfgOpt.hasValue(), ERR_INSUFFICIENT_FUEL);
        TvmSlice s = cfgOpt.get().toSlice();
        s.load(uint8);
        p.lumpPrice = s.load(uint64);
        p.bitPrice = s.load(uint64);
        p.cellPrice = s.load(uint64);
    }

    /// Gas units -> native VMSHELL, rounded up.
    function _gasToNative(uint64 gasUnits) internal pure returns (uint128) {
        uint64 gp = _loadGasPrice();
        return math.muldivc(uint128(gasUnits), uint128(gp), 65536);
    }

    /// Forward-fee estimate of an outbound body (cells/bits beyond the root;
    /// envelope is excluded — it rides on `value:`).
    function _estimateFwdFee(TvmCell body) internal pure returns (uint128) {
        FwdPrices p = _loadFwdPrices();
        (uint cells, uint bits, ) = body.dataSize(256);
        if (cells > 0) {
            cells -= 1;
            uint rootBits = body.toSlice().bits();
            bits = bits > rootBits ? bits - rootBits : 0;
        }
        uint128 fwdData = uint128(cells) * uint128(p.cellPrice)
                        + uint128(bits) * uint128(p.bitPrice);
        return uint128(p.lumpPrice) + uint128((fwdData + 0xFFFF) >> 16);
    }

    /// Total SHELL fuel for an entry: own gas + slack + outbound value +
    /// outbound forward fee. Pass `_emptyBody()` when the entry sends a
    /// currency-only message (no payload).
    function _fuelFor(uint128 outboundValue, TvmCell body) internal pure returns (uint128) {
        return _gasToNative(EST_GAS_ENTRY) + FUEL_SLACK + outboundValue + _estimateFwdFee(body);
    }

    /// Fuel for n identical outbound messages (batch entry): own gas + slack +
    /// n x outbound value + n x forward fee of the shared body.
    function _batchFuel(uint128 perOutboundValue, TvmCell body, uint256 count) internal pure returns (uint128) {
        return _gasToNative(EST_GAS_ENTRY) + FUEL_SLACK
             + perOutboundValue * uint128(count)
             + _estimateFwdFee(body) * uint128(count);
    }

    /// Fuel for a child deploy: own gas + slack + deploy value + forward fee
    /// of the constructor body + forward fee of the stateInit (the code cell).
    function _fuelDeploy(uint128 deployValue, TvmCell init, TvmCell body) internal pure returns (uint128) {
        return _gasToNative(EST_GAS_ENTRY) + FUEL_SLACK + deployValue
             + _estimateFwdFee(body) + _estimateFwdFee(init);
    }

    /// Own-gas-only fuel (entry with no outbound payload).
    function _fuelOwn() internal pure returns (uint128) {
        return _gasToNative(EST_GAS_ENTRY) + FUEL_SLACK;
    }

    /// Convert exactly `needed` SHELL to native and refund the excess to the
    /// caller (internal/wallet messages; external senders are exempt).
    function _fuel(uint128 needed) internal {
        uint128 inbound = _inboundShell();
        require(inbound >= needed, ERR_INSUFFICIENT_FUEL);
        gosh.cnvrtshellq(uint64(needed));
        uint128 excess = inbound - needed;
        if (excess > 0) {
            _refundShell(msg.sender, excess);
        }
    }

    /// Convert exactly `needed` with NO refund (the excess is escrowed or is
    /// the deposit itself).
    function _fuelKeep(uint128 needed) internal {
        require(_inboundShell() >= needed, ERR_INSUFFICIENT_FUEL);
        gosh.cnvrtshellq(uint64(needed));
    }

    function _refundShell(address to, uint128 shell) internal {
        mapping(uint32 => varuint32) cc;
        cc[CURRENCY_SHELL] = varuint32(shell);
        to.transfer({value: varuint16(HOP_VALUE), flag: 1, currencies: cc});
    }

    /// A representative bodyless-message cell (single tiny value) for
    /// forward-fee estimates of currency-only payouts — the lump dominates.
    function _emptyBody() internal pure returns (TvmCell c) {
        return abi.encode(uint8(0));
    }
}
