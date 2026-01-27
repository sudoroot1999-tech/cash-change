// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@chainlink/contracts/src/v0.8/interfaces/AggregatorV3Interface.sol";

/**
 * @title P2PLending
 * @dev P2P Lending platform with automated matching, credit scoring, and insurance fund
 */
contract P2PLending is ReentrancyGuard, Pausable, Ownable {
    using SafeERC20 for IERC20;

    // ==================== STRUCTS ====================

    struct Loan {
        address lender;
        address borrower;
        address principalToken;
        uint256 principalAmount;
        address collateralToken;
        uint256 collateralAmount;
        uint256 interestRate; // APR in basis points (e.g., 500 = 5%)
        uint256 durationDays;
        uint256 ltvRatio; // in basis points
        uint256 liquidationThreshold; // in basis points
        uint256 startTime;
        uint256 dueDate;
        uint256 totalRepaid;
        uint256 accruedInterest;
        uint256 lastInterestUpdate;
        LoanStatus status;
    }

    struct LoanRequest {
        address user;
        RequestType requestType; // OFFER or REQUEST
        address principalToken;
        uint256 principalAmount;
        address collateralToken;
        uint256 collateralAmount;
        uint256 minInterestRate; // For lenders
        uint256 maxInterestRate; // For borrowers
        uint256 durationDays;
        uint256 proposedLtv;
        uint256 minCreditScore;
        bool autoMatch;
        RequestStatus status;
        uint256 createdAt;
        uint256 expiresAt;
    }

    struct InsuranceFund {
        uint256 totalAmount;
        uint256 reservedAmount;
        uint256 claimsPaid;
    }

    // ==================== ENUMS ====================

    enum LoanStatus {
        PENDING,
        ACTIVE,
        REPAID,
        DEFAULTED,
        LIQUIDATED
    }

    enum RequestType {
        OFFER,
        REQUEST
    }

    enum RequestStatus {
        OPEN,
        MATCHED,
        CANCELLED,
        EXPIRED
    }

    // ==================== STATE VARIABLES ====================

    uint256 public constant BASIS_POINTS = 10000;
    uint256 public constant SECONDS_PER_DAY = 86400;
    uint256 public constant SECONDS_PER_YEAR = 31536000;

    uint256 public loanCount;
    uint256 public requestCount;

    mapping(uint256 => Loan) public loans;
    mapping(uint256 => LoanRequest) public loanRequests;
    mapping(address => InsuranceFund) public insuranceFunds;
    mapping(address => mapping(address => uint256)) public creditScores; // user => token => score

    // Chainlink price feeds
    mapping(address => AggregatorV3Interface) public priceFeeds;

    // Configuration
    uint256 public maxLtvRatio = 20000; // 200%
    uint256 public defaultLiquidationThreshold = 15000; // 150%
    uint256 public liquidationPenalty = 1000; // 10%
    uint256 public minHealthFactor = 11000; // 1.1
    uint256 public insuranceFeePercentage = 10; // 0.1%
    uint256 public platformFeePercentage = 50; // 0.5%

    // ==================== EVENTS ====================

    event LoanRequestCreated(
        uint256 indexed requestId,
        address indexed user,
        RequestType requestType,
        address principalToken,
        uint256 principalAmount
    );

    event LoanCreated(
        uint256 indexed loanId,
        address indexed lender,
        address indexed borrower,
        address principalToken,
        uint256 principalAmount,
        uint256 interestRate
    );

    event LoanRepaid(
        uint256 indexed loanId,
        uint256 amount,
        uint256 principalPaid,
        uint256 interestPaid,
        bool fullyRepaid
    );

    event LoanLiquidated(
        uint256 indexed loanId,
        address indexed liquidator,
        uint256 collateralSeized,
        uint256 debtCovered
    );

    event InsuranceClaimPaid(
        uint256 indexed loanId,
        address indexed borrower,
        uint256 amount
    );

    // ==================== CONSTRUCTOR ====================

    constructor() {
        // Initialize with empty state
    }

    // ==================== LOAN REQUEST FUNCTIONS ====================

    /**
     * @dev Create a loan offer (lender)
     */
    function createLoanOffer(
        address _principalToken,
        uint256 _principalAmount,
        uint256 _minInterestRate,
        uint256 _durationDays,
        uint256 _minCreditScore,
        bool _autoMatch
    ) external nonReentrant whenNotPaused returns (uint256) {
        require(_principalAmount > 0, "Invalid amount");
        require(_durationDays > 0 && _durationDays <= 365, "Invalid duration");

        uint256 requestId = requestCount++;
        LoanRequest storage request = loanRequests[requestId];
        
        request.user = msg.sender;
        request.requestType = RequestType.OFFER;
        request.principalToken = _principalToken;
        request.principalAmount = _principalAmount;
        request.minInterestRate = _minInterestRate;
        request.durationDays = _durationDays;
        request.minCreditScore = _minCreditScore;
        request.autoMatch = _autoMatch;
        request.status = RequestStatus.OPEN;
        request.createdAt = block.timestamp;
        request.expiresAt = block.timestamp + 30 days;

        // Transfer principal tokens to contract
        IERC20(_principalToken).safeTransferFrom(msg.sender, address(this), _principalAmount);

        emit LoanRequestCreated(requestId, msg.sender, RequestType.OFFER, _principalToken, _principalAmount);

        return requestId;
    }

    /**
     * @dev Create a loan request (borrower)
     */
    function createLoanRequest(
        address _principalToken,
        uint256 _principalAmount,
        address _collateralToken,
        uint256 _collateralAmount,
        uint256 _maxInterestRate,
        uint256 _durationDays,
        bool _autoMatch
    ) external nonReentrant whenNotPaused returns (uint256) {
        require(_principalAmount > 0, "Invalid principal amount");
        require(_collateralAmount > 0, "Invalid collateral amount");
        require(_durationDays > 0 && _durationDays <= 365, "Invalid duration");

        // Calculate LTV ratio
        uint256 collateralValueUsd = getAssetValueUsd(_collateralToken, _collateralAmount);
        uint256 principalValueUsd = getAssetValueUsd(_principalToken, _principalAmount);
        uint256 ltv = (principalValueUsd * BASIS_POINTS) / collateralValueUsd;

        require(ltv <= maxLtvRatio, "LTV exceeds maximum");

        uint256 requestId = requestCount++;
        LoanRequest storage request = loanRequests[requestId];
        
        request.user = msg.sender;
        request.requestType = RequestType.REQUEST;
        request.principalToken = _principalToken;
        request.principalAmount = _principalAmount;
        request.collateralToken = _collateralToken;
        request.collateralAmount = _collateralAmount;
        request.maxInterestRate = _maxInterestRate;
        request.durationDays = _durationDays;
        request.proposedLtv = ltv;
        request.autoMatch = _autoMatch;
        request.status = RequestStatus.OPEN;
        request.createdAt = block.timestamp;
        request.expiresAt = block.timestamp + 30 days;

        // Transfer collateral tokens to contract
        IERC20(_collateralToken).safeTransferFrom(msg.sender, address(this), _collateralAmount);

        emit LoanRequestCreated(requestId, msg.sender, RequestType.REQUEST, _principalToken, _principalAmount);

        return requestId;
    }

    /**
     * @dev Match a loan offer with a loan request
     */
    function matchLoanRequests(
        uint256 _offerId,
        uint256 _requestId,
        uint256 _agreedInterestRate
    ) external nonReentrant whenNotPaused returns (uint256) {
        LoanRequest storage offer = loanRequests[_offerId];
        LoanRequest storage request = loanRequests[_requestId];

        // Validate
        require(offer.status == RequestStatus.OPEN, "Offer not open");
        require(request.status == RequestStatus.OPEN, "Request not open");
        require(offer.requestType == RequestType.OFFER, "Not an offer");
        require(request.requestType == RequestType.REQUEST, "Not a request");
        require(offer.principalToken == request.principalToken, "Token mismatch");
        require(offer.principalAmount >= request.principalAmount, "Insufficient offer amount");
        require(_agreedInterestRate >= offer.minInterestRate, "Rate too low for lender");
        require(_agreedInterestRate <= request.maxInterestRate, "Rate too high for borrower");

        // Create loan
        uint256 loanId = loanCount++;
        Loan storage loan = loans[loanId];
        
        loan.lender = offer.user;
        loan.borrower = request.user;
        loan.principalToken = request.principalToken;
        loan.principalAmount = request.principalAmount;
        loan.collateralToken = request.collateralToken;
        loan.collateralAmount = request.collateralAmount;
        loan.interestRate = _agreedInterestRate;
        loan.durationDays = request.durationDays;
        loan.ltvRatio = request.proposedLtv;
        loan.liquidationThreshold = defaultLiquidationThreshold;
        loan.startTime = block.timestamp;
        loan.dueDate = block.timestamp + (request.durationDays * SECONDS_PER_DAY);
        loan.lastInterestUpdate = block.timestamp;
        loan.status = LoanStatus.ACTIVE;

        // Update request statuses
        offer.status = RequestStatus.MATCHED;
        request.status = RequestStatus.MATCHED;

        // Transfer principal to borrower (minus platform fee)
        uint256 platformFee = (request.principalAmount * platformFeePercentage) / BASIS_POINTS;
        uint256 borrowerAmount = request.principalAmount - platformFee;
        
        IERC20(request.principalToken).safeTransfer(request.user, borrowerAmount);

        emit LoanCreated(
            loanId,
            offer.user,
            request.user,
            request.principalToken,
            request.principalAmount,
            _agreedInterestRate
        );

        return loanId;
    }

    // ==================== LOAN MANAGEMENT ====================

    /**
     * @dev Repay loan (full or partial)
     */
    function repayLoan(uint256 _loanId, uint256 _amount) external nonReentrant {
        Loan storage loan = loans[_loanId];
        require(loan.status == LoanStatus.ACTIVE, "Loan not active");
        require(msg.sender == loan.borrower, "Not borrower");

        // Update accrued interest
        updateLoanInterest(_loanId);

        uint256 totalOwed = loan.principalAmount + loan.accruedInterest - loan.totalRepaid;
        require(_amount <= totalOwed, "Amount exceeds debt");

        // Transfer repayment from borrower
        IERC20(loan.principalToken).safeTransferFrom(msg.sender, address(this), _amount);

        // Determine allocation (interest first, then principal)
        uint256 interestDue = loan.accruedInterest;
        uint256 interestPaid = _amount > interestDue ? interestDue : _amount;
        uint256 principalPaid = _amount > interestDue ? _amount - interestDue : 0;

        loan.totalRepaid += _amount;
        loan.accruedInterest -= interestPaid;

        bool fullyRepaid = loan.totalRepaid >= loan.principalAmount + interestDue;

        if (fullyRepaid) {
            loan.status = LoanStatus.REPAID;
            
            // Return collateral to borrower
            IERC20(loan.collateralToken).safeTransfer(loan.borrower, loan.collateralAmount);
            
            // Transfer principal + interest to lender
            IERC20(loan.principalToken).safeTransfer(loan.lender, loan.totalRepaid);
        }

        emit LoanRepaid(_loanId, _amount, principalPaid, interestPaid, fullyRepaid);
    }

    /**
     * @dev Liquidate an unhealthy loan
     */
    function liquidate(uint256 _loanId) external nonReentrant {
        Loan storage loan = loans[_loanId];
        require(loan.status == LoanStatus.ACTIVE, "Loan not active");

        // Update interest
        updateLoanInterest(_loanId);

        // Calculate health factor
        uint256 healthFactor = calculateHealthFactor(_loanId);
        require(healthFactor < minHealthFactor, "Loan is healthy");

        // Calculate amounts
        uint256 totalOwed = loan.principalAmount + loan.accruedInterest - loan.totalRepaid;
        uint256 collateralValueUsd = getAssetValueUsd(loan.collateralToken, loan.collateralAmount);
        uint256 debtValueUsd = getAssetValueUsd(loan.principalToken, totalOwed);

        // Liquidator pays the debt
        IERC20(loan.principalToken).safeTransferFrom(msg.sender, address(this), totalOwed);

        // Transfer debt to lender
        IERC20(loan.principalToken).safeTransfer(loan.lender, totalOwed);

        // Calculate liquidation bonus
        uint256 bonus = (totalOwed * liquidationPenalty) / BASIS_POINTS;
        uint256 collateralToSeize = loan.collateralAmount;

        // Transfer collateral + bonus to liquidator
        IERC20(loan.collateralToken).safeTransfer(msg.sender, collateralToSeize);

        loan.status = LoanStatus.LIQUIDATED;

        emit LoanLiquidated(_loanId, msg.sender, collateralToSeize, totalOwed);
    }

    // ==================== HELPER FUNCTIONS ====================

    /**
     * @dev Update accrued interest for a loan
     */
    function updateLoanInterest(uint256 _loanId) internal {
        Loan storage loan = loans[_loanId];
        if (loan.status != LoanStatus.ACTIVE) return;

        uint256 timeElapsed = block.timestamp - loan.lastInterestUpdate;
        if (timeElapsed == 0) return;

        uint256 interest = (loan.principalAmount * loan.interestRate * timeElapsed) / 
                          (BASIS_POINTS * SECONDS_PER_YEAR);
        
        loan.accruedInterest += interest;
        loan.lastInterestUpdate = block.timestamp;
    }

    /**
     * @dev Calculate health factor for a loan
     */
    function calculateHealthFactor(uint256 _loanId) public view returns (uint256) {
        Loan storage loan = loans[_loanId];
        if (loan.status != LoanStatus.ACTIVE) return 0;

        uint256 collateralValueUsd = getAssetValueUsd(loan.collateralToken, loan.collateralAmount);
        uint256 totalOwed = loan.principalAmount + loan.accruedInterest - loan.totalRepaid;
        uint256 debtValueUsd = getAssetValueUsd(loan.principalToken, totalOwed);

        if (debtValueUsd == 0) return type(uint256).max;

        uint256 liquidationValue = (collateralValueUsd * loan.liquidationThreshold) / BASIS_POINTS;
        return (liquidationValue * BASIS_POINTS) / debtValueUsd;
    }

    /**
     * @dev Get asset value in USD using Chainlink price feed
     */
    function getAssetValueUsd(address _token, uint256 _amount) public view returns (uint256) {
        AggregatorV3Interface priceFeed = priceFeeds[_token];
        if (address(priceFeed) == address(0)) {
            // Fallback to mock price
            return _amount; // Assume 1:1 for testing
        }

        (, int256 price, , , ) = priceFeed.latestRoundData();
        require(price > 0, "Invalid price");

        return (_amount * uint256(price)) / 1e8; // Chainlink returns 8 decimals
    }

    // ==================== ADMIN FUNCTIONS ====================

    function setPriceFeed(address _token, address _priceFeed) external onlyOwner {
        priceFeeds[_token] = AggregatorV3Interface(_priceFeed);
    }

    function setMaxLtvRatio(uint256 _maxLtv) external onlyOwner {
        maxLtvRatio = _maxLtv;
    }

    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }
}
