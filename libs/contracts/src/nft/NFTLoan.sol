// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract NFTLoan is ReentrancyGuard, Ownable {
    enum LoanStatus { REQUESTED, ACTIVE, REPAID, DEFAULTED, LIQUIDATED, CANCELLED }
    
    struct Loan {
        address borrower;
        address lender;
        address nftContract;
        uint256 tokenId;
        address loanToken;
        uint256 loanAmount;
        uint256 interestRate; // in basis points per year
        uint256 duration; // in seconds
        uint256 collateralValuation;
        uint256 ltvRatio; // loan-to-value in basis points
        uint256 startTime;
        uint256 endTime;
        uint256 repaymentAmount;
        LoanStatus status;
    }
    
    struct LoanOffer {
        address lender;
        address loanToken;
        uint256 loanAmount;
        uint256 interestRate;
        uint256 duration;
        uint256 maxLTV;
        bool isActive;
    }
    
    uint256 private _loanIdCounter;
    uint256 public platformFee = 100; // 1%
    address public feeRecipient;
    
    mapping(uint256 => Loan) public loans;
    mapping(uint256 => LoanOffer[]) public loanOffers;
    mapping(address => uint256[]) public borrowerLoans;
    mapping(address => uint256[]) public lenderLoans;
    
    event LoanRequested(
        uint256 indexed loanId,
        address indexed borrower,
        address nftContract,
        uint256 tokenId,
        uint256 loanAmount
    );
    
    event LoanOfferMade(
        uint256 indexed loanId,
        address indexed lender,
        uint256 loanAmount,
        uint256 interestRate
    );
    
    event LoanStarted(
        uint256 indexed loanId,
        address indexed borrower,
        address indexed lender,
        uint256 loanAmount
    );
    
    event LoanRepaid(uint256 indexed loanId, uint256 repaymentAmount);
    event LoanDefaulted(uint256 indexed loanId);
    event LoanLiquidated(uint256 indexed loanId, address indexed liquidator);
    
    constructor(address _feeRecipient) Ownable(msg.sender) {
        feeRecipient = _feeRecipient;
    }
    
    function requestLoan(
        address nftContract,
        uint256 tokenId,
        address loanToken,
        uint256 loanAmount,
        uint256 duration,
        uint256 collateralValuation
    ) external nonReentrant returns (uint256) {
        require(IERC721(nftContract).ownerOf(tokenId) == msg.sender, "Not token owner");
        require(loanAmount > 0, "Invalid loan amount");
        require(duration > 0, "Invalid duration");
        require(collateralValuation > 0, "Invalid valuation");
        
        // Transfer NFT to contract as collateral
        IERC721(nftContract).transferFrom(msg.sender, address(this), tokenId);
        
        uint256 loanId = _loanIdCounter++;
        
        loans[loanId] = Loan({
            borrower: msg.sender,
            lender: address(0),
            nftContract: nftContract,
            tokenId: tokenId,
            loanToken: loanToken,
            loanAmount: loanAmount,
            interestRate: 0,
            duration: duration,
            collateralValuation: collateralValuation,
            ltvRatio: (loanAmount * 10000) / collateralValuation,
            startTime: 0,
            endTime: 0,
            repaymentAmount: 0,
            status: LoanStatus.REQUESTED
        });
        
        borrowerLoans[msg.sender].push(loanId);
        
        emit LoanRequested(loanId, msg.sender, nftContract, tokenId, loanAmount);
        return loanId;
    }
    
    function makeLoanOffer(
        uint256 loanId,
        uint256 interestRate,
        uint256 maxLTV
    ) external nonReentrant {
        Loan storage loan = loans[loanId];
        require(loan.status == LoanStatus.REQUESTED, "Loan not available");
        require(loan.ltvRatio <= maxLTV, "LTV too high");
        
        loanOffers[loanId].push(LoanOffer({
            lender: msg.sender,
            loanToken: loan.loanToken,
            loanAmount: loan.loanAmount,
            interestRate: interestRate,
            duration: loan.duration,
            maxLTV: maxLTV,
            isActive: true
        }));
        
        emit LoanOfferMade(loanId, msg.sender, loan.loanAmount, interestRate);
    }
    
    function acceptLoanOffer(uint256 loanId, uint256 offerIndex) external nonReentrant {
        Loan storage loan = loans[loanId];
        require(loan.borrower == msg.sender, "Not borrower");
        require(loan.status == LoanStatus.REQUESTED, "Loan not available");
        
        LoanOffer[] storage offers = loanOffers[loanId];
        require(offerIndex < offers.length, "Invalid offer");
        
        LoanOffer memory offer = offers[offerIndex];
        require(offer.isActive, "Offer not active");
        
        // Calculate repayment amount
        uint256 interest = (loan.loanAmount * offer.interestRate * loan.duration) / (10000 * 365 days);
        uint256 repaymentAmount = loan.loanAmount + interest;
        
        // Transfer loan amount to borrower
        require(
            IERC20(loan.loanToken).transferFrom(offer.lender, msg.sender, loan.loanAmount),
            "Loan transfer failed"
        );
        
        // Update loan
        loan.lender = offer.lender;
        loan.interestRate = offer.interestRate;
        loan.startTime = block.timestamp;
        loan.endTime = block.timestamp + loan.duration;
        loan.repaymentAmount = repaymentAmount;
        loan.status = LoanStatus.ACTIVE;
        
        lenderLoans[offer.lender].push(loanId);
        
        // Deactivate all offers
        for (uint256 i = 0; i < offers.length; i++) {
            offers[i].isActive = false;
        }
        
        emit LoanStarted(loanId, msg.sender, offer.lender, loan.loanAmount);
    }
    
    function repayLoan(uint256 loanId) external nonReentrant {
        Loan storage loan = loans[loanId];
        require(loan.borrower == msg.sender, "Not borrower");
        require(loan.status == LoanStatus.ACTIVE, "Loan not active");
        
        uint256 platformFeeAmount = (loan.repaymentAmount * platformFee) / 10000;
        uint256 lenderAmount = loan.repaymentAmount - platformFeeAmount;
        
        // Transfer repayment
        require(
            IERC20(loan.loanToken).transferFrom(msg.sender, loan.lender, lenderAmount),
            "Repayment to lender failed"
        );
        
        require(
            IERC20(loan.loanToken).transferFrom(msg.sender, feeRecipient, platformFeeAmount),
            "Platform fee payment failed"
        );
        
        // Return NFT collateral
        IERC721(loan.nftContract).transferFrom(address(this), msg.sender, loan.tokenId);
        
        loan.status = LoanStatus.REPAID;
        
        emit LoanRepaid(loanId, loan.repaymentAmount);
    }
    
    function liquidateLoan(uint256 loanId) external nonReentrant {
        Loan storage loan = loans[loanId];
        require(loan.status == LoanStatus.ACTIVE, "Loan not active");
        require(block.timestamp > loan.endTime, "Loan not expired");
        
        // Transfer NFT to lender
        IERC721(loan.nftContract).transferFrom(address(this), loan.lender, loan.tokenId);
        
        loan.status = LoanStatus.LIQUIDATED;
        
        emit LoanLiquidated(loanId, msg.sender);
    }
    
    function cancelLoanRequest(uint256 loanId) external {
        Loan storage loan = loans[loanId];
        require(loan.borrower == msg.sender, "Not borrower");
        require(loan.status == LoanStatus.REQUESTED, "Loan not in requested status");
        
        // Return NFT
        IERC721(loan.nftContract).transferFrom(address(this), msg.sender, loan.tokenId);
        
        loan.status = LoanStatus.CANCELLED;
    }
    
    function getLoanOffers(uint256 loanId) external view returns (LoanOffer[] memory) {
        return loanOffers[loanId];
    }
    
    function getBorrowerLoans(address borrower) external view returns (uint256[] memory) {
        return borrowerLoans[borrower];
    }
    
    function getLenderLoans(address lender) external view returns (uint256[] memory) {
        return lenderLoans[lender];
    }
    
    function setPlatformFee(uint256 _fee) external onlyOwner {
        require(_fee <= 1000, "Fee too high");
        platformFee = _fee;
    }
    
    function setFeeRecipient(address _feeRecipient) external onlyOwner {
        require(_feeRecipient != address(0), "Invalid address");
        feeRecipient = _feeRecipient;
    }
}
