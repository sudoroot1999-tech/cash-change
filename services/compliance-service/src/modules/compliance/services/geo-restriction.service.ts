import { Injectable, Logger, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import * as geoip from 'geoip-lite';
import { GeoRestriction, RestrictionType } from '../entities/geo-restriction.entity';

@Injectable()
export class GeoRestrictionService {
  private readonly logger = new Logger(GeoRestrictionService.name);
  private readonly blockedCountries: string[];
  private readonly highRiskCountries: string[];

  constructor(
    @InjectRepository(GeoRestriction)
    private geoRestrictionRepo: Repository<GeoRestriction>,
    private configService: ConfigService,
  ) {
    this.blockedCountries = (this.configService.get('BLOCKED_COUNTRIES', '') as string).split(',').filter(Boolean);
    this.highRiskCountries = (this.configService.get('HIGH_RISK_COUNTRIES', '') as string).split(',').filter(Boolean);
  }

  /**
   * Check if IP address is allowed
   */
  async checkIpRestriction(ipAddress: string, userId?: string): Promise<GeoRestriction> {
    this.logger.log(`Checking IP restriction for ${ipAddress}`);

    // Get geolocation data
    const geo = geoip.lookup(ipAddress);

    if (!geo) {
      // If we can't determine location, allow but log
      this.logger.warn(`Unable to determine geolocation for IP ${ipAddress}`);
      return this.createRestriction(
        ipAddress,
        'XX',
        'Unknown',
        null,
        null,
        RestrictionType.KYC_REQUIRED,
        userId,
        true,
        [],
        'Unable to determine location',
      );
    }

    const countryCode = geo.country;
    const countryName = geo.country;
    const city = null; // geoip-lite doesn't provide city
    const region = geo.region;

    // Check VPN/Proxy detection
    const isVpn = await this.detectVPN(ipAddress);
    const isProxy = await this.detectProxy(ipAddress);

    // Determine restriction type
    let type: RestrictionType;
    let accessAllowed = true;
    let blockedFeatures: string[] = [];
    let reason = '';

    if (this.blockedCountries.includes(countryCode)) {
      type = RestrictionType.BLOCKED;
      accessAllowed = false;
      reason = `Access from ${countryCode} is not permitted due to regulatory restrictions`;
    } else if (this.highRiskCountries.includes(countryCode)) {
      type = RestrictionType.HIGH_RISK;
      blockedFeatures = ['withdrawal', 'p2p'];
      reason = `${countryCode} is a high-risk jurisdiction`;
    } else if (isVpn || isProxy) {
      type = RestrictionType.RESTRICTED_FEATURES;
      blockedFeatures = ['withdrawal'];
      accessAllowed = true;
      reason = 'VPN/Proxy detected - some features restricted';
    } else {
      type = RestrictionType.KYC_REQUIRED;
    }

    return this.createRestriction(
      ipAddress,
      countryCode,
      countryName,
      city,
      region,
      type,
      userId,
      accessAllowed,
      blockedFeatures,
      reason,
      isVpn,
      isProxy,
    );
  }

  /**
   * Create geo restriction record
   */
  private async createRestriction(
    ipAddress: string,
    countryCode: string,
    countryName: string,
    city: string | null,
    region: string | null,
    type: RestrictionType,
    userId?: string,
    accessAllowed: boolean = true,
    blockedFeatures: string[] = [],
    reason: string = '',
    isVpn: boolean = false,
    isProxy: boolean = false,
    isTor: boolean = false,
  ): Promise<GeoRestriction> {
    const restriction = this.geoRestrictionRepo.create({
      userId,
      ipAddress,
      countryCode,
      countryName,
      city,
      region,
      type,
      isVpn,
      isProxy,
      isTor,
      accessAllowed,
      blockedFeatures,
      reason,
    });

    return await this.geoRestrictionRepo.save(restriction);
  }

  /**
   * Detect VPN usage
   */
  private async detectVPN(_ipAddress: string): Promise<boolean> {
    // In production, use a VPN detection service like IPHub, IPQualityScore, etc.
    // For now, simple heuristic check
    
    // Check if IP is in common VPN ranges (placeholder)
    // This should be replaced with actual VPN detection API
    return false;
  }

  /**
   * Detect proxy usage
   */
  private async detectProxy(_ipAddress: string): Promise<boolean> {
    // In production, use a proxy detection service
    // For now, return false
    return false;
  }

  /**
   * Validate user access based on location
   */
  async validateAccess(ipAddress: string, userId?: string): Promise<void> {
    const restriction = await this.checkIpRestriction(ipAddress, userId);

    if (!restriction.accessAllowed) {
      throw new ForbiddenException(restriction.reason || 'Access denied from your location');
    }
  }

  /**
   * Check if feature is allowed for user's location
   */
  async isFeatureAllowed(userId: string, feature: string): Promise<boolean> {
    // Get most recent restriction for user
    const restriction = await this.geoRestrictionRepo.findOne({
      where: { userId },
      order: { createdAt: 'DESC' },
    });

    if (!restriction) {
      return true; // No restrictions found
    }

    if (!restriction.accessAllowed) {
      return false;
    }

    return !restriction.blockedFeatures?.includes(feature);
  }

  /**
   * Get jurisdiction-based terms of service
   */
  async getJurisdictionTerms(countryCode: string): Promise<any> {
    // In production, this would fetch different ToS versions based on jurisdiction
    const jurisdictionMap: any = {
      US: {
        version: '1.0-US',
        requiresAcceptance: true,
        additionalTerms: ['US-specific regulations', 'State disclosures'],
      },
      EU: {
        version: '1.0-EU',
        requiresAcceptance: true,
        additionalTerms: ['GDPR compliance', 'MiFID II disclosures'],
      },
      DEFAULT: {
        version: '1.0',
        requiresAcceptance: true,
        additionalTerms: [],
      },
    };

    // Check if country is in EU
    const euCountries = ['AT', 'BE', 'BG', 'HR', 'CY', 'CZ', 'DK', 'EE', 'FI', 'FR', 'DE', 'GR', 'HU', 'IE', 'IT', 'LV', 'LT', 'LU', 'MT', 'NL', 'PL', 'PT', 'RO', 'SK', 'SI', 'ES', 'SE'];
    
    if (euCountries.includes(countryCode)) {
      return jurisdictionMap.EU;
    }

    return jurisdictionMap[countryCode] || jurisdictionMap.DEFAULT;
  }

  /**
   * Get geo restriction statistics
   */
  async getRestrictionStats(): Promise<any> {
    const totalChecks = await this.geoRestrictionRepo.count();
    const blockedAccess = await this.geoRestrictionRepo.count({
      where: { accessAllowed: false },
    });
    const vpnDetections = await this.geoRestrictionRepo.count({
      where: { isVpn: true },
    });
    const proxyDetections = await this.geoRestrictionRepo.count({
      where: { isProxy: true },
    });

    // Get top countries
    const topCountries = await this.geoRestrictionRepo
      .createQueryBuilder('gr')
      .select('gr.country_code', 'countryCode')
      .addSelect('COUNT(*)', 'count')
      .groupBy('gr.country_code')
      .orderBy('count', 'DESC')
      .limit(10)
      .getRawMany();

    return {
      totalChecks,
      blockedAccess,
      vpnDetections,
      proxyDetections,
      blockedCountries: this.blockedCountries,
      highRiskCountries: this.highRiskCountries,
      topCountries,
    };
  }

  /**
   * Update blocked countries list
   */
  async updateBlockedCountries(countries: string[]): Promise<void> {
    // In production, this would update the configuration
    this.logger.log(`Updating blocked countries: ${countries.join(', ')}`);
    // Update environment or database configuration
  }
}
