// Admin Role
export const ADMIN_ROLE = {
  SUPER_ADMIN: 'super_admin',
  FINANCE_ADMIN: 'finance_admin',
  SUPPORT_ADMIN: 'support_admin',
  COMPLIANCE_ADMIN: 'compliance_admin',
  MARKETING_ADMIN: 'marketing_admin',
  DEVELOPER_ADMIN: 'developer_admin',
  RISK_MANAGER: 'risk_manager',
  OTC_DESK_MANAGER: 'otc_desk_manager',
} as const;

// Admin Status
export const ADMIN_STATUS = {
  ACTIVE: 'active',
  INACTIVE: 'inactive',
  SUSPENDED: 'suspended',
} as const;

export const ACTION_TYPE = {
  USER_VIEW: 'user_view',
  USER_EDIT: 'user_edit',
  USER_SUSPEND: 'user_suspend',
  USER_DELETE: 'user_delete',
  KYC_APPROVE: 'kyc_approve',
  KYC_REJECT: 'kyc_reject',
  TRANSACTION_VIEW: 'transaction_view',
  TRANSACTION_REVERSE: 'transaction_reverse',
  DEPOSIT_APPROVE: 'deposit_approve',
  DEPOSIT_REJECT: 'deposit_reject',
  WITHDRAWAL_APPROVE: 'withdrawal_approve',
  WITHDRAWAL_REJECT: 'withdrawal_reject',
  CONFIG_UPDATE: 'config_update',
  ANNOUNCEMENT_CREATE: 'announcement_create',
  ANNOUNCEMENT_UPDATE: 'announcement_update',
  ANNOUNCEMENT_DELETE: 'announcement_delete',
  TRADING_PAIR_ADD: 'trading_pair_add',
  TRADING_PAIR_UPDATE: 'trading_pair_update',
  TRADING_PAIR_DISABLE: 'trading_pair_disable',
  FEE_UPDATE: 'fee_update',
  REPORT_GENERATE: 'report_generate',
  ADMIN_CREATE: 'admin_create',
  ADMIN_UPDATE: 'admin_update',
  ADMIN_DELETE: 'admin_delete',
} as const;

export const ACTION_STATUS = {
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  EXECUTED: 'executed',
  FAILED: 'failed',
} as const;

export const ANNOUNCEMENT_TYPE = {
  INFO: 'info',
  WARNING: 'warning',
  ALERT: 'alert',
  MAINTENANCE: 'maintenance',
  PROMOTION: 'promotion',
} as const;

export const ANNOUNCEMENT_STATUS = {
  DRAFT: 'draft',
  PUBLISHED: 'published',
  ARCHIVED: 'archived',
} as const;

export const WORKFLOW_STATUS = {
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  EXPIRED: 'expired',
} as const;

export const ROLE = {
  USER: 'user',
  TRADER: 'trader',
  VERIFIED_TRADER: 'verified_trader',
  MODERATOR: 'moderator',
  ADMIN: 'admin',
} as const;

// User Status
export const USER_STATUS = {
  PENDING: 'pending',
  ACTIVE: 'active',
  SUSPENDED: 'suspended',
  BANNED: 'banned',
  DELETED: 'deleted'
} as const;

// User Tiers
export const USER_TIERS = {
  BASIC: 'basic',
  INTERMEDIATE: 'intermediate',
  ADVANCED: 'advanced',
  VIP: 'vip',
  ULTRA_VIP: 'ultra_vip',
  INSTITUTIONAL: 'institutional',
} as const;

// KYC Levels
export const KYC_LEVELS = {
  NONE: 0,
  BASIC: 1,
  INTERMEDIATE: 2,
  ADVANCED: 3,
} as const;

// KYC Status
export const KYC_STATUS = {
  PENDING: 'pending',
  UNDER_REVIEW: 'under_review',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  EXPIRED: 'expired'
} as const;

// KYC Documents
export const DOCUMENT_TYPE = {
  PASSPORT: 'passport',
  ID_CARD: 'id_card',
  NATIONAL_ID: 'national_id',
  DRIVER_LICENSE: 'driver_license',
  PROOF_OF_ADDRESS: 'proof_of_address',
  SELFIE: 'selfie',
  UTILITY_BILL: 'utility_bill',
  BANK_STATEMENT: 'bank_statement',
} as const;

// KYC Providers
export const KYC_PROVIDER = {
  ONFIDO: 'onfido',
  JUMIO: 'jumio',
  MANUAL: 'manual',
} as const;

// Compliance Check Type
export const COMPLIANCE_CHECK_TYPE = {
  KYC_VERIFICATION: 'kyc_verification',
  AML_SCREENING: 'aml_screening',
  PEP_SCREENING: 'pep_screening',
  SANCTIONS_CHECK: 'sanctions_check',
  ADVERSE_MEDIA: 'adverse_media',
  TRANSACTION_MONITORING: 'transaction_monitoring',
  ENHANCED_DUE_DILIGENCE: 'enhanced_due_diligence',
  ONGOING_MONITORING: 'ongoing_monitoring',
} as const;

// Compliance Check Status
export const COMPLIANCE_CHECK_STATUS = {
  PENDING: 'pending',
  IN_PROGRESS: 'in_progress',
  PASSED: 'passed',
  FAILED: 'failed',
  REQUIRES_REVIEW: 'requires_review',
  EXPIRED: 'expired',
} as const;

export const AUDIT_LOG_ACTION = {
  // User actions
  USER_LOGIN: 'user_login',
  USER_LOGOUT: 'user_logout',
  USER_REGISTER: 'user_register',
  USER_UPDATE_PROFILE: 'user_update_profile',
  USER_CHANGE_PASSWORD: 'user_change_password',
  USER_ENABLE_2FA: 'user_enable_2fa',
  USER_DISABLE_2FA: 'user_disable_2fa',

  // KYC actions
  KYC_SUBMIT: 'kyc_submit',
  KYC_APPROVE: 'kyc_approve',
  KYC_REJECT: 'kyc_reject',

  // Wallet actions
  WALLET_CREATE: 'wallet_create',
  DEPOSIT: 'deposit',
  WITHDRAWAL: 'withdrawal',
  TRANSFER: 'transfer',

  // Trading actions
  ORDER_CREATE: 'order_create',
  ORDER_CANCEL: 'order_cancel',
  TRADE_EXECUTE: 'trade_execute',

  // GDPR actions
  DATA_EXPORT_REQUEST: 'data_export_request',
  DATA_DELETE_REQUEST: 'data_delete_request',
  DATA_ACCESS: 'data_access',

  // Admin actions
  ADMIN_USER_SUSPEND: 'admin_user_suspend',
  ADMIN_USER_UNSUSPEND: 'admin_user_unsuspend',
  ADMIN_TRANSACTION_REVIEW: 'admin_transaction_review',
  ADMIN_COMPLIANCE_OVERRIDE: 'admin_compliance_override',
  ADMIN_SETTINGS_CHANGE: 'admin_settings_change',

  // System actions
  SYSTEM_BACKUP: 'system_backup',
  SYSTEM_MAINTENANCE: 'system_maintenance',
} as const;

export const GDPR_REQUEST_TYPE = {
  DATA_EXPORT: 'data_export', // Right to data portability
  DATA_DELETE: 'data_delete', // Right to be forgotten
  DATA_ACCESS: 'data_access', // Right to access
  DATA_RECTIFICATION: 'data_rectification', // Right to rectification
  RESTRICT_PROCESSING: 'restrict_processing', // Right to restriction
  OBJECT_PROCESSING: 'object_processing', // Right to object
  WITHDRAW_CONSENT: 'withdraw_consent',
} as const;

