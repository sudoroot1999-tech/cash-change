// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

interface IPriceOracle {
    function getPrice(address token) external view returns (uint256);
    function getNFTPrice(address nftContract, uint256 tokenId) external view returns (uint256);
}

contract LendingContract is ReentrancyGuard, Pausable, Ownable {
    using SafeERC20 for IERC20;

    struct Loan {
        address borrower;
        address collateralToken;
        uint256 collateralAmount;
        address borrowToken;
        uint256 borrowAmount;
        uint256 interestRate;
        uint256 startTime;
        uint256 lastUpdateTime;
        uint256 accruedInterest;
        bool isNFTCollateral;
        uint256 nftTokenId;
        bool active;
    }

    struct Market {
        IERC20 token;
        uint256 totalBorrowed;
        uint256 totalReserves;
        uint256 baseInterestRate;
        uint256 utilizationMultiplier;
        uint256 collateralFactor; // in basis points (e.g., 7500 = 75%)
        uint256 liquidationThreshold; // in basis points
        uint256 liquidationPenalty; // in basis points
        bool enabled;
    }

    mapping(uint256 => Loan) public loans;
    mapping(address => Market) public markets;
    mapping(address => bool) public nftCollateralEnabled;
    
    uint256 public loanCount;
    IPriceOracle public priceOracle;
    
    uint256 public constant BASIS_POINTS = 10000;
    uint256 public constant SECONDS_PER_YEAR = 31536000;
    uint256 public constant MIN_HEALTH_FACTOR = 11000; // 1.1 in basis points

    event LoanCreated(
        uint256 indexed loanId,
        address indexed borrower,
        address collateralToken,
        uint256 collateralAmount,
        address borrowToken,
        uint256 borrowAmount
    );
    event LoanRepaid(uint256 indexed loanId, uint256 amount, uint256 interest);
    event LoanLiquidated(uint256 indexed loanId, address indexed liquidator, uint256 collateralSeized);
    event MarketAdded(address indexed token, uint256 collateralFactor);

    constructor(address _priceOracle) {
        priceOracle = IPriceOracle(_priceOracle);
    }

    function addMarket(
        address _token,
        uint256 _baseInterestRate,
        uint256 _utilizationMultiplier,
        uint256 _collateralFactor,
        uint256 _liquidationThreshold,
        uint256 _liquidationPenalty
    ) external onlyOwner {
        require(_collateralFactor <= BASIS_POINTS, "Invalid collateral factor");
        require(_liquidationThreshold <= BASIS_POINTS, "Invalid liquidation threshold");
        require(_liquidationPenalty <= 2000, "Penalty too high"); // Max 20%

        Market storage market = markets[_token];
        market.token = IERC20(_token);
        market.baseInterestRate = _baseInterestRate;
        market.utilizationMultiplier = _utilizationMultiplier;
        market.collateralFactor = _collateralFactor;
        market.liquidationThreshold = _liquidationThreshold;
        market.liquidationPenalty = _liquidationPenalty;
        market.enabled = true;

        emit MarketAdded(_token, _collateralFactor);
    }

    function enableNFTCollateral(address _nftContract) external onlyOwner {
        nftCollateralEnabled[_nftContract] = true;
    }

    function borrow(
        address _collateralToken,
        uint256 _collateralAmount,
        address _borrowToken,
        uint256 _borrowAmount
    ) external nonReentrant whenNotPaused returns (uint256) {
        require(markets[_collateralToken].enabled, "Collateral market not enabled");
        require(markets[_borrowToken].enabled, "Borrow market not enabled");
        require(_collateralAmount > 0 && _borrowAmount > 0, "Invalid amounts");

        Market storage borrowMarket = markets[_borrowToken];
        Market storage collateralMarket = markets[_collateralToken];

        // Transfer collateral from user
        collateralMarket.token.safeTransferFrom(msg.sender, address(this), _collateralAmount);

        // Check collateral value and LTV
        uint256 collateralValue = getCollateralValue(_collateralToken, _collateralAmount);
        uint256 borrowValue = getBorrowValue(_borrowToken, _borrowAmount);
        uint256 maxBorrowValue = (collateralValue * collateralMarket.collateralFactor) / BASIS_POINTS;
        
        require(borrowValue <= maxBorrowValue, "Insufficient collateral");

        // Calculate interest rate based on utilization
        uint256 interestRate = calculateInterestRate(_borrowToken);

        // Create loan
        uint256 loanId = loanCount++;
        Loan storage loan = loans[loanId];
        loan.borrower = msg.sender;
        loan.collateralToken = _collateralToken;
        loan.collateralAmount = _collateralAmount;
        loan.borrowToken = _borrowToken;
        loan.borrowAmount = _borrowAmount;
        loan.interestRate = interestRate;
        loan.startTime = block.timestamp;
        loan.lastUpdateTime = block.timestamp;
        loan.active = true;

        // Update market state
        borrowMarket.totalBorrowed += _borrowAmount;

        // Transfer borrowed tokens to user
        borrowMarket.token.safeTransfer(msg.sender, _borrowAmount);

        emit LoanCreated(loanId, msg.sender, _collateralToken, _collateralAmount, _borrowToken, _borrowAmount);
        return loanId;
    }

    function borrowWithNFTCollateral(
        address _nftContract,
        uint256 _nftTokenId,
        address _borrowToken,
        uint256 _borrowAmount
    ) external nonReentrant whenNotPaused returns (uint256) {
        require(nftCollateralEnabled[_nftContract], "NFT collateral not enabled");
        require(markets[_borrowToken].enabled, "Borrow market not enabled");

        // Transfer NFT from user
        IERC721(_nftContract).transferFrom(msg.sender, address(this), _nftTokenId);

        uint256 nftValue = priceOracle.getNFTPrice(_nftContract, _nftTokenId);
        uint256 borrowValue = getBorrowValue(_borrowToken, _borrowAmount);
        uint256 maxBorrowValue = (nftValue * 5000) / BASIS_POINTS; // 50% LTV for NFTs
        
        require(borrowValue <= maxBorrowValue, "Insufficient NFT collateral value");

        uint256 interestRate = calculateInterestRate(_borrowToken);

        uint256 loanId = loanCount++;
        Loan storage loan = loans[loanId];
        loan.borrower = msg.sender;
        loan.collateralToken = _nftContract;
        loan.borrowToken = _borrowToken;
        loan.borrowAmount = _borrowAmount;
        loan.interestRate = interestRate;
        loan.startTime = block.timestamp;
        loan.lastUpdateTime = block.timestamp;
        loan.isNFTCollateral = true;
        loan.nftTokenId = _nftTokenId;
        loan.active = true;

        Market storage borrowMarket = markets[_borrowToken];
        borrowMarket.totalBorrowed += _borrowAmount;
        borrowMarket.token.safeTransfer(msg.sender, _borrowAmount);

        emit LoanCreated(loanId, msg.sender, _nftContract, 1, _borrowToken, _borrowAmount);
        return loanId;
    }

    function repay(uint256 _loanId, uint256 _amount) external nonReentrant {
        Loan storage loan = loans[_loanId];
        require(loan.active, "Loan not active");
        require(msg.sender == loan.borrower, "Not loan owner");

        updateLoanInterest(_loanId);

        uint256 totalOwed = loan.borrowAmount + loan.accruedInterest;
        require(_amount <= totalOwed, "Amount exceeds debt");

        Market storage market = markets[loan.borrowToken];
        market.token.safeTransferFrom(msg.sender, address(this), _amount);

        if (_amount >= totalOwed) {
            // Full repayment
            loan.active = false;
            market.totalBorrowed -= loan.borrowAmount;

            // Return collateral
            if (loan.isNFTCollateral) {
                IERC721(loan.collateralToken).transferFrom(address(this), loan.borrower, loan.nftTokenId);
            } else {
                IERC20(loan.collateralToken).safeTransfer(loan.borrower, loan.collateralAmount);
            }

            emit LoanRepaid(_loanId, loan.borrowAmount, loan.accruedInterest);
        } else {
            // Partial repayment
            if (_amount > loan.accruedInterest) {
                uint256 principalPaid = _amount - loan.accruedInterest;
                loan.borrowAmount -= principalPaid;
                loan.accruedInterest = 0;
                market.totalBorrowed -= principalPaid;
            } else {
                loan.accruedInterest -= _amount;
            }

            emit LoanRepaid(_loanId, _amount, 0);
        }
    }

    function liquidate(uint256 _loanId) external nonReentrant {
        Loan storage loan = loans[_loanId];
        require(loan.active, "Loan not active");

        updateLoanInterest(_loanId);

        uint256 healthFactor = calculateHealthFactor(_loanId);
        require(healthFactor < MIN_HEALTH_FACTOR, "Loan is healthy");

        Market storage collateralMarket = markets[loan.collateralToken];
        Market storage borrowMarket = markets[loan.borrowToken];

        uint256 totalOwed = loan.borrowAmount + loan.accruedInterest;
        uint256 liquidationBonus = (totalOwed * collateralMarket.liquidationPenalty) / BASIS_POINTS;
        uint256 totalToRepay = totalOwed + liquidationBonus;

        // Liquidator repays the debt
        borrowMarket.token.safeTransferFrom(msg.sender, address(this), totalOwed);

        // Transfer collateral to liquidator
        if (loan.isNFTCollateral) {
            IERC721(loan.collateralToken).transferFrom(address(this), msg.sender, loan.nftTokenId);
        } else {
            uint256 collateralValue = getCollateralValue(loan.collateralToken, loan.collateralAmount);
            uint256 collateralToSeize = loan.collateralAmount;
            
            if (collateralValue > totalToRepay) {
                // Return excess collateral to borrower
                uint256 excessValue = collateralValue - totalToRepay;
                uint256 excessCollateral = (loan.collateralAmount * excessValue) / collateralValue;
                collateralToSeize = loan.collateralAmount - excessCollateral;
                
                IERC20(loan.collateralToken).safeTransfer(loan.borrower, excessCollateral);
            }

            IERC20(loan.collateralToken).safeTransfer(msg.sender, collateralToSeize);
            emit LoanLiquidated(_loanId, msg.sender, collateralToSeize);
        }

        loan.active = false;
        borrowMarket.totalBorrowed -= loan.borrowAmount;
    }

    function calculateHealthFactor(uint256 _loanId) public view returns (uint256) {
        Loan storage loan = loans[_loanId];
        if (!loan.active) return 0;

        uint256 collateralValue;
        if (loan.isNFTCollateral) {
            collateralValue = priceOracle.getNFTPrice(loan.collateralToken, loan.nftTokenId);
        } else {
            collateralValue = getCollateralValue(loan.collateralToken, loan.collateralAmount);
        }

        Market storage market = markets[loan.collateralToken];
        uint256 liquidationValue = (collateralValue * market.liquidationThreshold) / BASIS_POINTS;

        uint256 totalOwed = loan.borrowAmount + loan.accruedInterest;
        uint256 borrowValue = getBorrowValue(loan.borrowToken, totalOwed);

        if (borrowValue == 0) return type(uint256).max;

        return (liquidationValue * BASIS_POINTS) / borrowValue;
    }

    function updateLoanInterest(uint256 _loanId) internal {
        Loan storage loan = loans[_loanId];
        if (!loan.active) return;

        uint256 timeElapsed = block.timestamp - loan.lastUpdateTime;
        if (timeElapsed == 0) return;

        uint256 interest = (loan.borrowAmount * loan.interestRate * timeElapsed) / (BASIS_POINTS * SECONDS_PER_YEAR);
        loan.accruedInterest += interest;
        loan.lastUpdateTime = block.timestamp;
    }

    function calculateInterestRate(address _token) public view returns (uint256) {
        Market storage market = markets[_token];
        
        uint256 utilization = market.totalReserves == 0 
            ? 0 
            : (market.totalBorrowed * BASIS_POINTS) / market.totalReserves;

        return market.baseInterestRate + (utilization * market.utilizationMultiplier) / BASIS_POINTS;
    }

    function getCollateralValue(address _token, uint256 _amount) internal view returns (uint256) {
        uint256 price = priceOracle.getPrice(_token);
        return (price * _amount) / 1e18;
    }

    function getBorrowValue(address _token, uint256 _amount) internal view returns (uint256) {
        uint256 price = priceOracle.getPrice(_token);
        return (price * _amount) / 1e18;
    }

    function getLoanInfo(uint256 _loanId) external view returns (
        address borrower,
        address collateralToken,
        uint256 collateralAmount,
        address borrowToken,
        uint256 borrowAmount,
        uint256 accruedInterest,
        uint256 healthFactor,
        bool active
    ) {
        Loan storage loan = loans[_loanId];
        return (
            loan.borrower,
            loan.collateralToken,
            loan.collateralAmount,
            loan.borrowToken,
            loan.borrowAmount,
            loan.accruedInterest,
            calculateHealthFactor(_loanId),
            loan.active
        );
    }

    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }
}
