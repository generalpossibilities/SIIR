/*
 * SIIR Protocol — Marketplace
 *
 * Custodial escrow marketplace for SIIR deeds, deployed by the factory and
 * inheriting the factory's Dapp ID.
 *
 * CompanySIIR is immutable and its transfer() only moves SIIRs owned by
 * msg.sender, so a marketplace cannot pull deeds from owners. Instead the
 * seller escrows the SIIR into the marketplace (transfer -> marketplace) and
 * the marketplace settles the trade:
 *
 *   seller -> company.transfer(ids, marketplace)  (escrow)
 *   seller -> marketplace.list(...)               (ask price, per currency)
 *   buyer  -> marketplace.bid(...)                (deposits currency, offer)
 *   seller -> marketplace.acceptBid(bidId)        (SIIR to buyer, funds to seller)
 *
 * Dividend flows: while a SIIR is in escrow, dividends accrue to the
 * marketplace; claimAndForward sweeps them to the listing seller.
 *
 * All prices are in ecc currencies (SHELL=2, eccUSDC=3), which travel across
 * Dapp IDs — bidders from any wallet can participate.
 *
 * v2.3: SHELL fuel. Every wallet op converts just enough attached SHELL to
 * native for its own compute and outbound value/forward fees (excess
 * refunded). Settlement is bidder-funded: the bid message escrows the
 * price plus the deterministic settlement fuel (acceptBid's own gas + the
 * deed transfer + the price payout), so acceptBid — called by the seller —
 * converts from the escrow instead of charging the seller. cancelBid
 * returns the full escrow. Deed returns (delist), dividend forwarding
 * (claimAndForward/settleClaims) are fueled by the caller.
 */
pragma gosh-solidity >=0.76.1;
pragma AbiHeader expire;
pragma AbiHeader pubkey;

import "./CompanySIIR.sol";
import "./SIIRFuel.sol";

