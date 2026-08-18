/*
 * SIIR Protocol — SIIRWallet (v1.0.0)
 *
 * The user-facing wallet contract behind the browser explorer. One per user,
 * self-rooted at an address derived from the owner's public key. The owner
 * signs external messages (in the browser); the wallet is the only contract
 * that can spend the user's SHELL/token balances, because on Acki Nacki only
 * internal messages can carry ecc currencies.
 *
 *   browser signs external -> wallet.send(...) -> protocol contract
 *                                            (currencies attached)
 *
 * Every call converts the wallet's OWN stored SHELL to native for its fuel
 * (own gas + outbound value + forward fees) and refunds the excess — the
 * wallet keeps no user-op reserve, and external messages carry no
 * currencies, so the SHELL has to already live on the wallet (faucet or a
 * transfer-in). `send` also moves any of the wallet's token balances
 * (currencyIds/amounts) in the same message — that's how bids carry their
 * price + settlement escrow and how dividend deposits attach eccUSDC.
 *
 * The owner key is static (part of the address): a wallet can never be
 * taken over, and there is no recovery — key loss is value loss, by design.
 */
pragma gosh-solidity >=0.76.1;
pragma AbiHeader expire;
pragma AbiHeader pubkey;

import "./SIIRFuel.sol";

contract SIIRWallet is SIIRFuel {
    string constant version = "1.0.0";

    uint16 constant ERR_NOT_OWNER = 500;
    uint16 constant ERR_BAD_ARGS = 501;
    uint16 constant ERR_INSUFFICIENT_BALANCE = 502;

    uint256 static _ownerPubkey;

    constructor() {}

    /// Convert the wallet's own stored SHELL to native. External messages
    /// carry no currencies, so unlike SIIRFuel's `_fuel`, the balance being
    /// converted is the wallet's own, not the inbound message's.
    function _fuelOwn(uint128 needed) internal {
        require(uint128(address(this).currencies[CURRENCY_SHELL]) >= needed, ERR_INSUFFICIENT_BALANCE);
        gosh.cnvrtshellq(uint64(needed));
    }

    /// Send an internal message to any contract, attaching any of the
    /// wallet's token balances. Fuel (own gas + `value` + forward fee) is
    /// converted from the wallet's SHELL balance; excess is refunded.
    /// @param dest     destination contract
    /// @param value    native VMSHELL attached to the outbound message
    /// @param bounce   true to bounce undeliverable messages back
    /// @param currencyIds ecc currency ids to move with the message (e.g. 2=SHELL, 3=eccUSDC)
    /// @param amounts  amounts per currency (must fit the wallet's balances)
    /// @param body     ABI-encoded call body (any contract)
    function send(
        address dest,
        uint128 value,
        bool bounce,
        uint32[] currencyIds,
        uint128[] amounts,
        TvmCell body
    ) public {
        require(msg.pubkey() == _ownerPubkey, ERR_NOT_OWNER);
        require(currencyIds.length == amounts.length, ERR_BAD_ARGS);
        tvm.accept();
        mapping(uint32 => varuint32) cc;
        for (uint256 i = 0; i < currencyIds.length; i++) {
            uint32 cur = currencyIds[i];
            require(!cc.exists(cur), ERR_BAD_ARGS);
            require(uint128(address(this).currencies[cur]) >= amounts[i], ERR_INSUFFICIENT_BALANCE);
            cc[cur] = varuint32(amounts[i]);
        }
        _fuelOwn(_fuelFor(value, body));
        dest.transfer({value: varuint16(value), flag: 1, bounce: bounce, currencies: cc, body: body});
    }

    function getWalletInfo() external view returns (
        uint256 ownerPubkey,
        uint128 shell,
        string ver
    ) {
        return (_ownerPubkey, uint128(address(this).currencies[CURRENCY_SHELL]), version);
    }
}