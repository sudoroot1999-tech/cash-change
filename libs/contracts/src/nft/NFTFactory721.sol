// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Counters.sol";

contract CustomNFT721 is ERC721URIStorage, ERC721Enumerable, Ownable {
    using Counters for Counters.Counter;
    
    Counters.Counter private _tokenIds;
    
    string public contractURI;
    uint256 public maxSupply;
    uint256 public royaltyPercentage;
    address public royaltyRecipient;
    
    mapping(uint256 => address) public tokenCreators;
    
    event NFTMinted(uint256 indexed tokenId, address indexed to, string tokenURI);
    
    constructor(
        string memory name,
        string memory symbol,
        string memory _contractURI,
        uint256 _maxSupply,
        uint256 _royaltyPercentage,
        address _royaltyRecipient
    ) ERC721(name, symbol) Ownable(msg.sender) {
        contractURI = _contractURI;
        maxSupply = _maxSupply;
        royaltyPercentage = _royaltyPercentage;
        royaltyRecipient = _royaltyRecipient;
    }
    
    function mint(address to, string memory _tokenURI) external returns (uint256) {
        require(maxSupply == 0 || _tokenIds.current() < maxSupply, "Max supply reached");
        
        _tokenIds.increment();
        uint256 newTokenId = _tokenIds.current();
        
        _safeMint(to, newTokenId);
        _setTokenURI(newTokenId, _tokenURI);
        tokenCreators[newTokenId] = msg.sender;
        
        emit NFTMinted(newTokenId, to, _tokenURI);
        return newTokenId;
    }
    
    function batchMint(address to, string[] memory tokenURIs) external returns (uint256[] memory) {
        uint256[] memory tokenIds = new uint256[](tokenURIs.length);
        
        for (uint256 i = 0; i < tokenURIs.length; i++) {
            tokenIds[i] = mint(to, tokenURIs[i]);
        }
        
        return tokenIds;
    }
    
    function setRoyalty(uint256 _royaltyPercentage, address _royaltyRecipient) external onlyOwner {
        require(_royaltyPercentage <= 2000, "Royalty too high"); // Max 20%
        royaltyPercentage = _royaltyPercentage;
        royaltyRecipient = _royaltyRecipient;
    }
    
    function setContractURI(string memory _contractURI) external onlyOwner {
        contractURI = _contractURI;
    }
    
    // EIP-2981 NFT Royalty Standard
    function royaltyInfo(uint256 tokenId, uint256 salePrice) 
        external 
        view 
        returns (address receiver, uint256 royaltyAmount) 
    {
        require(_ownerOf(tokenId) != address(0), "Token does not exist");
        receiver = royaltyRecipient;
        royaltyAmount = (salePrice * royaltyPercentage) / 10000;
    }
    
    // The following functions are overrides required by Solidity
    function _update(address to, uint256 tokenId, address auth)
        internal
        override(ERC721, ERC721Enumerable)
        returns (address)
    {
        return super._update(to, tokenId, auth);
    }

    function _increaseBalance(address account, uint128 value)
        internal
        override(ERC721, ERC721Enumerable)
    {
        super._increaseBalance(account, value);
    }

    function tokenURI(uint256 tokenId)
        public
        view
        override(ERC721, ERC721URIStorage)
        returns (string memory)
    {
        return super.tokenURI(tokenId);
    }

    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC721URIStorage, ERC721Enumerable)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
}

contract NFTFactory721 is Ownable {
    event CollectionCreated(
        address indexed collectionAddress,
        address indexed creator,
        string name,
        string symbol
    );
    
    mapping(address => address[]) public creatorCollections;
    address[] public allCollections;
    
    constructor() Ownable(msg.sender) {}
    
    function createCollection(
        string memory name,
        string memory symbol,
        string memory contractURI,
        uint256 maxSupply,
        uint256 royaltyPercentage,
        address royaltyRecipient
    ) external returns (address) {
        require(royaltyPercentage <= 2000, "Royalty too high");
        
        CustomNFT721 newCollection = new CustomNFT721(
            name,
            symbol,
            contractURI,
            maxSupply,
            royaltyPercentage,
            royaltyRecipient
        );
        
        address collectionAddress = address(newCollection);
        newCollection.transferOwnership(msg.sender);
        
        creatorCollections[msg.sender].push(collectionAddress);
        allCollections.push(collectionAddress);
        
        emit CollectionCreated(collectionAddress, msg.sender, name, symbol);
        return collectionAddress;
    }
    
    function getCreatorCollections(address creator) external view returns (address[] memory) {
        return creatorCollections[creator];
    }
    
    function getAllCollections() external view returns (address[] memory) {
        return allCollections;
    }
}