contract SIIRMarketplace is SIIRFuel {
    string constant version = "2.3.0";

    uint128 constant PAYOUT_VALUE = 1 vmshell;

    // SHELL attached to each outbound CompanySIIR.transfer so the company can
    // convert its own entry fuel (company ops require caller SHELL; the
    // company converts ~_fuelOwn() and refunds the rest to this contract).
    uint128 constant DEED_FUEL = 2 vmshell;

    uint16 constant ERR_NOT_OWNER      = 300;
    uint16 constant ERR_NO_LISTING     = 301;
    uint16 constant ERR_NO_BID         = 302;
    uint16 constant ERR_BAD_PRICE      = 303;
    uint16 constant ERR_EXPIRED        = 304;
    uint16 constant ERR_ALREADY_SETTLED = 305;
    uint16 constant ERR_NOT_SELLER     = 306;
    uint16 constant ERR_NOT_BIDDER     = 307;
    uint16 constant ERR_BAD_ARGS       = 308;

    modifier accept() {
        tvm.accept();
        _;
    }

    address static _factory;

    // ask listings: listingId -> record. One listing per (company, SIIR id).
    struct Listing {
        address company;        // the CompanySIIR contract holding the deed
        uint256 id;             // SIIR serial id
        address seller;         // original owner (receives proceeds)
        uint128 askPrice;       // in currencyId units
        uint32 currencyId;      // ecc currency the price is denominated in
        uint64 listedAt;
        bool active;
    }
    mapping(uint256 => Listing) _listings;
    uint256 _listingCount;

    // buy offers: bidId -> record. Funds are deposited with the bid and held
    // by the marketplace until accepted (seller) or cancelled (bidder).
    struct Bid {
        address bidder;
        address company;
        uint256 id;             // SIIR serial id
        uint128 price;          // in currencyId units, deposited
        uint32 currencyId;
        uint64 validUntil;      // 0 = no expiry
        bool accepted;
        uint128 fuelEscrow;     // SHELL escrowed for the settlement (v2.3)
    }
    mapping(uint256 => Bid) _bids;
    uint256 _bidCount;

    // fast lookup: company+id -> active listing id (0 = none)
    mapping(address => mapping(uint256 => uint256)) _activeListing;

    // dividend claim snapshots: balance per currency the moment claimAndForward
    // triggered the company's claim(); settleClaims forwards the delta that
    // lands back on this contract to the listing seller.
    mapping(address => mapping(uint256 => mapping(uint32 => uint128))) _divSnapshot;

    event Listed(uint256 listingId, address company, uint256 id, address seller, uint128 askPrice, uint32 currencyId);
    event Delisted(uint256 listingId, address company, uint256 id);
    event BidPlaced(uint256 bidId, address bidder, address company, uint256 id, uint128 price, uint32 currencyId);
    event BidCancelled(uint256 bidId, address bidder);
    event Settled(uint256 listingId, uint256 bidId, address company, uint256 id, address buyer, address seller, uint128 price, uint32 currencyId);
    event DividendsForwarded(address company, uint256 id, address seller, uint32[] currencyIds);

    constructor() accept {
        require(msg.sender == _factory, ERR_NOT_OWNER);
    }

    /// The deed-transfer body this marketplace sends on delist/acceptBid —
    /// same shape for every id, so it doubles as the forward-fee estimate.
    function _deedBody(uint256 id, address to) internal pure returns (TvmCell) {
        uint256[] one = new uint256[](1);
        one[0] = id;
        return abi.encodeBody(CompanySIIR.transfer, one, to);
    }

    /// Deterministic settlement fuel for one bid: acceptBid's own gas + the
    /// deed transfer (value + fwd fee + the company's SHELL entry fuel) + the
    /// price payout (value + fwd fee). Computed identically at bid time
    /// (escrow) and accept time (convert).
    function _settleFuel(uint256 id, address bidder) internal pure returns (uint128) {
        return _fuelFor(PAYOUT_VALUE * 2, _deedBody(id, bidder))
             + _estimateFwdFee(_emptyBody())
             + DEED_FUEL;
    }

    /// Ask: record a listing for an already-escrowed SIIR (the seller moved
    /// the deed to this contract via company.transfer first).
    /// @param company the CompanySIIR address
    /// @param ids     SIIR ids being listed (each gets its own listing)
    /// @param askPrice per-SIIR asking price
    /// @param currencyId ecc currency of askPrice
    function list(address company, uint256[] ids, uint128 askPrice, uint32 currencyId) public internalMsg {
        tvm.accept();
        _fuel(_fuelOwn());
        require(askPrice > 0, ERR_BAD_PRICE);
        require(currencyId != 0, ERR_BAD_ARGS);
        for (uint256 i = 0; i < ids.length; i++) {
            uint256 id = ids[i];
            require(_activeListing[company][id] == 0, ERR_NO_LISTING); // already listed
            _listingCount++;
            _listings[_listingCount] = Listing(company, id, msg.sender, askPrice, currencyId, uint64(block.timestamp), true);
            _activeListing[company][id] = _listingCount;
            emit Listed(_listingCount, company, id, msg.sender, askPrice, currencyId);
        }
    }

    /// Take a listing down: the SIIR is transferred back to the seller.
    /// @param company the CompanySIIR address
    /// @param ids     SIIR ids being delisted
    function delist(address company, uint256[] ids) public internalMsg {
        tvm.accept();
        require(ids.length > 0, ERR_BAD_ARGS);
        // auth the whole batch before any mutation, then fuel it once
        // (msg.currencies is a snapshot: per-id conversions would double-dip)
        for (uint256 i = 0; i < ids.length; i++) {
            uint256 listingId = _activeListing[company][ids[i]];
            require(listingId != 0, ERR_NO_LISTING);
            require(msg.sender == _listings[listingId].seller, ERR_NOT_SELLER);
        }
        uint128 ownFuel = _batchFuel(PAYOUT_VALUE, _deedBody(ids[0], msg.sender), ids.length);
        uint128 inbound = _inboundShell();
        uint128 needed = ownFuel + DEED_FUEL * uint128(ids.length);
        require(inbound >= needed, ERR_INSUFFICIENT_FUEL);
        gosh.cnvrtshellq(uint64(ownFuel));
        uint128 excess = inbound - needed;
        if (excess > 0) {
            _refundShell(msg.sender, excess);
        }
        for (uint256 i = 0; i < ids.length; i++) {
            uint256 id = ids[i];
            uint256 listingId = _activeListing[company][id];
            Listing l = _listings[listingId];
            _listings[listingId].active = false;
            delete _activeListing[company][id];
            emit Delisted(listingId, company, id);
            // return the deed to the seller; the attached SHELL lets the
            // company convert its own entry fuel
            uint256[] one = new uint256[](1);
            one[0] = id;
            mapping(uint32 => varuint32) cc;
            cc[CURRENCY_SHELL] = DEED_FUEL;
            CompanySIIR(company).transfer{value: varuint16(PAYOUT_VALUE), flag: 1, currencies: cc}(one, l.seller);
        }
    }

    /// Buy-side offer. The bidder's wallet deposits currencyId with this
    /// message plus the SHELL settlement escrow (v2.3); the marketplace
    /// holds both until acceptance/cancellation. Settlement is bidder-funded:
    /// acceptBid converts its fuel from this escrow, so the seller pays
    /// nothing beyond the call itself.
    /// @param company the CompanySIIR address
    /// @param ids     SIIR ids the offer covers
    /// @param price   total offered amount per id (deposited here)
    /// @param currencyId ecc currency deposited
    /// @param validUntil unix seconds; 0 = no expiry
    function bid(address company, uint256[] ids, uint128 price, uint32 currencyId, uint64 validUntil) public internalMsg {
        tvm.accept();
        require(ids.length > 0, ERR_BAD_ARGS);
        require(price > 0, ERR_BAD_PRICE);
        require(msg.currencies[currencyId] >= price * uint128(ids.length), ERR_BAD_PRICE);
        // deterministic per-id settlement fuel: acceptBid converts the same
        // amount from its escrow (same chain configs => same numbers)
        uint128 settle = _settleFuel(ids[0], msg.sender);
        uint128 escrow = settle * uint128(ids.length);
        require(msg.currencies[CURRENCY_SHELL] >= escrow, ERR_INSUFFICIENT_FUEL);
        if (currencyId == CURRENCY_SHELL) {
            escrow += price * uint128(ids.length);
        }
        // keep exactly price + settlement escrow; the rest goes straight back
        // to the bidder (generous attaches should not sit on the balance)
        uint128 attached = uint128(msg.currencies[CURRENCY_SHELL]);
        if (attached > escrow) {
            _refundShell(msg.sender, attached - escrow);
        }
        for (uint256 i = 0; i < ids.length; i++) {
            _bidCount++;
            _bids[_bidCount] = Bid(msg.sender, company, ids[i], price, currencyId, validUntil, false, settle);
            emit BidPlaced(_bidCount, msg.sender, company, ids[i], price, currencyId);
        }
    }

    /// Bidder withdraws an open offer: funds (price + settlement escrow)
    /// return in full. The bidder's attached SHELL pays for this call.
    function cancelBid(uint256 bidId) public internalMsg {
        Bid b = _bids[bidId];
        require(b.bidder.value != 0, ERR_NO_BID);
        require(msg.sender == b.bidder, ERR_NOT_BIDDER);
        require(!b.accepted, ERR_ALREADY_SETTLED);
        _bids[bidId].accepted = true; // funds already returned: mark spent
        _fuel(_fuelOwn());
        mapping(uint32 => varuint32) cc;
        if (b.currencyId == CURRENCY_SHELL) {
            cc[CURRENCY_SHELL] = b.price + b.fuelEscrow;
        } else {
            cc[b.currencyId] = b.price;
            cc[CURRENCY_SHELL] = b.fuelEscrow;
        }
        msg.sender.transfer({value: varuint16(PAYOUT_VALUE), flag: 1, currencies: cc});
        emit BidCancelled(bidId, msg.sender);
    }

    /// Seller accepts an offer: SIIR goes to the bidder, bid price to the
    /// seller. Requires the SIIR to be escrowed (listed) and the bid to be
    /// open and price-compatible with the ask. Bidder-funded (v2.3): the
    /// settlement fuel comes out of the bid's SHELL escrow, not the seller.
    function acceptBid(uint256 listingId, uint256 bidId) public internalMsg {
        Listing l = _listings[listingId];
        require(l.active, ERR_NO_LISTING);
        require(l.seller.value != 0, ERR_NO_LISTING);
        Bid b = _bids[bidId];
        require(b.bidder.value != 0, ERR_NO_BID);
        require(!b.accepted, ERR_ALREADY_SETTLED);
        require(b.validUntil == 0 || uint64(block.timestamp) <= b.validUntil, ERR_EXPIRED);
        require(b.company == l.company && b.id == l.id, ERR_BAD_ARGS);
        require(msg.sender == l.seller, ERR_NOT_SELLER);
        require(b.currencyId == l.currencyId, ERR_BAD_ARGS);
        require(b.price >= l.askPrice, ERR_BAD_PRICE);
        tvm.accept();

        // convert the settlement fuel from the bidder's escrow (aggregate
        // SHELL balance; per-bid escrow is the upper bound). DEED_FUEL stays
        // unconverted: it rides on the deed transfer so the company can
        // convert its own entry fuel.
        uint128 fuel = _settleFuel(l.id, b.bidder);
        require(b.fuelEscrow >= fuel, ERR_INSUFFICIENT_FUEL);
        require(uint128(address(this).currencies[CURRENCY_SHELL]) >= fuel, ERR_INSUFFICIENT_FUEL);
        gosh.cnvrtshellq(uint64(fuel - DEED_FUEL));

        _listings[listingId].active = false;
        delete _activeListing[l.company][l.id];
        _bids[bidId].accepted = true;

        // deed to buyer (cc SHELL = the company's entry fuel)
        uint256[] one = new uint256[](1);
        one[0] = l.id;
        mapping(uint32 => varuint32) deedCc;
        deedCc[CURRENCY_SHELL] = DEED_FUEL;
        CompanySIIR(l.company).transfer{value: varuint16(PAYOUT_VALUE), flag: 1, currencies: deedCc}(one, b.bidder);

        // price to seller (all deposited funds; seller's ask was met)
        mapping(uint32 => varuint32) cc;
        cc[b.currencyId] = b.price;
        l.seller.transfer({value: varuint16(PAYOUT_VALUE), flag: 1, currencies: cc});

        // unspent escrow back to the bidder
        uint128 leftover = b.fuelEscrow - fuel;
        if (leftover > 0) {
            _refundShell(b.bidder, leftover);
        }

        emit Settled(listingId, bidId, l.company, l.id, b.bidder, l.seller, b.price, b.currencyId);
    }

    /// The claim-body cell this marketplace sends to the company on
    /// claimAndForward (also the forward-fee estimate).
    function _claimBody(uint256 id) internal pure returns (TvmCell) {
        uint256[] one = new uint256[](1);
        one[0] = id;
        return abi.encodeBody(CompanySIIR.claim, one);
    }

    /// While a deed sits in escrow its dividends accrue to this contract.
    /// Anyone may trigger the company's claim() for listed deeds; the payout
    /// lands on this contract in a follow-up message, and settleClaims()
    /// forwards each track's delta to the listing seller. The caller's SHELL
    /// pays this call, the claim calls (value + fwd fee), and the claim
    /// fuel each claim message must carry to the company (claimer-pays).
    function claimAndForward(address company, uint256[] ids, uint32[] currencyIds) public internalMsg {
        tvm.accept();
        require(ids.length > 0, ERR_BAD_ARGS);
        for (uint256 i = 0; i < ids.length; i++) {
            uint256 id = ids[i];
            uint256 listingId = _activeListing[company][id];
            require(listingId != 0, ERR_NO_LISTING);
            require(_listings[listingId].active, ERR_NO_LISTING);
        }
        uint128 claimFuel = _fuelFor(PAYOUT_VALUE, _emptyBody());
        uint128 ownFuel = _batchFuel(PAYOUT_VALUE, _claimBody(ids[0]), ids.length);
        uint128 inbound = _inboundShell();
        uint128 needed = ownFuel + claimFuel * uint128(ids.length);
        require(inbound >= needed, ERR_INSUFFICIENT_FUEL);
        gosh.cnvrtshellq(uint64(ownFuel));
        uint128 excess = inbound - needed;
        if (excess > 0) {
            _refundShell(msg.sender, excess);
        }
        for (uint256 i = 0; i < ids.length; i++) {
            uint256 id = ids[i];
            for (uint256 c = 0; c < currencyIds.length; c++) {
                uint32 cur = currencyIds[c];
                if (!_divSnapshot[company][id].exists(cur)) {
                    _divSnapshot[company][id][cur] = uint128(address(this).currencies[cur]);
                }
            }
            // claim() sends to msg.sender = this contract; the attached SHELL
            // is the claim fuel the company converts (claimer-pays)
            uint256[] one = new uint256[](1);
            one[0] = id;
            mapping(uint32 => varuint32) cc;
            cc[CURRENCY_SHELL] = claimFuel;
            CompanySIIR(company).claim{value: varuint16(PAYOUT_VALUE), flag: 1, currencies: cc}(one);
        }
    }

    /// Forward to the seller the dividend delta that arrived on this contract
    /// since the claim snapshot was taken for each listed deed. The caller's
    /// SHELL pays for the call and the payout envelopes.
    /// @param company the CompanySIIR address
    /// @param ids     SIIR ids to settle
    /// @param currencyIds tracks to forward (SHELL=2, eccUSDC=3, ...)
    function settleClaims(address company, uint256[] ids, uint32[] currencyIds) public internalMsg {
        tvm.accept();
        require(ids.length > 0, ERR_BAD_ARGS);
        for (uint256 i = 0; i < ids.length; i++) {
            uint256 id = ids[i];
            uint256 listingId = _activeListing[company][id];
            require(listingId != 0, ERR_NO_LISTING);
            require(_listings[listingId].active, ERR_NO_LISTING);
        }
        _fuel(_batchFuel(PAYOUT_VALUE, _emptyBody(), ids.length));
        for (uint256 i = 0; i < ids.length; i++) {
            uint256 id = ids[i];
            uint256 listingId = _activeListing[company][id];
            Listing l = _listings[listingId];
            mapping(uint32 => varuint32) cc;
            uint128 total = 0;
            for (uint256 c = 0; c < currencyIds.length; c++) {
                uint32 cur = currencyIds[c];
                if (!_divSnapshot[company][id].exists(cur)) continue;
                uint128 delta = uint128(address(this).currencies[cur]) - _divSnapshot[company][id][cur];
                if (delta > 0) {
                    cc[cur] = delta;
                    total += delta;
                    _divSnapshot[company][id][cur] = uint128(address(this).currencies[cur]);
                }
            }
            if (total > 0) {
                l.seller.transfer({value: varuint16(PAYOUT_VALUE), flag: 1, currencies: cc});
                emit DividendsForwarded(company, id, l.seller, currencyIds);
            }
        }
    }

    // ---------- getters (off-chain emulation, no gas) ----------
    function getListingCount() external view returns (uint256 count) {
        return _listingCount;
    }

    function getListing(uint256 listingId) external view returns (
        address company,
        uint256 id,
        address seller,
        uint128 askPrice,
        uint32 currencyId,
        uint64 listedAt,
        bool active
    ) {
        Listing l = _listings[listingId];
        return (l.company, l.id, l.seller, l.askPrice, l.currencyId, l.listedAt, l.active);
    }

    function getListings(uint256 offset, uint8 limit) external view returns (
        uint256[] ids,
        address[] company,
        uint256[] siirIds,
        address[] seller,
        uint128[] askPrice,
        uint32[] currencyId,
        uint64[] listedAt,
        bool[] active
    ) {
        uint256 n = offset < _listingCount ? _listingCount - offset : 0;
        if (n > uint256(limit)) n = uint256(limit);
        ids = new uint256[](n);
        company = new address[](n);
        siirIds = new uint256[](n);
        seller = new address[](n);
        askPrice = new uint128[](n);
        currencyId = new uint32[](n);
        listedAt = new uint64[](n);
        active = new bool[](n);
        for (uint256 i = 0; i < n; i++) {
            Listing l = _listings[offset + i + 1];
            ids[i] = offset + i + 1;
            company[i] = l.company;
            siirIds[i] = l.id;
            seller[i] = l.seller;
            askPrice[i] = l.askPrice;
            currencyId[i] = l.currencyId;
            listedAt[i] = l.listedAt;
            active[i] = l.active;
        }
    }

    function getBidCount() external view returns (uint256 count) {
        return _bidCount;
    }

    function getBid(uint256 bidId) external view returns (
        address bidder,
        address company,
        uint256 id,
        uint128 price,
        uint32 currencyId,
        uint64 validUntil,
        bool accepted
    ) {
        Bid b = _bids[bidId];
        return (b.bidder, b.company, b.id, b.price, b.currencyId, b.validUntil, b.accepted);
    }

    function getBids(uint256 offset, uint8 limit) external view returns (
        uint256[] ids,
        address[] bidder,
        address[] company,
        uint256[] siirIds,
        uint128[] price,
        uint32[] currencyId,
        uint64[] validUntil,
        bool[] accepted
    ) {
        uint256 n = offset < _bidCount ? _bidCount - offset : 0;
        if (n > uint256(limit)) n = uint256(limit);
        ids = new uint256[](n);
        bidder = new address[](n);
        company = new address[](n);
        siirIds = new uint256[](n);
        price = new uint128[](n);
        currencyId = new uint32[](n);
        validUntil = new uint64[](n);
        accepted = new bool[](n);
        for (uint256 i = 0; i < n; i++) {
            Bid b = _bids[offset + i + 1];
            ids[i] = offset + i + 1;
            bidder[i] = b.bidder;
            company[i] = b.company;
            siirIds[i] = b.id;
            price[i] = b.price;
            currencyId[i] = b.currencyId;
            validUntil[i] = b.validUntil;
            accepted[i] = b.accepted;
        }
    }

    function getVersion() external pure returns (string, string) {
        return (version, "SIIRMarketplace");
    }
}
