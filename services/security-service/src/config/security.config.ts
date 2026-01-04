export const securityConfig = {
  antiPhishing: {
    enabled: true,
    minCodeLength: 4,
    maxCodeLength: 50,
  },
  
  withdrawalWhitelist: {
    enabled: true,
    defaultCoolingPeriodHours: 24,
    requireEmailConfirmation: true,
    requireSmsConfirmation: true,
  },
  
  apiKeys: {
    enabled: true,
    maxKeysPerUser: 10,
    defaultExpirationDays: 365,
    rotationReminderDays: 90,
  },
  
  loginSecurity: {
    maxFailedAttempts: 5,
    lockoutDurationMinutes: 30,
    maxConcurrentSessions: 5,
    requireDeviceVerification: true,
  },
  
  transactionMonitoring: {
    enabled: true,
    anomalyThreshold: 60,
    velocityCheckEnabled: true,
    mlModelEnabled: false, // Enable when ML model is trained
  },
  
  coldWallet: {
    enabled: true,
    auditIntervalDays: 30,
    multiSigRequired: true,
  },
  
  proofOfReserves: {
    enabled: true,
    auditIntervalDays: 7,
    publishResults: true,
  },
  
  insuranceFund: {
    enabled: true,
    safuPercentage: 0.1, // 10% of fees
    minBalanceThreshold: 1000000, // Alert if below $1M
  },
  
  bugBounty: {
    enabled: true,
    rewardTiers: {
      CRITICAL: { min: 5000, max: 50000 },
      HIGH: { min: 2000, max: 10000 },
      MEDIUM: { min: 500, max: 2000 },
      LOW: { min: 100, max: 500 },
      INFO: { min: 0, max: 100 },
    },
  },
  
  incidentResponse: {
    enabled: true,
    autoCircuitBreaker: true,
    criticalAlertEmails: ['security@exchange.com', 'admin@exchange.com'],
  },
};
