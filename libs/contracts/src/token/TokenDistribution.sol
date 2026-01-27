// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

/**
 * @title TokenDistribution
 * @dev Manages initial token distribution according to tokenomics
 */
contract TokenDistribution is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    enum AllocationCategory {
        PublicSale,      // 20% - IEO
        PrivateSale,     // 15%
        TeamAdvisors,    // 20% - 4-year vesting
        Marketing,       // 15%
        Liquidity,       // 10%
        Reserve,         // 10%
        Ecosystem        // 10%
    }

    struct Allocation {
        AllocationCategory category;
        uint256 totalAmount;
        uint256 distributedAmount;
        address vestingContract;
        bool finalized;
    }

    IERC20 public immutable token;
    uint256 public constant TOTAL_SUPPLY = 1_000_000_000 * 10**18;

    mapping(AllocationCategory => Allocation) public allocations;
    mapping(address => bool) public authorizedDistributors;
    
    bool public distributionInitialized;
    uint256 public distributionStartTime;

    event AllocationSet(
        AllocationCategory indexed category,
        uint256 amount,
        address vestingContract
    );
    event TokensDistributed(
        AllocationCategory indexed category,
        address indexed recipient,
        uint256 amount
    );
    event AllocationFinalized(AllocationCategory indexed category);
    event DistributorAuthorized(address indexed distributor, bool status);

    modifier onlyAuthorized() {
        require(
            authorizedDistributors[msg.sender] || msg.sender == owner(),
            "Not authorized"
        );
        _;
    }

    constructor(address _token) {
        require(_token != address(0), "Invalid token address");
        token = IERC20(_token);
    }

    /**
     * @dev Initialize distribution allocations
     */
    function initializeDistribution() external onlyOwner {
        require(!distributionInitialized, "Already initialized");

        // 20% - Public Sale (IEO)
        allocations[AllocationCategory.PublicSale] = Allocation({
            category: AllocationCategory.PublicSale,
            totalAmount: (TOTAL_SUPPLY * 20) / 100,
            distributedAmount: 0,
            vestingContract: address(0),
            finalized: false
        });

        // 15% - Private Sale
        allocations[AllocationCategory.PrivateSale] = Allocation({
            category: AllocationCategory.PrivateSale,
            totalAmount: (TOTAL_SUPPLY * 15) / 100,
            distributedAmount: 0,
            vestingContract: address(0),
            finalized: false
        });

        // 20% - Team & Advisors (requires vesting contract)
        allocations[AllocationCategory.TeamAdvisors] = Allocation({
            category: AllocationCategory.TeamAdvisors,
            totalAmount: (TOTAL_SUPPLY * 20) / 100,
            distributedAmount: 0,
            vestingContract: address(0),
            finalized: false
        });

        // 15% - Marketing & Community
        allocations[AllocationCategory.Marketing] = Allocation({
            category: AllocationCategory.Marketing,
            totalAmount: (TOTAL_SUPPLY * 15) / 100,
            distributedAmount: 0,
            vestingContract: address(0),
            finalized: false
        });

        // 10% - Liquidity Provision
        allocations[AllocationCategory.Liquidity] = Allocation({
            category: AllocationCategory.Liquidity,
            totalAmount: (TOTAL_SUPPLY * 10) / 100,
            distributedAmount: 0,
            vestingContract: address(0),
            finalized: false
        });

        // 10% - Reserve Fund
        allocations[AllocationCategory.Reserve] = Allocation({
            category: AllocationCategory.Reserve,
            totalAmount: (TOTAL_SUPPLY * 10) / 100,
            distributedAmount: 0,
            vestingContract: address(0),
            finalized: false
        });

        // 10% - Ecosystem Development
        allocations[AllocationCategory.Ecosystem] = Allocation({
            category: AllocationCategory.Ecosystem,
            totalAmount: (TOTAL_SUPPLY * 10) / 100,
            distributedAmount: 0,
            vestingContract: address(0),
            finalized: false
        });

        distributionInitialized = true;
        distributionStartTime = block.timestamp;
    }

    /**
     * @dev Set vesting contract for a category
     */
    function setVestingContract(
        AllocationCategory category,
        address vestingContract
    ) external onlyOwner {
        require(distributionInitialized, "Not initialized");
        require(vestingContract != address(0), "Invalid address");
        
        allocations[category].vestingContract = vestingContract;
        
        emit AllocationSet(
            category,
            allocations[category].totalAmount,
            vestingContract
        );
    }

    /**
     * @dev Distribute tokens for a category
     */
    function distribute(
        AllocationCategory category,
        address recipient,
        uint256 amount
    ) external onlyAuthorized nonReentrant {
        require(distributionInitialized, "Not initialized");
        require(recipient != address(0), "Invalid recipient");
        
        Allocation storage allocation = allocations[category];
        require(!allocation.finalized, "Allocation finalized");
        require(
            allocation.distributedAmount + amount <= allocation.totalAmount,
            "Exceeds allocation"
        );

        allocation.distributedAmount += amount;
        token.safeTransfer(recipient, amount);

        emit TokensDistributed(category, recipient, amount);
    }

    /**
     * @dev Distribute tokens to vesting contract
     */
    function distributeToVesting(AllocationCategory category, uint256 amount)
        external
        onlyOwner
        nonReentrant
    {
        require(distributionInitialized, "Not initialized");
        
        Allocation storage allocation = allocations[category];
        require(allocation.vestingContract != address(0), "No vesting contract");
        require(!allocation.finalized, "Allocation finalized");
        require(
            allocation.distributedAmount + amount <= allocation.totalAmount,
            "Exceeds allocation"
        );

        allocation.distributedAmount += amount;
        token.safeTransfer(allocation.vestingContract, amount);

        emit TokensDistributed(category, allocation.vestingContract, amount);
    }

    /**
     * @dev Batch distribute tokens
     */
    function batchDistribute(
        AllocationCategory category,
        address[] calldata recipients,
        uint256[] calldata amounts
    ) external onlyAuthorized nonReentrant {
        require(recipients.length == amounts.length, "Length mismatch");
        require(distributionInitialized, "Not initialized");
        
        Allocation storage allocation = allocations[category];
        require(!allocation.finalized, "Allocation finalized");

        uint256 totalAmount = 0;
        for (uint256 i = 0; i < amounts.length; i++) {
            totalAmount += amounts[i];
        }

        require(
            allocation.distributedAmount + totalAmount <= allocation.totalAmount,
            "Exceeds allocation"
        );

        allocation.distributedAmount += totalAmount;

        for (uint256 i = 0; i < recipients.length; i++) {
            require(recipients[i] != address(0), "Invalid recipient");
            token.safeTransfer(recipients[i], amounts[i]);
            emit TokensDistributed(category, recipients[i], amounts[i]);
        }
    }

    /**
     * @dev Finalize an allocation (no more distributions)
     */
    function finalizeAllocation(AllocationCategory category) external onlyOwner {
        require(distributionInitialized, "Not initialized");
        allocations[category].finalized = true;
        emit AllocationFinalized(category);
    }

    /**
     * @dev Authorize/deauthorize distributor
     */
    function setDistributorAuthorization(address distributor, bool status)
        external
        onlyOwner
    {
        authorizedDistributors[distributor] = status;
        emit DistributorAuthorized(distributor, status);
    }

    /**
     * @dev Get allocation details
     */
    function getAllocation(AllocationCategory category)
        external
        view
        returns (
            uint256 totalAmount,
            uint256 distributedAmount,
            uint256 remainingAmount,
            address vestingContract,
            bool finalized
        )
    {
        Allocation storage allocation = allocations[category];
        return (
            allocation.totalAmount,
            allocation.distributedAmount,
            allocation.totalAmount - allocation.distributedAmount,
            allocation.vestingContract,
            allocation.finalized
        );
    }

    /**
     * @dev Emergency withdraw (only undistributed tokens)
     */
    function emergencyWithdraw(address recipient) external onlyOwner {
        uint256 balance = token.balanceOf(address(this));
        require(balance > 0, "No tokens to withdraw");
        token.safeTransfer(recipient, balance);
    }
}
