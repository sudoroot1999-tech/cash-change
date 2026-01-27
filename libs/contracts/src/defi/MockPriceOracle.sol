// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract MockPriceOracle {
    mapping(address => uint256) private prices;
    mapping(address => mapping(uint256 => uint256)) private nftPrices;

    constructor() {
        // Set default prices (in USD with 18 decimals)
        // These are mock prices for testing
    }

    function setPrice(address token, uint256 price) external {
        prices[token] = price;
    }

    function getPrice(address token) external view returns (uint256) {
        uint256 price = prices[token];
        if (price == 0) {
            // Return default price if not set
            return 100 * 1e18; // $100 default
        }
        return price;
    }

    function setNFTPrice(address nftContract, uint256 tokenId, uint256 price) external {
        nftPrices[nftContract][tokenId] = price;
    }

    function getNFTPrice(address nftContract, uint256 tokenId) external view returns (uint256) {
        uint256 price = nftPrices[nftContract][tokenId];
        if (price == 0) {
            // Return default NFT price if not set
            return 10000 * 1e18; // $10,000 default
        }
        return price;
    }

    // Batch set prices
    function setPrices(address[] calldata tokens, uint256[] calldata _prices) external {
        require(tokens.length == _prices.length, "Length mismatch");
        for (uint256 i = 0; i < tokens.length; i++) {
            prices[tokens[i]] = _prices[i];
        }
    }
}