export const GDPR_REQUEST_STATUS = {
  PENDING: 'pending',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
  REJECTED: 'rejected',
  CANCELLED: 'cancelled',
} as const;

export const RESTRICTION_TYPE = {
  BLOCKED: 'blocked',
  HIGH_RISK: 'high_risk',
  RESTRICTED_FEATURES: 'restricted_features',
  KYC_REQUIRED: 'kyc_required',
} as const;

export const POLICY_TYPE = {
  TERMS_OF_SERVICE: 'terms_of_service',
  PRIVACY_POLICY: 'privacy_policy',
  AML_POLICY: 'aml_policy',
  COOKIE_POLICY: 'cookie_policy',
  RISK_DISCLOSURE: 'risk_disclosure',
  FEE_SCHEDULE: 'fee_schedule',
} as const;

export const SAR_STATUS = {
  DETECTED: 'detected',
  UNDER_REVIEW: 'under_review',
  REPORTED: 'reported',
  FALSE_POSITIVE: 'false_positive',
  DISMISSED: 'dismissed',
} as const;

export const SAR_TYPE = {
  STRUCTURING: 'structuring', // Breaking up transactions to avoid reporting
  RAPID_MOVEMENT: 'rapid_movement', // Quick in and out
  UNUSUAL_PATTERN: 'unusual_pattern',
  HIGH_RISK_JURISDICTION: 'high_risk_jurisdiction',
  BLACKLIST_INTERACTION: 'blacklist_interaction',
  WASH_TRADING: 'wash_trading',
  LAYERING: 'layering',
  MULTIPLE_ACCOUNTS: 'multiple_accounts',
  ABNORMAL_VOLUME: 'abnormal_volume',
} as const;

export const TAX_REPORT_STATUS = {
  PENDING: 'pending',
  GENERATING: 'generating',
  COMPLETED: 'completed',
  FAILED: 'failed',
} as const;

export const COST_BASIS_METHOD = {
  FIFO: 'FIFO', // First In First Out
  LIFO: 'LIFO', // Last In First Out
  HIFO: 'HIFO', // Highest In First Out
  AVERAGE: 'AVERAGE', // Average Cost
  SPECIFIC_ID: 'SPECIFIC_ID', // Specific Identification
} as const;

export const MONITORING_STATUS = {
  CLEAR: 'clear',
  FLAGGED: 'flagged',
  BLOCKED: 'blocked',
  UNDER_REVIEW: 'under_review',
} as const;

export const POOL_STATUS = {
  ACTIVE: 'ACTIVE',
  PAUSED: 'PAUSED',
  CLOSED: 'CLOSED',
} as const;

export const LIQUIDITY_POSITION_STATUS = {
  ACTIVE: 'ACTIVE',
  REMOVED: 'REMOVED',
} as const;

export const LOAN_STATUS = {
  ACTIVE: 'ACTIVE',
  REPAID: 'REPAID',
  LIQUIDATED: 'LIQUIDATED',
  DEFAULTED: 'DEFAULTED',
  REQUESTED: 'REQUESTED',
  CANCELLED: 'CANCELLED',
  PENDING: 'PENDING',
} as const;

export const COLLATERAL_TYPE = {
  CRYPTO: 'CRYPTO',
  NFT: 'NFT',
  LP_TOKEN: 'LP_TOKEN',
} as const;

export const DEFI_REWARD_TYPE = {
  STAKING: 'STAKING',
  FARMING: 'FARMING',
  LENDING: 'LENDING',
  REFERRAL: 'REFERRAL',
} as const;

export const DEFI_REWARD_STATUS = {
  PENDING: 'PENDING',
  CLAIMED: 'CLAIMED',
  COMPOUNDED: 'COMPOUNDED',
} as const;

export const STAKING_TYPE = {
  FLEXIBLE: 'FLEXIBLE',
  LOCKED: 'LOCKED',
} as const;

export const STAKING_STATUS = {
  ACTIVE: 'ACTIVE',
  UNSTAKED: 'UNSTAKED',
  COMPLETED: 'COMPLETED',
  SLASHED: 'SLASHED',
  EMERGENCY_WITHDRAWN: 'EMERGENCY_WITHDRAWN',
} as const;

export const BADGE_RARITY = {
  COMMON: 'common',
  UNCOMMON: 'uncommon',
  RARE: 'rare',
  EPIC: 'epic',
  LEGENDARY: 'legendary',
} as const;

export const BADGE_CATEGORY = {
  ACHIEVEMENT: 'achievement',
  MILESTONE: 'milestone',
  EVENT: 'event',
  SPECIAL: 'special',
  STREAK: 'streak',
  COURSE: 'course',
  PARTICIPATION: 'participation'
} as const;

export const BADGE_CRITERIA_TYPE = {
  COURSE_COMPLETION: 'course-completion',
  XP_MILESTONE: 'xp-milestone',
  STREAK: 'streak',
  QUIZ_MASTER: 'quiz-master',
  EARLY_BIRD: 'early-bird',
  CONTRIBUTOR: 'contributor',
  MENTOR: 'mentor',
  CUSTOM: 'custom',
} as const;

export const CHALLENGE_TYPE = {
  SOLO: 'solo',
  TEAM: 'team',
  GLOBAL: 'global',
} as const;

export const CHALLENGE_STATUS = {
  UPCOMING: 'upcoming',
  ACTIVE: 'active',
  ENDED: 'ended',
  CANCELLED: 'cancelled',
} as const;

export const FRAUD_TYPE = {
  SUSPICIOUS_XP_GAIN: 'suspicious_xp_gain',
  MISSION_ABUSE: 'mission_abuse',
  GAME_MANIPULATION: 'game_manipulation',
  ACCOUNT_SHARING: 'account_sharing',
  BOT_ACTIVITY: 'bot_activity',
  REWARD_FARMING: 'reward_farming',
  FAKE_SIGNUP: 'fake_signup',
  SELF_REFERRAL: 'self_referral',
  IP_ABUSE: 'ip_abuse',
  DEVICE_ABUSE: 'device_abuse',
  VELOCITY_ABUSE: 'velocity_abuse',
  SUSPICIOUS_PATTERN: 'suspicious_pattern',
  DUPLICATE_ACCOUNT: 'duplicate_account'
} as const;

export const FRAUD_STATUS = {
  FLAGGED: 'flagged',
  INVESTIGATING: 'investigating',
  CONFIRMED: 'confirmed',
  FALSE_POSITIVE: 'false_positive',
  RESOLVED: 'resolved'
} as const;

export const GUILD_ROLE = {
  OWNER: 'owner',
  ADMIN: 'admin',
  OFFICER: 'officer',
  MEMBER: 'member',
} as const;

export const GUILD_STATUS = {
  ACTIVE: 'active',
  INACTIVE: 'inactive',
  DISBANDED: 'disbanded'
} as const;

export const MEMBERSHIP_STATUS = {
  ACTIVE: 'active',
  PENDING: 'pending',
  KICKED: 'kicked',
  LEFT: 'left',
} as const;

export const LEADERBOARD_TYPE = {
  OVERALL_XP: 'overall_xp',
  WEEKLY_XP: 'weekly_xp',
  MONTHLY_XP: 'monthly_xp',
  PRICE_PREDICTION: 'price_prediction',
  TRADING_SIMULATOR: 'trading_simulator',
  QUIZ: 'quiz',
  GUILD: 'guild',
  PET_BATTLE: 'pet_battle',
} as const;

