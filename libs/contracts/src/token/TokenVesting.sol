// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

/**
 * @title TokenVesting
 * @dev Vesting contract for team, advisors, and private sale allocations
 */
contract TokenVesting is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    struct VestingSchedule {
        address beneficiary;
        uint256 totalAmount;
        uint256 startTime;
        uint256 cliffDuration;
        uint256 vestingDuration;
        uint256 releasedAmount;
        bool revocable;
        bool revoked;
    }

    IERC20 public immutable token;
    mapping(bytes32 => VestingSchedule) public vestingSchedules;
    mapping(address => uint256) public vestingCount;
    mapping(address => bytes32[]) public beneficiarySchedules;

    uint256 public totalVestingAmount;
    uint256 public totalReleasedAmount;

    event VestingScheduleCreated(
        bytes32 indexed scheduleId,
        address indexed beneficiary,
        uint256 amount,
        uint256 startTime
    );
    event TokensReleased(
        bytes32 indexed scheduleId,
        address indexed beneficiary,
        uint256 amount
    );
    event VestingRevoked(bytes32 indexed scheduleId, uint256 unreleasedAmount);

    constructor(address _token) {
        require(_token != address(0), "Invalid token address");
        token = IERC20(_token);
    }

    /**
     * @dev Create a new vesting schedule
     */
    function createVestingSchedule(
        address beneficiary,
        uint256 totalAmount,
        uint256 startTime,
        uint256 cliffDuration,
        uint256 vestingDuration,
        bool revocable
    ) external onlyOwner returns (bytes32) {
        require(beneficiary != address(0), "Invalid beneficiary");
        require(totalAmount > 0, "Amount must be > 0");
        require(vestingDuration > 0, "Duration must be > 0");
        require(startTime >= block.timestamp, "Start time must be in future");

        bytes32 scheduleId = keccak256(
            abi.encodePacked(
                beneficiary,
                totalAmount,
                startTime,
                block.timestamp,
                vestingCount[beneficiary]
            )
        );

        vestingSchedules[scheduleId] = VestingSchedule({
            beneficiary: beneficiary,
            totalAmount: totalAmount,
            startTime: startTime,
            cliffDuration: cliffDuration,
            vestingDuration: vestingDuration,
            releasedAmount: 0,
            revocable: revocable,
            revoked: false
        });

        beneficiarySchedules[beneficiary].push(scheduleId);
        vestingCount[beneficiary]++;
        totalVestingAmount += totalAmount;

        emit VestingScheduleCreated(scheduleId, beneficiary, totalAmount, startTime);
        return scheduleId;
    }

    /**
     * @dev Release vested tokens
     */
    function release(bytes32 scheduleId) external nonReentrant {
        VestingSchedule storage schedule = vestingSchedules[scheduleId];
        require(schedule.beneficiary == msg.sender, "Not beneficiary");
        require(!schedule.revoked, "Vesting revoked");

        uint256 releasableAmount = _computeReleasableAmount(schedule);
        require(releasableAmount > 0, "No tokens to release");

        schedule.releasedAmount += releasableAmount;
        totalReleasedAmount += releasableAmount;

        token.safeTransfer(schedule.beneficiary, releasableAmount);

        emit TokensReleased(scheduleId, schedule.beneficiary, releasableAmount);
    }

    /**
     * @dev Revoke vesting schedule (if revocable)
     */
    function revoke(bytes32 scheduleId) external onlyOwner {
        VestingSchedule storage schedule = vestingSchedules[scheduleId];
        require(schedule.revocable, "Vesting not revocable");
        require(!schedule.revoked, "Already revoked");

        uint256 releasableAmount = _computeReleasableAmount(schedule);
        if (releasableAmount > 0) {
            schedule.releasedAmount += releasableAmount;
            totalReleasedAmount += releasableAmount;
            token.safeTransfer(schedule.beneficiary, releasableAmount);
        }

        uint256 unreleased = schedule.totalAmount - schedule.releasedAmount;
        schedule.revoked = true;
        totalVestingAmount -= unreleased;

        emit VestingRevoked(scheduleId, unreleased);
    }

    /**
     * @dev Get vested amount for a schedule
     */
    function getVestedAmount(bytes32 scheduleId) public view returns (uint256) {
        VestingSchedule storage schedule = vestingSchedules[scheduleId];
        return _computeVestedAmount(schedule);
    }

    /**
     * @dev Get releasable amount for a schedule
     */
    function getReleasableAmount(bytes32 scheduleId) public view returns (uint256) {
        VestingSchedule storage schedule = vestingSchedules[scheduleId];
        return _computeReleasableAmount(schedule);
    }

    /**
     * @dev Get all schedule IDs for a beneficiary
     */
    function getBeneficiarySchedules(address beneficiary) 
        external 
        view 
        returns (bytes32[] memory) 
    {
        return beneficiarySchedules[beneficiary];
    }

    /**
     * @dev Compute vested amount
     */
    function _computeVestedAmount(VestingSchedule storage schedule) 
        private 
        view 
        returns (uint256) 
    {
        if (block.timestamp < schedule.startTime + schedule.cliffDuration) {
            return 0;
        } else if (
            block.timestamp >= schedule.startTime + schedule.vestingDuration ||
            schedule.revoked
        ) {
            return schedule.totalAmount;
        } else {
            uint256 timeFromStart = block.timestamp - schedule.startTime;
            uint256 vestedAmount = (schedule.totalAmount * timeFromStart) / 
                schedule.vestingDuration;
            return vestedAmount;
        }
    }

    /**
     * @dev Compute releasable amount
     */
    function _computeReleasableAmount(VestingSchedule storage schedule) 
        private 
        view 
        returns (uint256) 
    {
        return _computeVestedAmount(schedule) - schedule.releasedAmount;
    }

    /**
     * @dev Withdraw tokens (emergency)
     */
    function withdrawToken(address _token, uint256 amount) external onlyOwner {
        IERC20(_token).safeTransfer(owner(), amount);
    }
}
