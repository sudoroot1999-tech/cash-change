// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

/**
 * @title VestingContract
 * @dev Token vesting contract with customizable schedules
 */
contract VestingContract is Ownable, ReentrancyGuard {
    IERC20 public token;
    
    struct VestingSchedule {
        uint256 totalAmount;
        uint256 claimedAmount;
        uint256 startTime;
        uint256 cliffDuration;
        uint256 duration;
        uint256 tgePercentage; // TGE percentage (basis points, 10000 = 100%)
        bool revocable;
        bool revoked;
    }
    
    mapping(address => VestingSchedule) public vestingSchedules;
    mapping(address => bool) public tgeClaimed;
    
    uint256 public totalVested;
    uint256 public totalClaimed;
    
    event VestingScheduleCreated(
        address indexed beneficiary,
        uint256 amount,
        uint256 startTime,
        uint256 duration
    );
    event TokensClaimed(address indexed beneficiary, uint256 amount);
    event VestingRevoked(address indexed beneficiary);
    
    constructor(address _token) {
        require(_token != address(0), "Invalid token address");
        token = IERC20(_token);
    }
    
    /**
     * @dev Create vesting schedule for beneficiary
     */
    function createVestingSchedule(
        address beneficiary,
        uint256 amount,
        uint256 startTime,
        uint256 cliffDuration,
        uint256 duration,
        uint256 tgePercentage,
        bool revocable
    ) external onlyOwner {
        require(beneficiary != address(0), "Invalid beneficiary");
        require(amount > 0, "Amount must be greater than 0");
        require(duration > 0, "Duration must be greater than 0");
        require(tgePercentage <= 10000, "Invalid TGE percentage");
        require(
            vestingSchedules[beneficiary].totalAmount == 0,
            "Schedule already exists"
        );
        
        vestingSchedules[beneficiary] = VestingSchedule({
            totalAmount: amount,
            claimedAmount: 0,
            startTime: startTime,
            cliffDuration: cliffDuration,
            duration: duration,
            tgePercentage: tgePercentage,
            revocable: revocable,
            revoked: false
        });
        
        totalVested += amount;
        
        emit VestingScheduleCreated(beneficiary, amount, startTime, duration);
    }
    
    /**
     * @dev Claim TGE tokens
     */
    function claimTGE() external nonReentrant {
        require(!tgeClaimed[msg.sender], "TGE already claimed");
        
        VestingSchedule storage schedule = vestingSchedules[msg.sender];
        require(schedule.totalAmount > 0, "No vesting schedule");
        require(!schedule.revoked, "Vesting revoked");
        require(block.timestamp >= schedule.startTime, "Vesting not started");
        
        uint256 tgeAmount = (schedule.totalAmount * schedule.tgePercentage) / 10000;
        require(tgeAmount > 0, "No TGE amount");
        
        tgeClaimed[msg.sender] = true;
        schedule.claimedAmount += tgeAmount;
        totalClaimed += tgeAmount;
        
        require(token.transfer(msg.sender, tgeAmount), "Transfer failed");
        
        emit TokensClaimed(msg.sender, tgeAmount);
    }
    
    /**
     * @dev Claim vested tokens
     */
    function claim() external nonReentrant {
        VestingSchedule storage schedule = vestingSchedules[msg.sender];
        require(schedule.totalAmount > 0, "No vesting schedule");
        require(!schedule.revoked, "Vesting revoked");
        
        uint256 claimable = getClaimableAmount(msg.sender);
        require(claimable > 0, "No tokens to claim");
        
        schedule.claimedAmount += claimable;
        totalClaimed += claimable;
        
        require(token.transfer(msg.sender, claimable), "Transfer failed");
        
        emit TokensClaimed(msg.sender, claimable);
    }
    
    /**
     * @dev Calculate claimable amount for beneficiary
     */
    function getClaimableAmount(address beneficiary) public view returns (uint256) {
        VestingSchedule memory schedule = vestingSchedules[beneficiary];
        
        if (schedule.totalAmount == 0 || schedule.revoked) {
            return 0;
        }
        
        if (block.timestamp < schedule.startTime) {
            return 0;
        }
        
        // Calculate TGE amount if not claimed
        uint256 tgeAmount = 0;
        if (!tgeClaimed[beneficiary] && schedule.tgePercentage > 0) {
            tgeAmount = (schedule.totalAmount * schedule.tgePercentage) / 10000;
        }
        
        // Check cliff
        if (block.timestamp < schedule.startTime + schedule.cliffDuration) {
            return tgeAmount;
        }
        
        // Calculate vested amount
        uint256 vestingAmount = schedule.totalAmount - 
            ((schedule.totalAmount * schedule.tgePercentage) / 10000);
        
        uint256 elapsedTime = block.timestamp - schedule.startTime;
        
        if (elapsedTime >= schedule.duration) {
            // Fully vested
            return schedule.totalAmount - schedule.claimedAmount;
        }
        
        // Proportional vesting
        uint256 vestedAmount = (vestingAmount * elapsedTime) / schedule.duration;
        uint256 totalVestedWithTGE = vestedAmount + 
            ((schedule.totalAmount * schedule.tgePercentage) / 10000);
        
        return totalVestedWithTGE - schedule.claimedAmount;
    }
    
    /**
     * @dev Get vesting info for beneficiary
     */
    function getVestingInfo(address beneficiary) 
        external 
        view 
        returns (
            uint256 totalAmount,
            uint256 claimedAmount,
            uint256 claimableAmount,
            uint256 startTime,
            uint256 endTime,
            bool isRevoked
        ) 
    {
        VestingSchedule memory schedule = vestingSchedules[beneficiary];
        
        return (
            schedule.totalAmount,
            schedule.claimedAmount,
            getClaimableAmount(beneficiary),
            schedule.startTime,
            schedule.startTime + schedule.duration,
            schedule.revoked
        );
    }
    
    /**
     * @dev Revoke vesting schedule
     */
    function revokeVesting(address beneficiary) external onlyOwner {
        VestingSchedule storage schedule = vestingSchedules[beneficiary];
        require(schedule.totalAmount > 0, "No vesting schedule");
        require(schedule.revocable, "Not revocable");
        require(!schedule.revoked, "Already revoked");
        
        uint256 claimable = getClaimableAmount(beneficiary);
        
        schedule.revoked = true;
        
        // Transfer claimable amount to beneficiary
        if (claimable > 0) {
            schedule.claimedAmount += claimable;
            totalClaimed += claimable;
            require(token.transfer(beneficiary, claimable), "Transfer failed");
        }
        
        // Return unvested tokens to owner
        uint256 unvested = schedule.totalAmount - schedule.claimedAmount;
        if (unvested > 0) {
            totalVested -= unvested;
            require(token.transfer(owner(), unvested), "Transfer failed");
        }
        
        emit VestingRevoked(beneficiary);
    }
    
    /**
     * @dev Batch create vesting schedules
     */
    function batchCreateVestingSchedules(
        address[] calldata beneficiaries,
        uint256[] calldata amounts,
        uint256 startTime,
        uint256 cliffDuration,
        uint256 duration,
        uint256 tgePercentage,
        bool revocable
    ) external onlyOwner {
        require(
            beneficiaries.length == amounts.length,
            "Array length mismatch"
        );
        
        for (uint256 i = 0; i < beneficiaries.length; i++) {
            if (vestingSchedules[beneficiaries[i]].totalAmount == 0) {
                vestingSchedules[beneficiaries[i]] = VestingSchedule({
                    totalAmount: amounts[i],
                    claimedAmount: 0,
                    startTime: startTime,
                    cliffDuration: cliffDuration,
                    duration: duration,
                    tgePercentage: tgePercentage,
                    revocable: revocable,
                    revoked: false
                });
                
                totalVested += amounts[i];
                
                emit VestingScheduleCreated(
                    beneficiaries[i],
                    amounts[i],
                    startTime,
                    duration
                );
            }
        }
    }
    
    /**
     * @dev Withdraw tokens (only unvested)
     */
    function withdrawTokens(uint256 amount) external onlyOwner {
        uint256 balance = token.balanceOf(address(this));
        uint256 locked = totalVested - totalClaimed;
        uint256 available = balance - locked;
        
        require(amount <= available, "Insufficient available balance");
        require(token.transfer(owner(), amount), "Transfer failed");
    }
    
    /**
     * @dev Get contract statistics
     */
    function getStats() 
        external 
        view 
        returns (uint256 _totalVested, uint256 _totalClaimed, uint256 _totalLocked) 
    {
        return (totalVested, totalClaimed, totalVested - totalClaimed);
    }
}