export const LEADERBOARD_PERIOD = {
  ALL_TIME: 'all_time',
  DAILY: 'daily',
  WEEKLY: 'weekly',
  MONTHLY: 'monthly',
} as const;

export const MINIGAME_TYPE = {
  PRICE_PREDICTION: 'price_prediction',
  QUIZ: 'quiz',
  SPIN_WHEEL: 'spin_wheel',
  TRADING_SIMULATOR: 'trading_simulator',
} as const;

export const GAME_STATUS = {
  PENDING: 'pending',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
} as const;

export const MISSION_TYPE = {
  DAILY: 'daily',
  WEEKLY: 'weekly',
  MONTHLY: 'monthly',
  ONE_TIME: 'one_time',
  RECURRING: 'recurring',
} as const;

export const MISSION_CATEGORY = {
  TRADING: 'trading',
  SOCIAL: 'social',
  EDUCATIONAL: 'educational',
  REFERRAL: 'referral',
  LOGIN: 'login',
} as const;

export const BATTLE_STATUS = {
  PENDING: 'pending',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
} as const;

export const PREDICTION_TYPE = {
  UP_DOWN: 'up_down',
  EXACT_RANGE: 'exact_range',
} as const;

export const PREDICTION_DUARION = {
  FIVE_MIN: 5,
  FIFTEEN_MIN: 15,
  THIRTY_MIN: 30,
} as const;

export const PREDICTION_DIFFICULTY = {
  EASY: 'easy',
  MEDIUM: 'medium',
  HARD: 'hard',
  EXPERT: 'expert',
} as const;

export const QUIZ_SESSION_STATUS = {
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
  ABANDONED: 'abandoned',
  TIMEOUT: 'timeout',
} as const;

export const QUIZ_DIFFICULTY = {
  EASY: 'easy',
  MEDIUM: 'medium',
  HARD: 'hard',
  EXPERT: 'expert',
} as const;

export const QUIZ_CATEGORY = {
  BLOCKCHAIN: 'blockchain',
  TRADING: 'trading',
  DEFI: 'defi',
  NFT: 'nft',
  SECURITY: 'security',
  GENERAL: 'general',
} as const;

export const REWARD_STATUS = {
  PENDING: 'pending',
  DISTRIBUTED: 'distributed',
  CLAIMED: 'claimed',
  EXPIRED: 'expired',
  CANCELLED: 'cancelled',
} as const;

export const EVENT_SEASON = {
  HALLOWEEN: 'halloween',
  BLACK_FRIDAY: 'black_friday',
  CHRISTMAS: 'christmas',
  NEW_YEAR: 'new_year',
  BULL_MARKET: 'bull_market',
  BEAR_MARKET: 'bear_market',
  CUSTOM: 'custom',
} as const;

export const EVENT_STATUS = {
  UPCOMING: 'upcoming',
  ACTIVE: 'active',
  COMPLETED: 'completed',
} as const;

export const SIMULATOR_TRADE_TYPE = {
  BUY: 'buy',
  SELL: 'sell',
} as const;

export const SIMULATOR_TRADE_STATUS = {
  OPEN: 'open',
  CLOSED: 'closed',
  CANCELLED: 'cancelled',
} as const;

export const SPINWHEEL_TYPE = {
  DAILY: 'daily',
  PREMIUM: 'premium',
  EVENT: 'event',
  JACKPOT: 'jackpot',
} as const;

export const PRIZE_TYPE = {
  TOKENS: 'tokens',
  XP: 'xp',
  FEE_DISCOUNT: 'fee_discount',
  NFT: 'nft',
  BADGE: 'badge',
  NOTHING: 'nothing',
} as const;

export const TOURNAMENT_TYPE = {
  PRICE_PREDICTION: 'price_prediction',
  TRADING_SIMULATOR: 'trading_simulator',
  QUIZ: 'quiz',
  MIXED: 'mixed',
} as const;

export const TOURNAMENT_STATUS = {
  UPCOMING: 'upcoming',
  ACTIVE: 'active',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
} as const;

export const TREASURE_HUNT_STATUS = {
  ACTIVE: 'active',
  COMPLETED: 'completed',
  EXPIRED: 'expired',
} as const;

export const MISSION_STATUS = {
  NOT_STARTED: 'not_started',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
  CLAIMED: 'claimed',
  EXPIRED: 'expired',
} as const;

export const PET_SPECIES = {
  CRYPTO_DRAGON: 'crypto_dragon',
  BLOCKCHAIN_BEAR: 'blockchain_bear',
  DEFI_DOG: 'defi_dog',
  NFT_NARWHAL: 'nft_narwhal',
  TOKEN_TIGER: 'token_tiger',
  SATOSHI_SNAKE: 'satoshi_snake',
} as const;

export const PET_RARITY = {
  COMMON: 'common',
  UNCOMMON: 'uncommon',
  RARE: 'rare',
  EPIC: 'epic',
  LEGENDARY: 'legendary',
} as const;

export const PET_MOOD = {
  HAPPY: 'happy',
  NEUTRAL: 'neutral',
  HUNGRY: 'hungry',
  SAD: 'sad',
  EXCITED: 'excited',
} as const;

export const XP_SOURCE = {
  TRADING_VOLUME: 'trading_volume',
  REFERRAL: 'referral',
  DAILY_LOGIN: 'daily_login',
  MISSION_COMPLETE: 'mission_complete',
  CHALLENGE_WIN: 'challenge_win',
  BADGE_EARNED: 'badge_earned',
  SOCIAL_ENGAGEMENT: 'social_engagement',
  EDUCATIONAL_CONTENT: 'educational_content',
  MINI_GAME: 'mini_game',
  MANUAL_ADJUSTMENT: 'manual_adjustment',
  QUIZ_COMPLETED: 'quiz_completed',
  QUIZ_PERFECT_SCORE: 'quiz_perfect_score',
  TREASURE_HUNT_COMPLETED: 'treasure_hunt_completed',
  TREASURE_HUNT_REWARD: 'treasure_hunt_reward',
  SPIN_WHEEL: 'spin_wheel',
  TOURNAMENT_PRIZE: 'tournament_prize',
  PRICE_PREDICTION: 'price_prediction',
  GUILD_CREATED: 'guild_created',
  SIMULATOR_STARTED: 'simulator_started',
  SIMULATOR_PROFITABLE_TRADE: 'simulator_profitable_trade',
  SIMULATOR_GRADUATION: 'simulator_graduation',
  PET_ADOPTED: 'pet_adopted',
  PET_BATTLE_WON: 'pet_battle_won',
} as const;

export const PROJECT_STATUS = {
  DRAFT: 'DRAFT',
  SUBMITTED: 'SUBMITTED',
  UNDER_REVIEW: 'UNDER_REVIEW',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED',
  LIVE: 'LIVE',
  COMPLETED: 'COMPLETED',
  CANCELLED: 'CANCELLED',
} as const;

export const VETTING_STATUS = {
  PENDING: 'PENDING',
  TEAM_VERIFIED: 'TEAM_VERIFIED',
  CONTRACT_AUDITED: 'CONTRACT_AUDITED',
  LEGAL_COMPLIANT: 'LEGAL_COMPLIANT',
  TOKENOMICS_APPROVED: 'TOKENOMICS_APPROVED',
  COMMUNITY_VOTED: 'COMMUNITY_VOTED',
  FULLY_VETTED: 'FULLY_VETTED',
  FAILED: 'FAILED',
} as const;

