// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/security/Pausable.sol";

/**
 * @title TokenSale
 * @dev Token sale contract for IEO Launchpad
 */
contract TokenSale is Ownable, ReentrancyGuard, Pausable {
    IERC20 public token;
    IERC20 public paymentToken; // USDT, USDC, etc.
    
    uint256 public tokenPrice; // Price in payment token (with decimals)
    uint256 public hardCap;
    uint256 public softCap;
    uint256 public minAllocation;
    uint256 public maxAllocation;
    
    uint256 public saleStartTime;
    uint256 public saleEndTime;
    
    uint256 public totalRaised;
    uint256 public totalTokensSold;
    
    bool public finalized;
    bool public refundEnabled;
    
    mapping(address => uint256) public contributions;
    mapping(address => uint256) public tokenAllocations;
    mapping(address => bool) public whitelist;
    mapping(address => bool) public claimed;
    
    address[] public participants;
    
    event TokensPurchased(address indexed buyer, uint256 amount, uint256 tokens);
    event TokensClaimed(address indexed buyer, uint256 amount);
    event Refunded(address indexed buyer, uint256 amount);
    event SaleFinalized(uint256 totalRaised, uint256 totalTokensSold);
    event WhitelistUpdated(address indexed user, bool status);
    
    modifier onlyWhitelisted() {
        require(whitelist[msg.sender], "Not whitelisted");
        _;
    }
    
    modifier saleActive() {
        require(
            block.timestamp >= saleStartTime && block.timestamp <= saleEndTime,
            "Sale not active"
        );
        require(!finalized, "Sale finalized");
        _;
    }
    
    constructor(
        address _token,
        address _paymentToken,
        uint256 _tokenPrice,
        uint256 _hardCap,
        uint256 _softCap,
        uint256 _minAllocation,
        uint256 _maxAllocation,
        uint256 _saleStartTime,
        uint256 _saleEndTime
    ) {
        require(_token != address(0), "Invalid token address");
        require(_hardCap > _softCap, "Hard cap must be greater than soft cap");
        require(_maxAllocation >= _minAllocation, "Invalid allocation limits");
        require(_saleEndTime > _saleStartTime, "Invalid sale period");
        
        token = IERC20(_token);
        paymentToken = IERC20(_paymentToken);
        tokenPrice = _tokenPrice;
        hardCap = _hardCap;
        softCap = _softCap;
        minAllocation = _minAllocation;
        maxAllocation = _maxAllocation;
        saleStartTime = _saleStartTime;
        saleEndTime = _saleEndTime;
    }
    
    /**
     * @dev Purchase tokens
     */
    function purchase(uint256 amount) 
        external 
        nonReentrant 
        whenNotPaused 
        onlyWhitelisted 
        saleActive 
    {
        require(amount >= minAllocation, "Below minimum allocation");
        require(
            contributions[msg.sender] + amount <= maxAllocation,
            "Exceeds maximum allocation"
        );
        require(totalRaised + amount <= hardCap, "Hard cap reached");
        
        // Transfer payment token
        require(
            paymentToken.transferFrom(msg.sender, address(this), amount),
            "Payment transfer failed"
        );
        
        // Calculate token amount
        uint256 tokenAmount = (amount * 10**18) / tokenPrice;
        
        // Update state
        if (contributions[msg.sender] == 0) {
            participants.push(msg.sender);
        }
        
        contributions[msg.sender] += amount;
        tokenAllocations[msg.sender] += tokenAmount;
        totalRaised += amount;
        totalTokensSold += tokenAmount;
        
        emit TokensPurchased(msg.sender, amount, tokenAmount);
    }
    
    /**
     * @dev Claim tokens after sale
     */
    function claim() external nonReentrant {
        require(finalized, "Sale not finalized");
        require(!refundEnabled, "Refunds enabled");
        require(!claimed[msg.sender], "Already claimed");
        require(tokenAllocations[msg.sender] > 0, "No allocation");
        
        uint256 amount = tokenAllocations[msg.sender];
        claimed[msg.sender] = true;
        
        require(token.transfer(msg.sender, amount), "Token transfer failed");
        
        emit TokensClaimed(msg.sender, amount);
    }
    
    /**
     * @dev Request refund if soft cap not met
     */
    function refund() external nonReentrant {
        require(refundEnabled, "Refunds not enabled");
        require(contributions[msg.sender] > 0, "No contribution");
        
        uint256 amount = contributions[msg.sender];
        contributions[msg.sender] = 0;
        tokenAllocations[msg.sender] = 0;
        
        require(
            paymentToken.transfer(msg.sender, amount),
            "Refund transfer failed"
        );
        
        emit Refunded(msg.sender, amount);
    }
    
    /**
     * @dev Finalize sale
     */
    function finalizeSale() external onlyOwner {
        require(block.timestamp > saleEndTime, "Sale not ended");
        require(!finalized, "Already finalized");
        
        finalized = true;
        
        if (totalRaised < softCap) {
            refundEnabled = true;
        } else {
            // Transfer raised funds to owner
            require(
                paymentToken.transfer(owner(), totalRaised),
                "Fund transfer failed"
            );
        }
        
        emit SaleFinalized(totalRaised, totalTokensSold);
    }
    
    /**
     * @dev Update whitelist
     */
    function updateWhitelist(address[] calldata users, bool status) 
        external 
        onlyOwner 
    {
        for (uint256 i = 0; i < users.length; i++) {
            whitelist[users[i]] = status;
            emit WhitelistUpdated(users[i], status);
        }
    }
    
    /**
     * @dev Withdraw unsold tokens
     */
    function withdrawUnsoldTokens() external onlyOwner {
        require(finalized, "Sale not finalized");
        
        uint256 balance = token.balanceOf(address(this));
        uint256 unsold = balance - (totalTokensSold - getClaimedAmount());
        
        if (unsold > 0) {
            require(token.transfer(owner(), unsold), "Transfer failed");
        }
    }
    
    /**
     * @dev Emergency withdraw
     */
    function emergencyWithdraw(address _token) external onlyOwner {
        require(finalized || block.timestamp > saleEndTime + 30 days, "Too early");
        
        IERC20 tokenToWithdraw = IERC20(_token);
        uint256 balance = tokenToWithdraw.balanceOf(address(this));
        
        require(tokenToWithdraw.transfer(owner(), balance), "Transfer failed");
    }
    
    /**
     * @dev Pause sale
     */
    function pause() external onlyOwner {
        _pause();
    }
    
    /**
     * @dev Unpause sale
     */
    function unpause() external onlyOwner {
        _unpause();
    }
    
    /**
     * @dev Get total claimed amount
     */
    function getClaimedAmount() public view returns (uint256) {
        uint256 claimedAmount = 0;
        for (uint256 i = 0; i < participants.length; i++) {
            if (claimed[participants[i]]) {
                claimedAmount += tokenAllocations[participants[i]];
            }
        }
        return claimedAmount;
    }
    
    /**
     * @dev Get participant count
     */
    function getParticipantCount() external view returns (uint256) {
        return participants.length;
    }
    
    /**
     * @dev Check if user is whitelisted
     */
    function isWhitelisted(address user) external view returns (bool) {
        return whitelist[user];
    }
    
    /**
     * @dev Get user allocation
     */
    function getUserAllocation(address user) external view returns (uint256, uint256) {
        return (contributions[user], tokenAllocations[user]);
    }
}
