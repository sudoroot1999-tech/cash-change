// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract FractionToken is ERC20 {
    address public vault;
    
    constructor(
        string memory name,
        string memory symbol,
        uint256 totalSupply,
        address _vault
    ) ERC20(name, symbol) {
        vault = _vault;
        _mint(_vault, totalSupply);
    }
}

contract FractionalNFT is ReentrancyGuard, Ownable {
    enum VaultStatus { ACTIVE, LOCKED, REDEEMED }
    
    struct Vault {
        address nftContract;
        uint256 tokenId;
        address fractionToken;
        uint256 totalFractions;
        uint256 reservePrice;
        address curator;
        VaultStatus status;
        uint256 createdAt;
    }
    
    uint256 private _vaultIdCounter;
    mapping(uint256 => Vault) public vaults;
    mapping(address => uint256[]) public curatorVaults;
    
    // Buyout mechanism
    mapping(uint256 => address) public buyoutInitiator;
    mapping(uint256 => uint256) public buyoutPrice;
    mapping(uint256 => uint256) public buyoutDeadline;
    
    event VaultCreated(
        uint256 indexed vaultId,
        address indexed nftContract,
        uint256 indexed tokenId,
        address fractionToken,
        uint256 totalFractions
    );
    
    event FractionsRedeemed(uint256 indexed vaultId, address indexed redeemer);
    event BuyoutInitiated(uint256 indexed vaultId, address indexed initiator, uint256 price);
    event BuyoutCompleted(uint256 indexed vaultId, address indexed buyer);
    
    constructor() Ownable(msg.sender) {}
    
    function fractionalizeNFT(
        address nftContract,
        uint256 tokenId,
        string memory fractionName,
        string memory fractionSymbol,
        uint256 totalFractions,
        uint256 reservePrice
    ) external nonReentrant returns (uint256, address) {
        require(totalFractions > 0, "Invalid total fractions");
        require(IERC721(nftContract).ownerOf(tokenId) == msg.sender, "Not token owner");
        
        // Transfer NFT to this contract
        IERC721(nftContract).transferFrom(msg.sender, address(this), tokenId);
        
        // Create fraction token
        FractionToken fractionToken = new FractionToken(
            fractionName,
            fractionSymbol,
            totalFractions,
            msg.sender
        );
        
        uint256 vaultId = _vaultIdCounter++;
        
        vaults[vaultId] = Vault({
            nftContract: nftContract,
            tokenId: tokenId,
            fractionToken: address(fractionToken),
            totalFractions: totalFractions,
            reservePrice: reservePrice,
            curator: msg.sender,
            status: VaultStatus.ACTIVE,
            createdAt: block.timestamp
        });
        
        curatorVaults[msg.sender].push(vaultId);
        
        emit VaultCreated(vaultId, nftContract, tokenId, address(fractionToken), totalFractions);
        return (vaultId, address(fractionToken));
    }
    
    function redeemNFT(uint256 vaultId) external nonReentrant {
        Vault storage vault = vaults[vaultId];
        require(vault.status == VaultStatus.ACTIVE, "Vault not active");
        
        FractionToken fractionToken = FractionToken(vault.fractionToken);
        uint256 totalFractions = vault.totalFractions;
        
        require(fractionToken.balanceOf(msg.sender) == totalFractions, "Must own all fractions");
        
        // Burn fraction tokens
        fractionToken.transferFrom(msg.sender, address(this), totalFractions);
        
        // Transfer NFT back
        IERC721(vault.nftContract).transferFrom(address(this), msg.sender, vault.tokenId);
        
        vault.status = VaultStatus.REDEEMED;
        
        emit FractionsRedeemed(vaultId, msg.sender);
    }
    
    function initiateBuyout(uint256 vaultId, uint256 price) external payable nonReentrant {
        Vault storage vault = vaults[vaultId];
        require(vault.status == VaultStatus.ACTIVE, "Vault not active");
        require(price >= vault.reservePrice, "Price below reserve");
        require(msg.value >= price, "Insufficient payment");
        
        FractionToken fractionToken = FractionToken(vault.fractionToken);
        uint256 initiatorBalance = fractionToken.balanceOf(msg.sender);
        require(initiatorBalance > 0, "Must own fractions");
        
        buyoutInitiator[vaultId] = msg.sender;
        buyoutPrice[vaultId] = price;
        buyoutDeadline[vaultId] = block.timestamp + 7 days;
        
        vault.status = VaultStatus.LOCKED;
        
        emit BuyoutInitiated(vaultId, msg.sender, price);
    }
    
    function executeBuyout(uint256 vaultId) external nonReentrant {
        require(block.timestamp >= buyoutDeadline[vaultId], "Buyout period not ended");
        
        Vault storage vault = vaults[vaultId];
        require(vault.status == VaultStatus.LOCKED, "Vault not locked");
        
        address initiator = buyoutInitiator[vaultId];
        uint256 price = buyoutPrice[vaultId];
        
        FractionToken fractionToken = FractionToken(vault.fractionToken);
        uint256 totalFractions = vault.totalFractions;
        uint256 initiatorBalance = fractionToken.balanceOf(initiator);
        
        // Calculate payment to other fraction holders
        uint256 pricePerFraction = price / totalFractions;
        uint256 otherFractions = totalFractions - initiatorBalance;
        uint256 paymentToOthers = pricePerFraction * otherFractions;
        
        // Transfer NFT to initiator
        IERC721(vault.nftContract).transferFrom(address(this), initiator, vault.tokenId);
        
        vault.status = VaultStatus.REDEEMED;
        
        emit BuyoutCompleted(vaultId, initiator);
    }
    
    function claimBuyoutProceeds(uint256 vaultId) external nonReentrant {
        Vault memory vault = vaults[vaultId];
        require(vault.status == VaultStatus.REDEEMED, "Vault not redeemed");
        
        FractionToken fractionToken = FractionToken(vault.fractionToken);
        uint256 balance = fractionToken.balanceOf(msg.sender);
        require(balance > 0, "No fractions to claim");
        
        uint256 pricePerFraction = buyoutPrice[vaultId] / vault.totalFractions;
        uint256 payment = pricePerFraction * balance;
        
        // Burn fraction tokens
        fractionToken.transferFrom(msg.sender, address(this), balance);
        
        // Transfer payment
        payable(msg.sender).transfer(payment);
    }
    
    function getCuratorVaults(address curator) external view returns (uint256[] memory) {
        return curatorVaults[curator];
    }
    
    receive() external payable {}
}