export const SALE_TYPE = {
  FIXED_PRICE: 'FIXED_PRICE',
  DUTCH_AUCTION: 'DUTCH_AUCTION',
  SUBSCRIPTION: 'SUBSCRIPTION',
  LOTTERY: 'LOTTERY',
} as const;

export const SALE_STATUS = {
  UPCOMING: 'UPCOMING',
  WHITELIST_OPEN: 'WHITELIST_OPEN',
  WHITELIST_CLOSED: 'WHITELIST_CLOSED',
  SALE_LIVE: 'SALE_LIVE',
  SALE_ENDED: 'SALE_ENDED',
  ALLOCATION_DONE: 'ALLOCATION_DONE',
  DISTRIBUTION_DONE: 'DISTRIBUTION_DONE',
  CANCELLED: 'CANCELLED',
} as const;

export const ROUND_TYPE = {
  PRIVATE: 'PRIVATE',
  PUBLIC: 'PUBLIC',
  STRATEGIC: 'STRATEGIC',
  SEED: 'SEED',
} as const;

export const CLAIM_STATUS = {
  PENDING: 'PENDING',
  PROCESSING: 'PROCESSING',
  COMPLETED: 'COMPLETED',
  FAILED: 'FAILED',
} as const;

export const ALLOCATION_STATUS = {
  WHITELISTED: 'WHITELISTED',
  ALLOCATED: 'ALLOCATED',
  NOT_ALLOCATED: 'NOT_ALLOCATED',
  PURCHASED: 'PURCHASED',
  REFUNDED: 'REFUNDED',
  CANCELLED: 'CANCELLED',
} as const;

export const VESTING_TYPE = {
  LINEAR: 'LINEAR',
  MONTHLY: 'MONTHLY',
  QUARTERLY: 'QUARTERLY',
  MILESTONE: 'MILESTONE',
} as const;

export const WHITELIST_STATUS = {
  PENDING: 'PENDING',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED',
  EXPIRED: 'EXPIRED',
} as const;

export const BURN_TYPE = {
  MANUAL: 'MANUAL',
  BUYBACK: 'BUYBACK',
  FEE_BURN: 'FEE_BURN',
  PENALTY: 'PENALTY',
} as const;

export const VESTING_CATEGORY = {
  TEAM: 'TEAM',
  ADVISOR: 'ADVISOR',
  PRIVATE_SALE: 'PRIVATE_SALE',
  PUBLIC_SALE: 'PUBLIC_SALE',
  ECOSYSTEM: 'ECOSYSTEM',
} as const;

export const VESTING_STATUS = {
  ACTIVE: 'ACTIVE',
  COMPLETED: 'COMPLETED',
  REVOKED: 'REVOKED',
} as const;

export const BLOG_POST_STATUS = {
  DRAFT: 'draft',
  PUBLISHED: 'published',
  ARCHIVED: 'archived',
} as const;

export const CERTIFICATE_TYPE = {
  COURSE: 'course',
  PROGRAM: 'program',
  WEBINAR: 'webinar',
  ASSESSMENT: 'assessment',
} as const;

export const REVIEW_STATUS = {
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected',
} as const;

export const COURSE_LEVEL = {
  BEGINNER: 'beginner',
  INTERMEDIATE: 'intermediate',
  ADVANCED: 'advanced',
} as const;

export const COURSE_CATEGORY = {
  BEGINNER: 'beginner',
  INTERMEDIATE: 'intermediate',
  ADVANCED: 'advanced',
} as const;

export const DISCUSSION_TYPE = {
  QUESTION: 'question',
  DISCUSSION: 'discussion',
  ISSUE: 'issue',
} as const;

export const DISCUSSION_STATUS = {
  ACTIVE: 'active',
  CLOSED: 'closed',
  ARCHIVED: 'archived',
} as const;

export const ARTICLE_TYPE = {
  HOW_TO: 'how-to',
  GUIDE: 'guide',
  FAQ: 'faq',
  TROUBLESHOOTING: 'troubleshooting',
  TUTORIAL: 'tutorial',
} as const;

export const ARTICLE_DIFFICULTY = {
  BEGINNER: 'beginner',
  INTERMEDIATE: 'intermediate',
  ADVANCED: 'advanced',
} as const;

export const ARTICLE_STATUS = {
  DRAFT: 'draft',
  PUBLISHED: 'published',
  ARCHIVED: 'archived',
} as const;

export const LEARNING_PATH_LEVEL = {
  BEGINNER: 'beginner',
  INTERMEDIATE: 'intermediate',
  ADVANCED: 'advanced',
  MIXED: 'mixed',
} as const;

export const LESSON_TYPE = {
  VIDEO: 'video',
  ARTICLE: 'article',
  QUIZ: 'quiz',
  EXERCISE: 'exercise',
  CODE: 'code',
} as const;

export const VIDEO_PLATFORM = {
  YOUTUBE: 'youtube',
  VIMEO: 'vimeo',
  S3: 's3',
} as const;

export const COMPLETION_CRITERIA_TYPE = {
  VIEW: 'view',
  QUIZ: 'quiz',
  EXERCISE: 'exercise',
} as const;

export const QUIZ_TYPE = {
  LESSON: 'lesson',
  MODULE: 'module',
  COURSE: 'course',
  ASSESSMENT: 'assessment',
} as const;

export const QUESTION_TYPE = {
  MULTIPLE_CHOICE: 'multiple-choice',
  TRUE_FALSE: 'true-false',
  MULTIPLE_ANSWER: 'multiple-answer',
  TEXT: 'text',
} as const;

export const USER_LEARNING_PATH_STATUS = {
  ENROLLED: 'enrolled',
  IN_PROGRESS: 'in-progress',
  COMPLETED: 'completed',
  PAUSED: 'paused',
} as const;

export const PROGRESS_STATUS = {
  ENROLLED: 'enrolled',
  IN_PROGRESS: 'in-progress',
  COMPLETED: 'completed',
  DROPPED: 'dropped',
} as const;

export const WEBINAR_STATUS = {
  SCHEDULED: 'scheduled',
  LIVE: 'live',
  ENDED: 'ended',
  CANCELLED: 'cancelled',
} as const;

export const WEBINAR_PLATFORM = {
  ZOOM: 'zoom',
  YOUTUBE_LIVE: 'youtube-live',
  CUSTOM: 'custom',
} as const;

export const AFFILIATE_STATUS = {
  PENDING: 'pending',
  APPROVED: 'approved',
  ACTIVE: 'active',
  SUSPENDED: 'suspended',
  TERMINATED: 'terminated',
} as const;

export const AFFILIATE_PROGRAM_STATUS = {
  ACTIVE: 'active',
  PAUSED: 'paused',
  CLOSED: 'closed',
} as const;

export const AIRDROP_ALLOCATION_STATUS = {
  PENDING: 'pending',
  ELIGIBLE: 'eligible',
  CLAIMED: 'claimed',
  DISTRIBUTED: 'distributed',
  VESTING: 'vesting',
  EXPIRED: 'expired',
  REJECTED: 'rejected',
} as const;

export const AIRDROP_STATUS = {
  DRAFT: 'draft',
  SNAPSHOT_PENDING: 'snapshot_pending',
  SNAPSHOT_COMPLETED: 'snapshot_completed',
  CLAIMING_OPEN: 'claiming_open',
  CLAIMING_CLOSED: 'claiming_closed',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
} as const;

