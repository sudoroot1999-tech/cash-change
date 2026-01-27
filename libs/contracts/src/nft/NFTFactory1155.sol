// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC1155/extensions/ERC1155URIStorage.sol";
import "@openzeppelin/contracts/token/ERC1155/extensions/ERC1155Supply.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract CustomNFT1155 is ERC1155URIStorage, ERC1155Supply, Ownable {
    string public name;
    string public symbol;
    string public contractURI;
    uint256 public royaltyPercentage;
    address public royaltyRecipient;
    
    uint256 private _currentTokenId;
    mapping(uint256 => address) public tokenCreators;
    mapping(uint256 => uint256) public tokenMaxSupply;
    
    event NFTMinted(uint256 indexed tokenId, address indexed to, uint256 amount, string tokenURI);
    
    constructor(
        string memory _name,
        string memory _symbol,
        string memory _contractURI,
        uint256 _royaltyPercentage,
        address _royaltyRecipient
    ) ERC1155("") Ownable(msg.sender) {
        name = _name;
        symbol = _symbol;
        contractURI = _contractURI;
        royaltyPercentage = _royaltyPercentage;
        royaltyRecipient = _royaltyRecipient;
    }
    
    function mint(
        address to,
        uint256 amount,
        string memory _tokenURI,
        uint256 maxSupply
    ) external returns (uint256) {
        _currentTokenId++;
        uint256 newTokenId = _currentTokenId;
        
        require(maxSupply == 0 || amount <= maxSupply, "Exceeds max supply");
        
        _mint(to, newTokenId, amount, "");
        _setURI(newTokenId, _tokenURI);
        
        tokenCreators[newTokenId] = msg.sender;
        tokenMaxSupply[newTokenId] = maxSupply;
        
        emit NFTMinted(newTokenId, to, amount, _tokenURI);
        return newTokenId;
    }
    
    function mintBatch(
        address to,
        uint256[] memory amounts,
        string[] memory tokenURIs,
        uint256[] memory maxSupplies
    ) external returns (uint256[] memory) {
        require(amounts.length == tokenURIs.length && amounts.length == maxSupplies.length, "Length mismatch");
        
        uint256[] memory tokenIds = new uint256[](amounts.length);
        
        for (uint256 i = 0; i < amounts.length; i++) {
            tokenIds[i] = mint(to, amounts[i], tokenURIs[i], maxSupplies[i]);
        }
        
        return tokenIds;
    }
    
    function mintAdditional(uint256 tokenId, address to, uint256 amount) external {
        require(tokenCreators[tokenId] == msg.sender || msg.sender == owner(), "Not creator or owner");
        
        uint256 maxSupply = tokenMaxSupply[tokenId];
        if (maxSupply > 0) {
            require(totalSupply(tokenId) + amount <= maxSupply, "Exceeds max supply");
        }
        
        _mint(to, tokenId, amount, "");
    }
    
    function setRoyalty(uint256 _royaltyPercentage, address _royaltyRecipient) external onlyOwner {
        require(_royaltyPercentage <= 2000, "Royalty too high");
        royaltyPercentage = _royaltyPercentage;
        royaltyRecipient = _royaltyRecipient;
    }
    
    function setContractURI(string memory _contractURI) external onlyOwner {
        contractURI = _contractURI;
    }
    
    function royaltyInfo(uint256 tokenId, uint256 salePrice) 
        external 
        view 
        returns (address receiver, uint256 royaltyAmount) 
    {
        require(exists(tokenId), "Token does not exist");
        receiver = royaltyRecipient;
        royaltyAmount = (salePrice * royaltyPercentage) / 10000;
    }
    
    // Override functions
    function _update(address from, address to, uint256[] memory ids, uint256[] memory values)
        internal
        override(ERC1155, ERC1155Supply)
    {
        super._update(from, to, ids, values);
    }

    function uri(uint256 tokenId)
        public
        view
        override(ERC1155, ERC1155URIStorage)
        returns (string memory)
    {
        return super.uri(tokenId);
    }
}

contract NFTFactory1155 is Ownable {
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
        uint256 royaltyPercentage,
        address royaltyRecipient
    ) external returns (address) {
        require(royaltyPercentage <= 2000, "Royalty too high");
        
        CustomNFT1155 newCollection = new CustomNFT1155(
            name,
            symbol,
            contractURI,
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
