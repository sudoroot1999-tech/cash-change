// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/token/ERC1155/IERC1155.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/cryptography/EIP712.sol";

contract NFTMarketplace is ReentrancyGuard, Ownable, EIP712 {
    using ECDSA for bytes32;

    // Marketplace fee (in basis points, e.g., 250 = 2.5%)
    uint256 public marketplaceFee = 250;
    uint256 public constant MAX_FEE = 1000; // 10% max
    
    address public feeRecipient;

    enum TokenType { ERC721, ERC1155 }
    enum ListingType { FIXED_PRICE, AUCTION, BUNDLE }
    enum ListingStatus { ACTIVE, SOLD, CANCELLED, EXPIRED }

    struct Listing {
        address seller;
        address nftContract;
        uint256 tokenId;
        uint256 quantity;
        uint256 price;
        address paymentToken;
        TokenType tokenType;
        ListingType listingType;
        ListingStatus status;
        uint256 startTime;
        uint256 endTime;
    }

    struct LazyMintVoucher {
        address nftContract;
        uint256 tokenId;
        string tokenURI;
        address creator;
        uint256 royaltyPercentage;
        uint256 price;
        address paymentToken;
        uint256 nonce;
        bytes signature;
    }

    struct Royalty {
        address recipient;
        uint256 percentage; // in basis points
    }

    // Listing ID counter
    uint256 private _listingIdCounter;

    // Mappings
    mapping(uint256 => Listing) public listings;
    mapping(address => mapping(uint256 => Royalty)) public royalties;
    mapping(address => uint256) public nonces;
    mapping(bytes32 => bool) public usedVouchers;

    // Events
    event Listed(
        uint256 indexed listingId,
        address indexed seller,
        address indexed nftContract,
        uint256 tokenId,
        uint256 price,
        uint256 quantity
    );

    event Sale(
        uint256 indexed listingId,
        address indexed buyer,
        address indexed seller,
        uint256 price,
        uint256 quantity
    );

    event ListingCancelled(uint256 indexed listingId);
    event ListingUpdated(uint256 indexed listingId, uint256 newPrice);
    event RoyaltySet(address indexed nftContract, uint256 indexed tokenId, address recipient, uint256 percentage);
    event MarketplaceFeeUpdated(uint256 newFee);
    event LazyMinted(address indexed nftContract, uint256 indexed tokenId, address indexed creator);

    constructor(address _feeRecipient) EIP712("NFTMarketplace", "1") Ownable(msg.sender) {
        feeRecipient = _feeRecipient;
    }

    // List NFT for sale
    function listNFT(
        address nftContract,
        uint256 tokenId,
        uint256 quantity,
        uint256 price,
        address paymentToken,
        TokenType tokenType,
        uint256 duration
    ) external nonReentrant returns (uint256) {
        require(price > 0, "Price must be greater than 0");
        require(quantity > 0, "Quantity must be greater than 0");

        if (tokenType == TokenType.ERC721) {
            require(quantity == 1, "ERC721 quantity must be 1");
            require(IERC721(nftContract).ownerOf(tokenId) == msg.sender, "Not token owner");
            require(
                IERC721(nftContract).isApprovedForAll(msg.sender, address(this)) ||
                IERC721(nftContract).getApproved(tokenId) == address(this),
                "Marketplace not approved"
            );
        } else {
            require(IERC1155(nftContract).balanceOf(msg.sender, tokenId) >= quantity, "Insufficient balance");
            require(IERC1155(nftContract).isApprovedForAll(msg.sender, address(this)), "Marketplace not approved");
        }

        uint256 listingId = _listingIdCounter++;
        uint256 endTime = duration > 0 ? block.timestamp + duration : 0;

        listings[listingId] = Listing({
            seller: msg.sender,
            nftContract: nftContract,
            tokenId: tokenId,
            quantity: quantity,
            price: price,
            paymentToken: paymentToken,
            tokenType: tokenType,
            listingType: ListingType.FIXED_PRICE,
            status: ListingStatus.ACTIVE,
            startTime: block.timestamp,
            endTime: endTime
        });

        emit Listed(listingId, msg.sender, nftContract, tokenId, price, quantity);
        return listingId;
    }

    // Buy NFT
    function buyNFT(uint256 listingId, uint256 quantity) external payable nonReentrant {
        Listing storage listing = listings[listingId];
        require(listing.status == ListingStatus.ACTIVE, "Listing not active");
        require(quantity > 0 && quantity <= listing.quantity, "Invalid quantity");
        
        if (listing.endTime > 0) {
            require(block.timestamp < listing.endTime, "Listing expired");
        }

        uint256 totalPrice = listing.price * quantity;

        // Handle payment
        if (listing.paymentToken == address(0)) {
            require(msg.value >= totalPrice, "Insufficient payment");
        } else {
            require(IERC20(listing.paymentToken).transferFrom(msg.sender, address(this), totalPrice), "Payment failed");
        }

        // Calculate fees and royalties
        uint256 marketplaceFeeAmount = (totalPrice * marketplaceFee) / 10000;
        uint256 royaltyAmount = 0;
        
        Royalty memory royalty = royalties[listing.nftContract][listing.tokenId];
        if (royalty.recipient != address(0) && royalty.percentage > 0) {
            royaltyAmount = (totalPrice * royalty.percentage) / 10000;
        }

        uint256 sellerAmount = totalPrice - marketplaceFeeAmount - royaltyAmount;

        // Transfer NFT
        if (listing.tokenType == TokenType.ERC721) {
            IERC721(listing.nftContract).safeTransferFrom(listing.seller, msg.sender, listing.tokenId);
        } else {
            IERC1155(listing.nftContract).safeTransferFrom(listing.seller, msg.sender, listing.tokenId, quantity, "");
        }

        // Distribute payments
        if (listing.paymentToken == address(0)) {
            payable(feeRecipient).transfer(marketplaceFeeAmount);
            if (royaltyAmount > 0) {
                payable(royalty.recipient).transfer(royaltyAmount);
            }
            payable(listing.seller).transfer(sellerAmount);
            
            // Refund excess payment
            if (msg.value > totalPrice) {
                payable(msg.sender).transfer(msg.value - totalPrice);
            }
        } else {
            IERC20(listing.paymentToken).transfer(feeRecipient, marketplaceFeeAmount);
            if (royaltyAmount > 0) {
                IERC20(listing.paymentToken).transfer(royalty.recipient, royaltyAmount);
            }
            IERC20(listing.paymentToken).transfer(listing.seller, sellerAmount);
        }

        // Update listing
        listing.quantity -= quantity;
        if (listing.quantity == 0) {
            listing.status = ListingStatus.SOLD;
        }

        emit Sale(listingId, msg.sender, listing.seller, totalPrice, quantity);
    }

    // Lazy mint and buy
    function lazyMintAndBuy(LazyMintVoucher calldata voucher) external payable nonReentrant {
        bytes32 voucherHash = _hashVoucher(voucher);
        require(!usedVouchers[voucherHash], "Voucher already used");
        require(_verifyVoucher(voucher), "Invalid voucher signature");

        usedVouchers[voucherHash] = true;

        uint256 totalPrice = voucher.price;
        
        // Handle payment
        if (voucher.paymentToken == address(0)) {
            require(msg.value >= totalPrice, "Insufficient payment");
        } else {
            require(IERC20(voucher.paymentToken).transferFrom(msg.sender, address(this), totalPrice), "Payment failed");
        }

        // Calculate fees and royalties
        uint256 marketplaceFeeAmount = (totalPrice * marketplaceFee) / 10000;
        uint256 royaltyAmount = (totalPrice * voucher.royaltyPercentage) / 10000;
        uint256 creatorAmount = totalPrice - marketplaceFeeAmount - royaltyAmount;

        // Set royalty
        if (voucher.royaltyPercentage > 0) {
            royalties[voucher.nftContract][voucher.tokenId] = Royalty({
                recipient: voucher.creator,
                percentage: voucher.royaltyPercentage
            });
        }

        // Distribute payments
        if (voucher.paymentToken == address(0)) {
            payable(feeRecipient).transfer(marketplaceFeeAmount);
            if (royaltyAmount > 0) {
                payable(voucher.creator).transfer(royaltyAmount);
            }
            payable(voucher.creator).transfer(creatorAmount);
            
            if (msg.value > totalPrice) {
                payable(msg.sender).transfer(msg.value - totalPrice);
            }
        } else {
            IERC20(voucher.paymentToken).transfer(feeRecipient, marketplaceFeeAmount);
            if (royaltyAmount > 0) {
                IERC20(voucher.paymentToken).transfer(voucher.creator, royaltyAmount);
            }
            IERC20(voucher.paymentToken).transfer(voucher.creator, creatorAmount);
        }

        emit LazyMinted(voucher.nftContract, voucher.tokenId, voucher.creator);
    }

    // Cancel listing
    function cancelListing(uint256 listingId) external {
        Listing storage listing = listings[listingId];
        require(listing.seller == msg.sender, "Not seller");
        require(listing.status == ListingStatus.ACTIVE, "Listing not active");

        listing.status = ListingStatus.CANCELLED;
        emit ListingCancelled(listingId);
    }

    // Update listing price
    function updateListingPrice(uint256 listingId, uint256 newPrice) external {
        Listing storage listing = listings[listingId];
        require(listing.seller == msg.sender, "Not seller");
        require(listing.status == ListingStatus.ACTIVE, "Listing not active");
        require(newPrice > 0, "Price must be greater than 0");

        listing.price = newPrice;
        emit ListingUpdated(listingId, newPrice);
    }

    // Set royalty for NFT
    function setRoyalty(address nftContract, uint256 tokenId, address recipient, uint256 percentage) external {
        require(percentage <= 2000, "Royalty too high"); // Max 20%
        
        if (IERC721(nftContract).supportsInterface(type(IERC721).interfaceId)) {
            require(IERC721(nftContract).ownerOf(tokenId) == msg.sender, "Not token owner");
        }

        royalties[nftContract][tokenId] = Royalty({
            recipient: recipient,
            percentage: percentage
        });

        emit RoyaltySet(nftContract, tokenId, recipient, percentage);
    }

    // Admin functions
    function setMarketplaceFee(uint256 _fee) external onlyOwner {
        require(_fee <= MAX_FEE, "Fee too high");
        marketplaceFee = _fee;
        emit MarketplaceFeeUpdated(_fee);
    }

    function setFeeRecipient(address _feeRecipient) external onlyOwner {
        require(_feeRecipient != address(0), "Invalid address");
        feeRecipient = _feeRecipient;
    }

    // Internal functions
    function _hashVoucher(LazyMintVoucher calldata voucher) internal pure returns (bytes32) {
        return keccak256(abi.encode(
            voucher.nftContract,
            voucher.tokenId,
            voucher.tokenURI,
            voucher.creator,
            voucher.royaltyPercentage,
            voucher.price,
            voucher.paymentToken,
            voucher.nonce
        ));
    }

    function _verifyVoucher(LazyMintVoucher calldata voucher) internal view returns (bool) {
        bytes32 digest = _hashTypedDataV4(_hashVoucher(voucher));
        address signer = ECDSA.recover(digest, voucher.signature);
        return signer == voucher.creator;
    }

    // Receive ETH
    receive() external payable {}
}