export const AIRDROP_TYPE = {
  TOKEN_HOLDER: 'token_holder',
  TRADER: 'trader',
  EARLY_USER: 'early_user',
  CONTEST_WINNER: 'contest_winner',
  PROMOTIONAL: 'promotional',
  GOVERNANCE: 'governance',
} as const;

export const CAMPAIGN_STATUS = {
  DRAFT: 'draft',
  SCHEDULED: 'scheduled',
  SENDING: 'sending',
  SENT: 'sent',
  PAUSED: 'paused',
  CANCELLED: 'cancelled',
} as const;

export const CAMPAIGN_TYPE = {
  WELCOME: 'welcome',
  ONBOARDING: 'onboarding',
  PROMOTIONAL: 'promotional',
  TRANSACTIONAL: 'transactional',
  NEWSLETTER: 'newsletter',
  RE_ENGAGEMENT: 're_engagement',
  PRICE_ALERT: 'price_alert',
  TRADING_SIGNAL: 'trading_signal',
  ABANDONED_CART: 'abandoned_cart',
  BIRTHDAY: 'birthday',
  ANNIVERSARY: 'anniversary',
  WIN_BACK: 'win_back',
} as const;

export const TRIGGER_TYPE = {
  MANUAL: 'manual',
  SCHEDULED: 'scheduled',
  EVENT_BASED: 'event_based',
  BEHAVIORAL: 'behavioral',
} as const;

export const EMAIL_STATUS = {
  QUEUED: 'queued',
  SENT: 'sent',
  DELIVERED: 'delivered',
  OPENED: 'opened',
  CLICKED: 'clicked',
  BOUNCED: 'bounced',
  FAILED: 'failed',
  UNSUBSCRIBED: 'unsubscribed',
  COMPLAINED: 'complained',
} as const;

export const TIER_LEVEL = {
  BRONZE: 'bronze',
  SILVER: 'silver',
  GOLD: 'gold',
  PLATINUM: 'platinum',
  DIAMOND: 'diamond',
} as const;

export const POINTS_TRANSACTION_TYPE = {
  EARNED: 'earned',
  REDEEMED: 'redeemed',
  EXPIRED: 'expired',
  BONUS: 'bonus',
  ADJUSTMENT: 'adjustment',
  REFUND: 'refund',
} as const;

export const POINTS_SOURCE = {
  TRADE: 'trade',
  DEPOSIT: 'deposit',
  REFERRAL: 'referral',
  SIGNUP_BONUS: 'signup_bonus',
  BIRTHDAY: 'birthday',
  ANNIVERSARY: 'anniversary',
  PROMOTION: 'promotion',
  CONTEST: 'contest',
  STREAK: 'streak',
  ACHIEVEMENT: 'achievement',
  ADMIN: 'admin',
  REDEMPTION: 'redemption',
} as const;

export const ATTRIBUTION_MODEL = {
  FIRST_TOUCH: 'first_touch',
  LAST_TOUCH: 'last_touch',
  LINEAR: 'linear',
  TIME_DECAY: 'time_decay',
  U_SHAPED: 'u_shaped',
  W_SHAPED: 'w_shaped',
} as const;

export const CONVERSION_TYPE = {
  REGISTRATION: 'registration',
  KYC_COMPLETION: 'kyc_completion',
  FIRST_DEPOSIT: 'first_deposit',
  FIRST_TRADE: 'first_trade',
  SUBSCRIPTION: 'subscription',
} as const;

export const CONTENT_TYPE = {
  BLOG_POST: 'blog_post',
  ARTICLE: 'article',
  NEWS: 'news',
  VIDEO: 'video',
  PODCAST: 'podcast',
  WEBINAR: 'webinar',
  TUTORIAL: 'tutorial',
  GUIDE: 'guide',
  CASE_STUDY: 'case_study',
} as const;

export const CONTENT_STATUS = {
  DRAFT: 'draft',
  REVIEW: 'review',
  SCHEDULED: 'scheduled',
  PUBLISHED: 'published',
  ARCHIVED: 'archived',
} as const;

export const PUSH_CAMPAIGN_STATUS = {
  DRAFT: 'draft',
  SCHEDULED: 'scheduled',
  SENDING: 'sending',
  SENT: 'sent',
  PAUSED: 'paused',
  CANCELLED: 'cancelled',
} as const;

export const PUSH_TYPE = {
  MARKETING: 'marketing',
  TRANSACTIONAL: 'transactional',
  ALERT: 'alert',
  NEWS: 'news',
  PRICE_ALERT: 'price_alert',
  TRADE_SIGNAL: 'trade_signal',
  PROMOTIONAL: 'promotional',
  FEATURE_ANNOUNCEMENT: 'feature_announcement',
} as const;

export const PUSH_STATUS = {
  QUEUED: 'queued',
  SENT: 'sent',
  DELIVERED: 'delivered',
  CLICKED: 'clicked',
  DISMISSED: 'dismissed',
  FAILED: 'failed',
  EXPIRED: 'expired',
} as const;

export const REFERRAL_STATUS = {
  PENDING: 'pending',
  ACTIVE: 'active',
  QUALIFIED: 'qualified',
  EXPIRED: 'expired',
  FRAUDULENT: 'fraudulent',
} as const;

export const REFERRAL_CAMPAIGN_STATUS = {
  DRAFT: 'draft',
  ACTIVE: 'active',
  PAUSED: 'paused',
  ENDED: 'ended',
} as const;

export const COMMISSION_TYPE = {
  PERCENTAGE: 'percentage',
  FIXED: 'fixed',
  TIERED: 'tiered',
} as const;

export const COMMISSION_STATUS = {
  PENDING: 'pending',
  APPROVED: 'approved',
  PAID: 'paid',
  REJECTED: 'rejected',
  EXPIRED: 'expired',
} as const;

export const COMMISSION_TRIGGER = {
  REGISTRATION: 'registration',
  FIRST_DEPOSIT: 'first_deposit',
  FIRST_TRADE: 'first_trade',
  TRADE_VOLUME: 'trade_volume',
  SUBSCRIPTION: 'subscription',
  RECURRING: 'recurring',
} as const;

export const ACHIEVEMENT_RARITY = {
  COMMON: 'COMMON',
  RARE: 'RARE',
  EPIC: 'EPIC',
  LEGENDARY: 'LEGENDARY',
} as const;

export const LISTING_TYPE = {
  FIXED_PRICE: 'FIXED_PRICE',
  AUCTION: 'AUCTION',
  BUNDLE: 'BUNDLE',
  DUTCH_AUCTION: 'DUTCH_AUCTION',
} as const;

export const LISTING_STATUS = {
  ACTIVE: 'ACTIVE',
  SOLD: 'SOLD',
  CANCELLED: 'CANCELLED',
  EXPIRED: 'EXPIRED',
} as const;

export const AD_TYPE = {
  BUY: 'buy',
  SELL: 'sell',
} as const;

export const AD_STATUS = {
  ACTIVE: 'active',
  INACTIVE: 'inactive',
  PAUSED: 'paused',
  DELETED: 'deleted',
} as const;

export const PAYMENT_METHOD_TYPE = {
  BANK_TRANSFER: 'bank_transfer',
  CASH: 'cash',
  PAYPAL: 'paypal',
  WISE: 'wise',
  VENMO: 'venmo',
  ZELLE: 'zelle',
  WESTERN_UNION: 'western_union',
  MONEYGRAM: 'moneygram',
  OTHER: 'other',
} as const;

export const DISPUTE_STATUS = {
  OPEN: 'open',
  UNDER_REVIEW: 'under_review',
  RESOLVED: 'resolved',
  CLOSED: 'closed',
} as const;

