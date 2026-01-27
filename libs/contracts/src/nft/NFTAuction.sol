// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/token/ERC1155/IERC1155.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract NFTAuction is ReentrancyGuard, Ownable {
    enum TokenType { ERC721, ERC1155 }
    enum AuctionType { ENGLISH, DUTCH }
    enum AuctionStatus { ACTIVE, ENDED, CANCELLED }

    struct Auction {
        address seller;
        address nftContract;
        uint256 tokenId;
        uint256 quantity;
        TokenType tokenType;
        AuctionType auctionType;
        AuctionStatus status;
        uint256 startingPrice;
        uint256 reservePrice;
        uint256 endingPrice; // For Dutch auction
        uint256 currentBid;
        address highestBidder;
        address paymentToken;
        uint256 startTime;
        uint256 endTime;
        uint256 duration;
        bool settled;
    }

    struct Bid {
        address bidder;
        uint256 amount;
        uint256 timestamp;
    }

    uint256 private _auctionIdCounter;
    uint256 public marketplaceFee = 250; // 2.5%
    address public feeRecipient;
    uint256 public minBidIncrement = 500; // 5%

    mapping(uint256 => Auction) public auctions;
    mapping(uint256 => Bid[]) public auctionBids;
    mapping(address => mapping(uint256 => uint256)) public royalties;

    event AuctionCreated(
        uint256 indexed auctionId,
        address indexed seller,
        address indexed nftContract,
        uint256 tokenId,
        uint256 startingPrice,
        AuctionType auctionType
    );

    event BidPlaced(
        uint256 indexed auctionId,
        address indexed bidder,
        uint256 amount,
        uint256 timestamp
    );

    event AuctionEnded(
        uint256 indexed auctionId,
        address indexed winner,
        uint256 finalPrice
    );

    event AuctionCancelled(uint256 indexed auctionId);

    constructor(address _feeRecipient) Ownable(msg.sender) {
        feeRecipient = _feeRecipient;
    }

    // Create English auction
    function createEnglishAuction(
        address nftContract,
        uint256 tokenId,
        uint256 quantity,
        TokenType tokenType,
        uint256 startingPrice,
        uint256 reservePrice,
        address paymentToken,
        uint256 duration
    ) external nonReentrant returns (uint256) {
        require(duration >= 3600, "Duration too short"); // Min 1 hour
        require(duration <= 30 days, "Duration too long");
        require(startingPrice > 0, "Invalid starting price");
        require(reservePrice >= startingPrice, "Invalid reserve price");

        _validateOwnership(nftContract, tokenId, quantity, tokenType, msg.sender);

        uint256 auctionId = _auctionIdCounter++;

        auctions[auctionId] = Auction({
            seller: msg.sender,
            nftContract: nftContract,
            tokenId: tokenId,
            quantity: quantity,
            tokenType: tokenType,
            auctionType: AuctionType.ENGLISH,
            status: AuctionStatus.ACTIVE,
            startingPrice: startingPrice,
            reservePrice: reservePrice,
            endingPrice: 0,
            currentBid: 0,
            highestBidder: address(0),
            paymentToken: paymentToken,
            startTime: block.timestamp,
            endTime: block.timestamp + duration,
            duration: duration,
            settled: false
        });

        emit AuctionCreated(auctionId, msg.sender, nftContract, tokenId, startingPrice, AuctionType.ENGLISH);
        return auctionId;
    }

    // Create Dutch auction
    function createDutchAuction(
        address nftContract,
        uint256 tokenId,
        uint256 quantity,
        TokenType tokenType,
        uint256 startingPrice,
        uint256 endingPrice,
        address paymentToken,
        uint256 duration
    ) external nonReentrant returns (uint256) {
        require(duration >= 3600, "Duration too short");
        require(duration <= 7 days, "Duration too long");
        require(startingPrice > endingPrice, "Invalid price range");
        require(endingPrice > 0, "Invalid ending price");

        _validateOwnership(nftContract, tokenId, quantity, tokenType, msg.sender);

        uint256 auctionId = _auctionIdCounter++;

        auctions[auctionId] = Auction({
            seller: msg.sender,
            nftContract: nftContract,
            tokenId: tokenId,
            quantity: quantity,
            tokenType: tokenType,
            auctionType: AuctionType.DUTCH,
            status: AuctionStatus.ACTIVE,
            startingPrice: startingPrice,
            reservePrice: endingPrice,
            endingPrice: endingPrice,
            currentBid: 0,
            highestBidder: address(0),
            paymentToken: paymentToken,
            startTime: block.timestamp,
            endTime: block.timestamp + duration,
            duration: duration,
            settled: false
        });

        emit AuctionCreated(auctionId, msg.sender, nftContract, tokenId, startingPrice, AuctionType.DUTCH);
        return auctionId;
    }

    // Place bid on English auction
    function placeBid(uint256 auctionId) external payable nonReentrant {
        Auction storage auction = auctions[auctionId];
        require(auction.status == AuctionStatus.ACTIVE, "Auction not active");
        require(auction.auctionType == AuctionType.ENGLISH, "Not English auction");
        require(block.timestamp < auction.endTime, "Auction ended");
        require(msg.sender != auction.seller, "Seller cannot bid");

        uint256 bidAmount;
        if (auction.paymentToken == address(0)) {
            bidAmount = msg.value;
        } else {
            bidAmount = msg.value; // Amount should be passed separately for ERC20
            require(IERC20(auction.paymentToken).transferFrom(msg.sender, address(this), bidAmount), "Transfer failed");
        }

        uint256 minBid = auction.currentBid == 0 
            ? auction.startingPrice 
            : auction.currentBid + (auction.currentBid * minBidIncrement / 10000);

        require(bidAmount >= minBid, "Bid too low");

        // Refund previous highest bidder
        if (auction.highestBidder != address(0)) {
            if (auction.paymentToken == address(0)) {
                payable(auction.highestBidder).transfer(auction.currentBid);
            } else {
                IERC20(auction.paymentToken).transfer(auction.highestBidder, auction.currentBid);
            }
        }

        auction.currentBid = bidAmount;
        auction.highestBidder = msg.sender;

        auctionBids[auctionId].push(Bid({
            bidder: msg.sender,
            amount: bidAmount,
            timestamp: block.timestamp
        }));

        // Extend auction if bid placed in last 5 minutes
        if (auction.endTime - block.timestamp < 300) {
            auction.endTime = block.timestamp + 300;
        }

        emit BidPlaced(auctionId, msg.sender, bidAmount, block.timestamp);
    }

    // Buy now on Dutch auction
    function buyDutchAuction(uint256 auctionId) external payable nonReentrant {
        Auction storage auction = auctions[auctionId];
        require(auction.status == AuctionStatus.ACTIVE, "Auction not active");
        require(auction.auctionType == AuctionType.DUTCH, "Not Dutch auction");
        require(block.timestamp < auction.endTime, "Auction ended");

        uint256 currentPrice = getCurrentDutchPrice(auctionId);

        if (auction.paymentToken == address(0)) {
            require(msg.value >= currentPrice, "Insufficient payment");
        } else {
            require(IERC20(auction.paymentToken).transferFrom(msg.sender, address(this), currentPrice), "Payment failed");
        }

        auction.currentBid = currentPrice;
        auction.highestBidder = msg.sender;
        auction.status = AuctionStatus.ENDED;

        _settleAuction(auctionId);

        emit AuctionEnded(auctionId, msg.sender, currentPrice);
    }

    // End English auction
    function endAuction(uint256 auctionId) external nonReentrant {
        Auction storage auction = auctions[auctionId];
        require(auction.status == AuctionStatus.ACTIVE, "Auction not active");
        require(auction.auctionType == AuctionType.ENGLISH, "Not English auction");
        require(block.timestamp >= auction.endTime, "Auction still active");
        require(!auction.settled, "Already settled");

        auction.status = AuctionStatus.ENDED;

        if (auction.highestBidder != address(0) && auction.currentBid >= auction.reservePrice) {
            _settleAuction(auctionId);
            emit AuctionEnded(auctionId, auction.highestBidder, auction.currentBid);
        } else {
            // Return NFT to seller if reserve not met
            if (auction.highestBidder != address(0)) {
                // Refund highest bidder
                if (auction.paymentToken == address(0)) {
                    payable(auction.highestBidder).transfer(auction.currentBid);
                } else {
                    IERC20(auction.paymentToken).transfer(auction.highestBidder, auction.currentBid);
                }
            }
            auction.settled = true;
            emit AuctionEnded(auctionId, address(0), 0);
        }
    }

    // Cancel auction
    function cancelAuction(uint256 auctionId) external {
        Auction storage auction = auctions[auctionId];
        require(auction.seller == msg.sender, "Not seller");
        require(auction.status == AuctionStatus.ACTIVE, "Auction not active");
        require(auction.highestBidder == address(0), "Bids already placed");

        auction.status = AuctionStatus.CANCELLED;
        emit AuctionCancelled(auctionId);
    }

    // Get current Dutch auction price
    function getCurrentDutchPrice(uint256 auctionId) public view returns (uint256) {
        Auction memory auction = auctions[auctionId];
        require(auction.auctionType == AuctionType.DUTCH, "Not Dutch auction");

        if (block.timestamp >= auction.endTime) {
            return auction.endingPrice;
        }

        uint256 elapsed = block.timestamp - auction.startTime;
        uint256 priceDrop = auction.startingPrice - auction.endingPrice;
        uint256 priceReduction = (priceDrop * elapsed) / auction.duration;

        return auction.startingPrice - priceReduction;
    }

    // Internal settle auction
    function _settleAuction(uint256 auctionId) internal {
        Auction storage auction = auctions[auctionId];
        require(!auction.settled, "Already settled");

        uint256 totalPrice = auction.currentBid;
        uint256 marketplaceFeeAmount = (totalPrice * marketplaceFee) / 10000;
        uint256 royaltyAmount = 0;

        uint256 royaltyPercentage = royalties[auction.nftContract][auction.tokenId];
        if (royaltyPercentage > 0) {
            royaltyAmount = (totalPrice * royaltyPercentage) / 10000;
        }

        uint256 sellerAmount = totalPrice - marketplaceFeeAmount - royaltyAmount;

        // Transfer NFT
        if (auction.tokenType == TokenType.ERC721) {
            IERC721(auction.nftContract).safeTransferFrom(auction.seller, auction.highestBidder, auction.tokenId);
        } else {
            IERC1155(auction.nftContract).safeTransferFrom(
                auction.seller,
                auction.highestBidder,
                auction.tokenId,
                auction.quantity,
                ""
            );
        }

        // Distribute payments
        if (auction.paymentToken == address(0)) {
            payable(feeRecipient).transfer(marketplaceFeeAmount);
            payable(auction.seller).transfer(sellerAmount);
        } else {
            IERC20(auction.paymentToken).transfer(feeRecipient, marketplaceFeeAmount);
            IERC20(auction.paymentToken).transfer(auction.seller, sellerAmount);
        }

        auction.settled = true;
    }

    // Validate ownership
    function _validateOwnership(
        address nftContract,
        uint256 tokenId,
        uint256 quantity,
        TokenType tokenType,
        address owner
    ) internal view {
        if (tokenType == TokenType.ERC721) {
            require(quantity == 1, "ERC721 quantity must be 1");
            require(IERC721(nftContract).ownerOf(tokenId) == owner, "Not token owner");
            require(
                IERC721(nftContract).isApprovedForAll(owner, address(this)) ||
                IERC721(nftContract).getApproved(tokenId) == address(this),
                "Contract not approved"
            );
        } else {
            require(IERC1155(nftContract).balanceOf(owner, tokenId) >= quantity, "Insufficient balance");
            require(IERC1155(nftContract).isApprovedForAll(owner, address(this)), "Contract not approved");
        }
    }

    // Admin functions
    function setMarketplaceFee(uint256 _fee) external onlyOwner {
        require(_fee <= 1000, "Fee too high");
        marketplaceFee = _fee;
    }

    function setMinBidIncrement(uint256 _increment) external onlyOwner {
        require(_increment >= 100 && _increment <= 2000, "Invalid increment");
        minBidIncrement = _increment;
    }

    function setFeeRecipient(address _feeRecipient) external onlyOwner {
        require(_feeRecipient != address(0), "Invalid address");
        feeRecipient = _feeRecipient;
    }

    // Get auction bids
    function getAuctionBids(uint256 auctionId) external view returns (Bid[] memory) {
        return auctionBids[auctionId];
    }

    receive() external payable {}
}
