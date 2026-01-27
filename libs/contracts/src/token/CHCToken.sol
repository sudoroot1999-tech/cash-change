// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Snapshot.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/security/Pausable.sol";

/**
 * @title CHCToken
 * @dev Platform utility token with comprehensive tokenomics
 * Features: Burn mechanism, Snapshots, Pausable, Blacklist
 */
contract CHCToken is ERC20, ERC20Burnable, ERC20Snapshot, AccessControl, Pausable {
    bytes32 public constant SNAPSHOT_ROLE = keccak256("SNAPSHOT_ROLE");
    bytes32 public constant PAUSER_ROLE = keccak256("PAUSER_ROLE");
    bytes32 public constant BLACKLIST_ROLE = keccak256("BLACKLIST_ROLE");
    bytes32 public constant BURNER_ROLE = keccak256("BURNER_ROLE");

    // Total supply: 1 billion tokens
    uint256 public constant TOTAL_SUPPLY = 1_000_000_000 * 10**18;

    // Blacklist mapping for compliance
    mapping(address => bool) private _blacklisted;

    // Burn tracking
    uint256 public totalBurned;

    event AddressBlacklisted(address indexed account, bool status);
    event TokensBurned(address indexed burner, uint256 amount);
    event BuybackAndBurn(uint256 amount, uint256 ethSpent);

    constructor(address admin) ERC20("ExchangeX Token", "EXT") {
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(SNAPSHOT_ROLE, admin);
        _grantRole(PAUSER_ROLE, admin);
        _grantRole(BLACKLIST_ROLE, admin);
        _grantRole(BURNER_ROLE, admin);

        // Mint total supply to admin for distribution
        _mint(admin, TOTAL_SUPPLY);
    }

    /**
     * @dev Creates a snapshot of token balances
     */
    function snapshot() public onlyRole(SNAPSHOT_ROLE) returns (uint256) {
        return _snapshot();
    }

    /**
     * @dev Pause token transfers
     */
    function pause() public onlyRole(PAUSER_ROLE) {
        _pause();
    }

    /**
     * @dev Unpause token transfers
     */
    function unpause() public onlyRole(PAUSER_ROLE) {
        _unpause();
    }

    /**
     * @dev Blacklist/whitelist an address
     */
    function setBlacklisted(address account, bool status) 
        public 
        onlyRole(BLACKLIST_ROLE) 
    {
        _blacklisted[account] = status;
        emit AddressBlacklisted(account, status);
    }

    /**
     * @dev Check if address is blacklisted
     */
    function isBlacklisted(address account) public view returns (bool) {
        return _blacklisted[account];
    }

    /**
     * @dev Burn tokens and track total burned
     */
    function burn(uint256 amount) public override {
        super.burn(amount);
        totalBurned += amount;
        emit TokensBurned(msg.sender, amount);
    }

    /**
     * @dev Burn tokens from address (with allowance)
     */
    function burnFrom(address account, uint256 amount) public override {
        super.burnFrom(account, amount);
        totalBurned += amount;
        emit TokensBurned(account, amount);
    }

    /**
     * @dev Buyback and burn mechanism (for fee buybacks)
     */
    function buybackAndBurn(uint256 amount) external onlyRole(BURNER_ROLE) {
        require(balanceOf(msg.sender) >= amount, "Insufficient balance");
        _burn(msg.sender, amount);
        totalBurned += amount;
        emit BuybackAndBurn(amount, 0);
    }

    /**
     * @dev Get circulating supply (total - burned)
     */
    function circulatingSupply() public view returns (uint256) {
        return TOTAL_SUPPLY - totalBurned;
    }

    /**
     * @dev Hook that is called before any transfer of tokens
     */
    function _beforeTokenTransfer(
        address from,
        address to,
        uint256 amount
    ) internal override(ERC20, ERC20Snapshot) whenNotPaused {
        require(!_blacklisted[from], "Sender is blacklisted");
        require(!_blacklisted[to], "Recipient is blacklisted");
        super._beforeTokenTransfer(from, to, amount);
    }
}