export const DISPUTE_REASON = {
  PAYMENT_NOT_RECEIVED: 'payment_not_received',
  PAYMENT_ISSUE: 'payment_issue',
  WRONG_AMOUNT: 'wrong_amount',
  SCAM_ATTEMPT: 'scam_attempt',
  OTHER: 'other',
} as const;

export const DISPUTE_RESOLUTION = {
  BUYER_WINS: 'buyer_wins',
  SELLER_WINS: 'seller_wins',
  PARTIAL_REFUND: 'partial_refund',
  CANCELLED: 'cancelled',
} as const;

export const TRADE_STATUS = {
  PENDING: 'pending', // Trade initiated, waiting for payment
  PAID: 'paid', // Buyer marked as paid, waiting seller confirmation
  COMPLETED: 'completed', // Seller released crypto
  CANCELLED: 'cancelled', // Trade cancelled
  DISPUTED: 'disputed', // Dispute opened
  REFUNDED: 'refunded', // Crypto refunded to seller (timeout or dispute)
  EXPIRED: 'expired', // Payment timeout
} as const;

export const MESSAGE_TYPE = {
  TEXT: 'text',
  IMAGE: 'image',
  FILE: 'file',
  SYSTEM: 'system',
  VIDEO: 'video',
  AUDIO: 'audio',
  TRADE_SHARE: 'trade_share',
} as const;

export const RATING_TYPE = {
  POSITIVE: 'positive',
  NEUTRAL: 'neutral',
  NEGATIVE: 'negative',
} as const;

export const CREDIT_GRADE = {
  A_PLUS: 'A+',
  A: 'A',
  B: 'B',
  C: 'C',
  D: 'D',
  F: 'F',
} as const;

export const LOAN_REQUEST_TYPE = {
  OFFER: 'OFFER',   // Lender offering money
  REQUEST: 'REQUEST', // Borrower requesting money
} as const;

export const LOAN_REQUEST_STATUS = {
  OPEN: 'OPEN',
  MATCHED: 'MATCHED',
  ACTIVE: 'ACTIVE',
  EXPIRED: 'EXPIRED',
  CANCELLED: 'CANCELLED',
} as const;

export const CHANNEL_POST_TYPE = {
  TEXT: 'text',
  IMAGE: 'image',
  VIDEO: 'video',
  SIGNAL: 'signal',
  ANALYSIS: 'analysis',
  POLL: 'poll',
} as const;

export const CHANNEL_TYPE = {
  PUBLIC: 'public',
  PRIVATE: 'private',
} as const;

export const CHANNEL_CATEGORY = {
  GENERAL: 'general',
  TRADING: 'trading',
  ANALYSIS: 'analysis',
  NEWS: 'news',
  EDUCATION: 'education',
  SIGNALS: 'signals',
} as const;

export const COMPETITION_STATUS = {
  DRAFT: 'draft',
  UPCOMING: 'upcoming',
  ACTIVE: 'active',
  ENDED: 'ended',
  CANCELLED: 'cancelled',
} as const;

export const COMPETITION_TYPE = {
  PNL: 'pnl',
  ROI: 'roi',
  WIN_RATE: 'win_rate',
  VOLUME: 'volume',
} as const;

export const PARTICIPANT_ROLE = {
  MEMBER: 'member',
  ADMIN: 'admin',
  OWNER: 'owner',
} as const;

export const CONVERSATION_TYPE = {
  PRIVATE: 'private',
  GROUP: 'group',
} as const;

export const COPY_TRADING_STATUS = {
  ACTIVE: 'active',
  PAUSED: 'paused',
  STOPPED: 'stopped',
} as const;

export const FOLLOW_STATUS = {
  PENDING: 'pending',
  ACCEPTED: 'accepted',
  BLOCKED: 'blocked',
} as const;

export const LIKE_TARGET_TYPE = {
  POST: 'post',
  COMMENT: 'comment',
  STORY: 'story',
} as const;

export const MEDIA_TYPE = {
  IMAGE: 'image',
  VIDEO: 'video',
  AUDIO: 'audio',
  DOCUMENT: 'document',
} as const;

export const MESSAGE_STATUS = {
  SENT: 'sent',
  DELIVERED: 'delivered',
  READ: 'read',
} as const;

export const SOCIAL_NOTIFICATION_TYPE = {
  FOLLOW: 'follow',
  LIKE: 'like',
  COMMENT: 'comment',
  MENTION: 'mention',
  MESSAGE: 'message',
  COPY_TRADE: 'copy_trade',
  COMPETITION: 'competition',
  ACHIEVEMENT: 'achievement',
  SYSTEM: 'system',
} as const;

export const POST_TYPE = {
  TEXT: 'text',
  IMAGE: 'image',
  VIDEO: 'video',
  TRADE_IDEA: 'trade_idea',
  ANALYSIS: 'analysis',
  POLL: 'poll',
  SHARED: 'shared',
} as const;

export const POST_VISIBILITY = {
  PUBLIC: 'public',
  FOLLOWERS: 'followers',
  PRIVATE: 'private',
} as const;

export const REPORT_REASON = {
  SPAM: 'spam',
  HARASSMENT: 'harassment',
  HATE_SPEECH: 'hate_speech',
  MISINFORMATION: 'misinformation',
  SCAM: 'scam',
  INAPPROPRIATE: 'inappropriate',
  COPYRIGHT: 'copyright',
  OTHER: 'other',
} as const;

export const REPORT_STATUS = {
  PENDING: 'pending',
  REVIEWING: 'reviewing',
  RESOLVED: 'resolved',
  DISMISSED: 'dismissed',
} as const;

export const REPORT_TARGET_TYPE = {
  POST: 'post',
  COMMENT: 'comment',
  USER: 'user',
  MESSAGE: 'message',
  CHANNEL: 'channel',
} as const;

export const STORY_TYPE = {
  IMAGE: 'image',
  VIDEO: 'video',
  TEXT: 'text',
} as const;

export const TRADER_LEVEL = {
  BEGINNER: 'beginner',
  INTERMEDIATE: 'intermediate',
  ADVANCED: 'advanced',
  EXPERT: 'expert',
  MASTER: 'master',
} as const;

export const AFFILIATE_CAMPAIGN_STATUS = {
  DRAFT: 'draft',
  PAUSED: 'paused',
  ACTIVE: 'active',
  COMPLETED: 'completed',
  REJECTED: 'rejected',
} as const;

export const BONUS_CAMPAIGN_TYPE = {
  SIGNUP: 'signup',
  FIRST_TRADE: 'first_trade',
  VOLUME_BASED: 'volume_based',
  LIMITED_TIME: 'limited_time',
  REFERRER_BONUS: 'referrer_bonus',
} as const;

export const BONUS_CAMPAIGN_STATUS = {
  DRAFT: 'draft',
  PAUSED: 'paused',
  ACTIVE: 'active',
  COMPLETED: 'completed',
} as const;

export const BONUS_CAMPAIGN_BONUS_TYPE = {
  FIXED: 'fixed',
  PERCENTAGE: 'percentage',
} as const;

export const PAYOUT_HISTORY_STATUS = {
  PENDING: 'pending',
  PROCESSING: 'processing',
  COMPLETED: 'completed',
  FAILED: 'failed',
  CANCELLED: 'cancelled'
} as const;

export const REFERRAL_TYPE = {
  STANDARD: 'standard',
  AFFILIATE: 'affiliate',
  VIP: 'vip'
} as const;

