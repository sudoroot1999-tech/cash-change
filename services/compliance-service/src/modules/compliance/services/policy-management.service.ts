import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { PolicyAcceptance, PolicyType } from '../entities/policy-acceptance.entity';

interface Policy {
  type: PolicyType;
  version: string;
  content: string;
  effectiveDate: Date;
  lastUpdated: Date;
}

@Injectable()
export class PolicyManagementService {
  private readonly logger = new Logger(PolicyManagementService.name);
  private readonly currentVersion: string;

  // In production, these would be stored in a database or CMS
  private policies: Map<PolicyType, Policy> = new Map();

  constructor(
    @InjectRepository(PolicyAcceptance)
    private policyAcceptanceRepo: Repository<PolicyAcceptance>,
    private configService: ConfigService,
  ) {
    this.currentVersion = this.configService.get('POLICY_VERSION_CURRENT', '1.0.0');
    this.initializePolicies();
  }

  /**
   * Initialize default policies
   */
  private initializePolicies(): void {
    this.policies.set(PolicyType.TERMS_OF_SERVICE, {
      type: PolicyType.TERMS_OF_SERVICE,
      version: this.currentVersion,
      content: this.getTermsOfServiceContent(),
      effectiveDate: new Date('2024-01-01'),
      lastUpdated: new Date(),
    });

    this.policies.set(PolicyType.PRIVACY_POLICY, {
      type: PolicyType.PRIVACY_POLICY,
      version: this.currentVersion,
      content: this.getPrivacyPolicyContent(),
      effectiveDate: new Date('2024-01-01'),
      lastUpdated: new Date(),
    });

    this.policies.set(PolicyType.AML_POLICY, {
      type: PolicyType.AML_POLICY,
      version: this.currentVersion,
      content: this.getAMLPolicyContent(),
      effectiveDate: new Date('2024-01-01'),
      lastUpdated: new Date(),
    });

    this.policies.set(PolicyType.COOKIE_POLICY, {
      type: PolicyType.COOKIE_POLICY,
      version: this.currentVersion,
      content: this.getCookiePolicyContent(),
      effectiveDate: new Date('2024-01-01'),
      lastUpdated: new Date(),
    });

    this.policies.set(PolicyType.RISK_DISCLOSURE, {
      type: PolicyType.RISK_DISCLOSURE,
      version: this.currentVersion,
      content: this.getRiskDisclosureContent(),
      effectiveDate: new Date('2024-01-01'),
      lastUpdated: new Date(),
    });

    this.policies.set(PolicyType.FEE_SCHEDULE, {
      type: PolicyType.FEE_SCHEDULE,
      version: this.currentVersion,
      content: this.getFeeScheduleContent(),
      effectiveDate: new Date('2024-01-01'),
      lastUpdated: new Date(),
    });
  }

  /**
   * Get policy by type
   */
  async getPolicy(type: PolicyType): Promise<Policy> {
    const policy = this.policies.get(type);
    if (!policy) {
      throw new NotFoundException(`Policy ${type} not found`);
    }
    return policy;
  }

  /**
   * Record policy acceptance
   */
  async recordAcceptance(
    userId: string,
    policyType: PolicyType,
    policyVersion: string,
    ipAddress: string,
    userAgent?: string,
  ): Promise<PolicyAcceptance> {
    this.logger.log(`Recording policy acceptance: ${policyType} v${policyVersion} for user ${userId}`);

    const acceptance = this.policyAcceptanceRepo.create({
      userId,
      policyType,
      policyVersion,
      ipAddress,
      userAgent,
      accepted: true,
    });

    return await this.policyAcceptanceRepo.save(acceptance);
  }

  /**
   * Check if user has accepted policy
   */
  async hasAcceptedPolicy(
    userId: string,
    policyType: PolicyType,
    version?: string,
  ): Promise<boolean> {
    const query: any = {
      userId,
      policyType,
      accepted: true,
    };

    if (version) {
      query.policyVersion = version;
    } else {
      query.policyVersion = this.currentVersion;
    }

    const acceptance = await this.policyAcceptanceRepo.findOne({ where: query });
    return !!acceptance;
  }

