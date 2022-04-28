// SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "redstone-evm-connector/lib/contracts/message-based/PriceAware.sol";
import "./Marketplace.sol";

// StableMarketplace contract extends PriceAware contract
// For being able to use redstone oracles data
contract StableMarketplace is Marketplace, PriceAware {
    // You can check addresses for authorized redstone signers at:
    // https://github.com/redstone-finance/redstone-evm-connector/blob/master/README.md#1-modifying-your-contracts
    function isSignerAuthorized(address _signer)
        public
        pure
        override
        returns (bool)
    {
        return _signer == 0x0C39486f770B26F5527BBBf942726537986Cd7eb;
    }

    // `_getPriceFromOrder` function uses the `getPriceFromMsg` function,
    // which fetches signed data from tx calldata and verifies its signature
    function _getPriceFromOrder(SellOrder memory order)
        internal
        view
        override
        returns (uint256)
    {
        return (order.price / getPriceFromMsg(bytes32("ETH"))) * (10**8);
    }

    // [OPTIONAL] function for data package timestamp validation
    function isTimestampValid(uint256 _receivedTimestamp)
        public
        pure
        override
        returns (bool)
    {
        _receivedTimestamp; // added to avoid warnings with an unused arg

        // We return true to avoid problems with local hardhat network.
        // It's strongly recommended to have the real time validation
        // in production dApps
        return true;
    }
}