export const REFERRAL_COMMISSION_TYPE = {
  TRADING_FEE: 'trading_fee',
  SIGNUP_BONUS: 'signup_bonus',
  FIRST_TRADE_BONUS: 'first_trade_bonus',
  VOLUME_BONUS: 'volume_bonus',
  CAMPAIGN_BONUS: 'campaign_bonus',
} as const;

export const REFERRAL_COMMISSION_STATUS = {
  PENDING: 'pending',
  APPROVED: 'approved',
  PAID: 'paid',
  REJECTED: 'rejected',
} as const;

export const REFERRAL_RELATIONSHIP_STATUS = {
  ACTIVE: 'active',
  SUSPENDED: 'suspended',
  TERMINATED: 'terminated',
} as const;

export const ADDRESS_TYPE = {
  DEPOSIT: 'DEPOSIT',
  WITHDRAWAL: 'WITHDRAWAL',
  CHANGE: 'CHANGE',
  MULTISIG: 'MULTISIG',
} as const;

export const ADDRESS_CHAIN = {
  BITCOIN: 'BITCOIN',
  ETHEREUM: 'ETHEREUM',
  BSC: 'BSC',
  POLYGON: 'POLYGON',
  SOLANA: 'SOLANA',
} as const;

export const DEPOSIT_STATUS = {
  DETECTED: 'DETECTED',
  PENDING: 'PENDING',
  CONFIRMING: 'CONFIRMING',
  CONFIRMED: 'CONFIRMED',
  CREDITED: 'CREDITED',
  FAILED: 'FAILED',
} as const;

export const INTERMAL_TRANSFER_STATUS = {
  PENDING: 'PENDING',
  PROCESSING: 'PROCESSING',
  COMPLETED: 'COMPLETED',
  FAILED: 'FAILED',
  REVERSED: 'REVERSED',
} as const;

export const WALLET_TYPE = {
  HOT: 'HOT',
  COLD: 'COLD',
} as const;

export const WITHDRAWAL_STATUS = {
  PENDING: 'PENDING',
  PENDING_APPROVAL: 'PENDING_APPROVAL',
  APPROVED: 'APPROVED',
  PROCESSING: 'PROCESSING',
  COMPLETED: 'COMPLETED',
  REJECTED: 'REJECTED',
  CANCELLED: 'CANCELLED',
  FAILED: 'FAILED',
} as const;

export const WITHDRAWAL_RISK_LEVEL = {
  LOW: 'LOW',
  MEDIUM: 'MEDIUM',
  HIGH: 'HIGH',
  CRITICAL: 'CRITICAL',
} as const;

// Order Types
export const ORDER_TYPE = {
  MARKET: 'market',
  LIMIT: 'limit',
  STOP_LOSS: 'stop_loss',
  STOP_LIMIT: 'stop_limit',
  TRAILING_STOP: 'trailing_stop',
  ICEBERG: 'iceberg'
} as const;

// Order Sides
export const ORDER_SIDES = {
  BUY: 'buy',
  SELL: 'sell',
} as const;

// Order Status
export const ORDER_STATUS = {
  PENDING: 'pending',
  OPEN: 'open',
  PARTIALLY_FILLED: 'partially_filled',
  FILLED: 'filled',
  CANCELLED: 'cancelled',
  REJECTED: 'rejected',
  EXPIRED: 'expired'
} as const;

// Time in Force
export const TIME_IN_FORCE = {
  GTC: 'GTC', // Good Till Cancelled
  IOC: 'IOC', // Immediate or Cancel
  FOK: 'FOK', // Fill or Kill
  GTD: 'GTD'  // Good Till Date
} as const;

// Trading Types
export const TRADING_TYPE = {
  SPOT: 'spot',
  MARGIN: 'margin',
  FUTURES: 'futures',
  OPTIONS: 'options'
} as const;

// Margin Modes
export const MARGIN_MODES = {
  CROSS: 'cross',
  ISOLATED: 'isolated'
} as const;

// Assets Types
export const ASSET_TYPE = {
  CRYPTO: 'crypto',
  NFT: 'nft',
  RWA: 'rwa',
  TOKEN: 'token'
} as const;

export const DATA_SOURCE = {
  BINANCE: 'binance',
  COINGECKO: 'coingecko',
  INTERNAL: 'internal',
} as const;

// Transaction Types
export const TRANSACTION_TYPE = {
  TRANSFER: 'TRANSFER',
  STAKE: 'STAKE',
  UNSTAKE: 'UNSTAKE',
  REWARD: 'REWARD',
  BURN: 'BURN',
  MINT: 'MINT',
  AIRDROP: 'AIRDROP',
  VESTING_CLAIM: 'VESTING_CLAIM',
  FEE_PAYMENT: 'FEE_PAYMENT',
  BUYBACK: 'BUYBACK',
  DEPOSIT: 'DEPOSIT',
  WITHDRAWAL: 'WITHDRAWAL',
  TRANSFER_IN: 'TRANSFER_IN',
  TRANSFER_OUT: 'TRANSFER_OUT',
  TRADE: 'TRADE',
  SALE: 'SALE',
  AUCTION: 'AUCTION',
  OFFER: 'OFFER',
  BID: 'BID',
  INTERNAL_TRANSFER: 'INTERNAL_TRANSFER',
  FEE: 'FEE',
} as const;

// Transaction Status
export const TRANSACTION_STATUS = {
  PENDING: 'pending',
  PROCESSING: 'processing',
  COMPLETED: 'completed',
  CONFIRMED: 'confirmed',
  FAILED: 'failed',
  CANCELLED: 'cancelled',
} as const;

// Reward types
export const REWARD_TYPE = {
  TOKEN: 'token',
  FEE_DISCOUNT: 'fee_discount',
  PRIORITY_SUPPORT: 'priority_support',
  EARLY_ACCESS: 'early_access',
  NFT: 'nft',
  XP_BOOST: 'xp_boost',
  CUSTOM: 'custom',
  XP: 'xp',
  COINS: 'coins',
  BADGE: 'badge',
  DISCOUNT: 'discount',
  CASHBACK: 'cashback'
} as const;

// Login Status
export const LOGIN_STATUS = {
  SUCCESS: 'SUCCESS',
  FAILED: 'FAILED',
  BLOCKED: 'BLOCKED',
  SUSPICIOUS: 'SUSPICIOUS',
} as const;

// Api Key Permissions
export const API_KEY_PERMISSIONS = {
  READ: 'READ',
  TRADE: 'TRADE',
  WITHDRAW: 'WITHDRAW',
} as const;

// Bug Bounty Status
export const BUG_SEVERITY = {
  CRITICAL: 'CRITICAL',
  HIGH: 'HIGH',
  MEDIUM: 'MEDIUM',
  LOW: 'LOW',
  INFO: 'INFO',
} as const;

// Bug Bounty Status
export const BUGBOUNTY_STATUS = {
  SUBMITTED: 'SUBMITTED',
  TRIAGING: 'TRIAGING',
  ACCEPTED: 'ACCEPTED',
  REJECTED: 'REJECTED',
  RESOLVED: 'RESOLVED',
  REWARDED: 'REWARDED',
} as const;

// Cold Wallet Type
export const COLD_WALLET_TYPE = {
  MULTI_SIG: 'MULTI_SIG',
  HARDWARE: 'HARDWARE',
  PAPER: 'PAPER',
  OFFLINE: 'OFFLINE',
} as const;

// Cold Wallet Status
export const COLD_WALLET_STATUS = {
  ACTIVE: 'ACTIVE',
  INACTIVE: 'INACTIVE',
  MAINTENANCE: 'MAINTENANCE',
} as const;