  /**
   * Get user's policy acceptances
   */
  async getUserAcceptances(userId: string): Promise<PolicyAcceptance[]> {
    return await this.policyAcceptanceRepo.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Get users who need to accept updated policies
   */
  async getUsersNeedingAcceptance(_policyType: PolicyType): Promise<string[]> {
    // This would query users who haven't accepted the latest version
    // For now, return empty array
    return [];
  }

  /**
   * Notify users of policy updates
   */
  async notifyPolicyUpdate(policyType: PolicyType, newVersion: string): Promise<void> {
    this.logger.log(`Notifying users of policy update: ${policyType} v${newVersion}`);

    // In production, this would:
    // 1. Find users who need to accept the new policy
    // 2. Send notifications via notification service
    // 3. Track notification status
  }

  /**
   * Policy content getters (in production, these would come from a CMS)
   */
  private getTermsOfServiceContent(): string {
    return `
# Terms of Service

**Version ${this.currentVersion}**
**Effective Date: January 1, 2024**

## 1. Acceptance of Terms
By accessing and using this cryptocurrency exchange platform, you accept and agree to be bound by the terms and provision of this agreement.

## 2. Eligibility
You must be at least 18 years old and legally capable of entering into binding contracts.

## 3. Account Registration
- You must provide accurate and complete information
- You are responsible for maintaining the security of your account
- You must notify us immediately of any unauthorized use

## 4. KYC/AML Compliance
We are required by law to verify the identity of our users. You agree to:
- Provide valid identification documents
- Complete our KYC verification process
- Update your information as needed

## 5. Trading Rules
- All trades are final and cannot be reversed
- Prices are determined by market conditions
- We reserve the right to cancel suspicious trades

## 6. Fees
- Trading fees apply as per our Fee Schedule
- Withdrawal fees may apply
- Fees are subject to change with notice

## 7. Prohibited Activities
You may not:
- Use the platform for illegal activities
- Manipulate markets
- Use automated trading bots without permission
- Engage in wash trading or other market manipulation

## 8. Risk Disclosure
Cryptocurrency trading involves significant risk. You may lose all of your investment.

## 9. Limitation of Liability
We are not liable for losses due to market conditions, technical issues, or other factors beyond our control.

## 10. Governing Law
These terms are governed by [Jurisdiction] law.

## 11. Changes to Terms
We may update these terms from time to time. Continued use constitutes acceptance.

## Contact
For questions about these terms, contact: legal@example.com
    `.trim();
  }

  private getPrivacyPolicyContent(): string {
    return `
# Privacy Policy

**Version ${this.currentVersion}**
**Last Updated: ${new Date().toISOString().split('T')[0]}**

## 1. Introduction
We respect your privacy and are committed to protecting your personal data.

## 2. Data We Collect
- Personal identification information (name, email, phone)
- Government-issued ID documents
- Transaction history
- Device information and IP addresses
- Cookies and usage data

## 3. How We Use Your Data
- To verify your identity (KYC/AML compliance)
- To process transactions
- To prevent fraud and ensure security
- To improve our services
- To comply with legal requirements

## 4. Data Sharing
We may share your data with:
- Regulatory authorities (as required by law)
- Service providers (KYC verification, payment processing)
- Law enforcement (when legally required)

We do not sell your personal data to third parties.

## 5. Your Rights (GDPR)
You have the right to:
- Access your personal data
- Rectify inaccurate data
- Request deletion (right to be forgotten)
- Data portability
- Restrict processing
- Object to processing
- Withdraw consent

## 6. Data Security
We implement appropriate security measures to protect your data.

## 7. Data Retention
We retain your data for as long as necessary to comply with legal obligations (typically 7 years for financial records).

## 8. Cookies
We use cookies to improve your experience. You can control cookies through your browser settings.

## 9. International Transfers
Your data may be transferred to countries outside your residence. We ensure appropriate safeguards are in place.

## 10. Contact
For privacy inquiries, contact: privacy@example.com
Data Protection Officer: dpo@example.com
    `.trim();
  }

  private getAMLPolicyContent(): string {
    return `
# Anti-Money Laundering (AML) Policy

**Version ${this.currentVersion}**

## 1. Purpose
This policy outlines our commitment to preventing money laundering and terrorist financing.

## 2. Compliance Framework
We comply with:
- Bank Secrecy Act (BSA)
- USA PATRIOT Act
- FinCEN regulations
- FATF recommendations

## 3. Customer Due Diligence (CDD)
- Identity verification for all customers
- Ongoing monitoring of transactions
- Enhanced due diligence for high-risk customers

## 4. Know Your Customer (KYC)
We verify:
- Full legal name
- Date of birth
- Residential address
- Government-issued ID
- Source of funds (for large transactions)

## 5. Politically Exposed Persons (PEP)
Additional screening for PEPs and their close associates.

## 6. Sanctions Screening
We screen against:
- OFAC Sanctions List
- UN Sanctions List
- EU Sanctions List

## 7. Transaction Monitoring
- Real-time screening of all transactions
- Suspicious Activity Reports (SAR) for unusual patterns
- Currency Transaction Reports (CTR) for large transactions

## 8. Record Keeping
We maintain records for at least 7 years.

## 9. Reporting
We report suspicious activities to FinCEN and other relevant authorities.

## 10. Training
All staff receive regular AML training.
    `.trim();
  }

  private getCookiePolicyContent(): string {
    return `
# Cookie Policy

We use cookies to enhance your experience on our platform.

## What Are Cookies?
Cookies are small text files stored on your device.

## Types of Cookies We Use
1. **Essential Cookies**: Required for platform functionality
2. **Analytics Cookies**: Help us understand how you use the platform
3. **Marketing Cookies**: Used for targeted advertising

## Managing Cookies
You can control cookies through your browser settings.

## Contact
For questions about cookies: privacy@example.com
    `.trim();
  }

  private getRiskDisclosureContent(): string {
    return `
# Risk Disclosure Statement

**IMPORTANT: Please read carefully**

## Cryptocurrency Trading Risks

### 1. High Volatility
Cryptocurrency prices can fluctuate dramatically in short periods.

### 2. Loss of Capital
You may lose all of your invested capital.

### 3. Regulatory Risk
Cryptocurrency regulations vary by jurisdiction and may change.

### 4. Technology Risk
- Exchange hacks
- Smart contract vulnerabilities
- Network failures

### 5. Liquidity Risk
You may not be able to sell your assets quickly.

### 6. No Insurance
Cryptocurrency deposits are not insured by FDIC or similar programs.

### 7. Irreversible Transactions
Blockchain transactions cannot be reversed.

## Acknowledgment
By using this platform, you acknowledge that you understand these risks.
    `.trim();
  }

  private getFeeScheduleContent(): string {
    return `
# Fee Schedule

**Version ${this.currentVersion}**
**Effective Date: ${new Date().toISOString().split('T')[0]}**

## Trading Fees

### Spot Trading
- Maker: 0.1%
- Taker: 0.2%

### Volume-Based Discounts
- > $100,000/month: 0.08% / 0.15%
- > $1,000,000/month: 0.05% / 0.10%

## Deposit Fees
- Cryptocurrency: FREE
- Bank Transfer: FREE
- Credit/Debit Card: 2.5%

## Withdrawal Fees
- Bitcoin (BTC): 0.0005 BTC
- Ethereum (ETH): 0.005 ETH
- Bank Transfer: $25 USD

## Other Fees
- Inactivity Fee: $10/month (after 12 months)
- Wire Transfer: $50

Fees subject to change with 30 days notice.
    `.trim();
  }
}