// Incident Type
export const INCIDENT_TYPE = {
  SECURITY_BREACH: 'SECURITY_BREACH',
  UNAUTHORIZED_ACCESS: 'UNAUTHORIZED_ACCESS',
  SUSPICIOUS_ACTIVITY: 'SUSPICIOUS_ACTIVITY',
  WITHDRAWAL_ANOMALY: 'WITHDRAWAL_ANOMALY',
  API_ABUSE: 'API_ABUSE',
  DDOS_ATTACK: 'DDOS_ATTACK',
  SYSTEM_FAILURE: 'SYSTEM_FAILURE',
  OTHER: 'OTHER',
} as const;

// Incident Severity
export const INCIDENT_SEVERITY = {
  CRITICAL: 'CRITICAL',
  HIGH: 'HIGH',
  MEDIUM: 'MEDIUM',
  LOW: 'LOW',
} as const;

// Incident Status
export const INCIDENT_STATUS = {
  DETECTED: 'DETECTED',
  INVESTIGATING: 'INVESTIGATING',
  CONTAINED: 'CONTAINED',
  RESOLVED: 'RESOLVED',
  CLOSED: 'CLOSED',
} as const;

// Insurance Fund Transaction Type
export const INSURANCE_FUND_TRANSACTION_TYPE = {
  DEPOSIT: 'DEPOSIT',
  WITHDRAWAL: 'WITHDRAWAL',
  CLAIM: 'CLAIM',
  INTEREST: 'INTEREST',
} as const;

// Security Event Types
export const SECURITY_EVENT_TYPE = {
  LOGIN_ATTEMPT: 'LOGIN_ATTEMPT',
  NEW_DEVICE: 'NEW_DEVICE',
  PASSWORD_CHANGE: 'PASSWORD_CHANGE',
  EMAIL_CHANGE: 'EMAIL_CHANGE',
  WITHDRAWAL_REQUEST: 'WITHDRAWAL_REQUEST',
  API_KEY_CREATED: 'API_KEY_CREATED',
  API_KEY_DELETED: 'API_KEY_DELETED',
  TWO_FA_ENABLED: 'TWO_FA_ENABLED',
  TWO_FA_DISABLED: 'TWO_FA_DISABLED',
  WHITELIST_ADDRESS_ADDED: 'WHITELIST_ADDRESS_ADDED',
  SUSPICIOUS_ACTIVITY: 'SUSPICIOUS_ACTIVITY',
  ACCOUNT_LOCKED: 'ACCOUNT_LOCKED',
  ACCOUNT_UNLOCKED: 'ACCOUNT_UNLOCKED',
  LOGIN_SUCCESS: 'LOGIN_SUCCESS',
  LOGIN_FAILED: 'LOGIN_FAILED',
  LOGIN_BLOCKED: 'LOGIN_BLOCKED',
  LOGOUT: 'LOGOUT',
  PASSWORD_CHANGED: 'PASSWORD_CHANGED',
  PASSWORD_RESET_REQUESTED: 'PASSWORD_RESET_REQUESTED',
  TWO_FACTOR_ENABLED: 'TWO_FACTOR_ENABLED',
  TWO_FACTOR_DISABLED: 'TWO_FACTOR_DISABLED',
  WITHDRAWAL_INITIATED: 'WITHDRAWAL_INITIATED',
  WITHDRAWAL_APPROVED: 'WITHDRAWAL_APPROVED',
  WITHDRAWAL_REJECTED: 'WITHDRAWAL_REJECTED',
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
  UNAUTHORIZED_ACCESS: 'UNAUTHORIZED_ACCESS',
  INVALID_TOKEN: 'INVALID_TOKEN',
  CSRF_DETECTED: 'CSRF_DETECTED',
  XSS_ATTEMPT: 'XSS_ATTEMPT',
  SQL_INJECTION_ATTEMPT: 'SQL_INJECTION_ATTEMPT',
  KYC_SUBMITTED: 'KYC_SUBMITTED',
  KYC_APPROVED: 'KYC_APPROVED',
  KYC_REJECTED: 'KYC_REJECTED',
  LARGE_TRANSACTION: 'LARGE_TRANSACTION',
  UNUSUAL_PATTERN: 'UNUSUAL_PATTERN',
  IP_BLACKLISTED: 'IP_BLACKLISTED',
  DEVICE_CHANGED: 'DEVICE_CHANGED',
} as const;

// Risk Levels
export const RISK_LEVELS = {
  LOW: 'LOW',
  MEDIUM: 'MEDIUM',
  HIGH: 'HIGH',
  CRITICAL: 'CRITICAL',
} as const;

// White List Status
export const WHITE_LIST_STATUS = {
  PENDING: 'PENDING',
  ACTIVE: 'ACTIVE',
  REVOKED: 'REVOKED',
} as const;

// Notification Delivery Status

export const DELIVERY_STATUS = {
  SENT: 'sent',
  DELIVERED: 'delivered',
  FAILED: 'failed',
  BOUNCED: 'bounced',
  OPENED: 'opened',
  CLICKED: 'clicked',
} as const;

// Notification Channel
export const NOTIFICATION_CHANNELS = {
  EMAIL: 'email',
  SMS: 'sms',
  PUSH: 'push',
  IN_APP: 'in_app',
  TELEGRAM: 'telegram',
  DISCORD: 'discord',
  WHATSAPP: 'whatsapp'
} as const;

// Notification Status
export const NOTIFICAION_STATUS = {
  PENDING: 'pending',
  PROCESSING: 'processing',
  SENT: 'sent',
  DELIVERED: 'delivered',
  FAILED: 'failed',
  CANCELLED: 'cancelled',
} as const;

// Notification Types
export const NOTIFICATION_TYPE = {
  TRANSACTIONAL: 'transactional',
  SECURITY: 'security',
  MARKETING: 'marketing',
  PRICE_ALERT: 'price_alert',
  TRADING_SIGNAL: 'trading_signal',
  KYC_UPDATE: 'kyc_update',
  NEWS: 'news',
  COMMON: 'common',
  INFO: 'info'
} as const;

// Notification Priority
export const NOTIFICATION_PRIORITY = {
  CRITICAL: 0,
  HIGH: 1,
  MEDIUM: 2,
  LOW: 3,
} as const;

// Device Platform
export const DEVICE_PLATFORM = {
  IOS: 'ios',
  ANDROID: 'android',
  WEB: 'web',
} as const;

// HTTP Status Codes
export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_SERVER_ERROR: 500,
  SERVICE_UNAVAILABLE: 503,
} as const;

// Rate Limiting
export const RATE_LIMITS = {
  PUBLIC_API: { windowMs: 60000, max: 100 },
  AUTHENTICATED_API: { windowMs: 60000, max: 600 },
  TRADING_API: { windowMs: 1000, max: 10 },
  WEBSOCKET: { windowMs: 1000, max: 5 },
} as const;

// Pagination Defaults
export const PAGINATION = {
  DEFAULT_PAGE: 1,
  DEFAULT_LIMIT: 20,
  MAX_LIMIT: 100,
} as const;

// Redis Key Prefixes
export const REDIS_KEYS = {
  SESSION: 'session:',
  USER_CACHE: 'user:cache:',
  RATE_LIMIT: 'rate:limit:',
  ORDER_BOOK: 'orderbook:',
  TICKER: 'ticker:',
  MARKET_DATA: 'market:',
  NOTIFICATION_QUEUE: 'notification:queue:',
} as const;


