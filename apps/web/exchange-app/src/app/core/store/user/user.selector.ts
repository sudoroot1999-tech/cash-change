export const USER_FEATURE_KEY = 'user';

// Feature Selector
export const selectAuthState =
    createFeatureSelector<UserState>(USER_FEATURE_KEY);

// Core Selectors
export const selectAuthLoading = createSelector(
    selectAuthState,
    state => state.loading
);

export const selectIsAuthenticated = createSelector(
    selectAuthState,
    state => state.isAuthenticated
);

export const selectUser = createSelector(
    selectAuthState,
    state => state.user
);

// User-Level Selectors
export const selectUserId = createSelector(
    selectUser,
    user => user?.id ?? null
);

export const selectUserEmail = createSelector(
    selectUser,
    user => user?.email ?? null
);

export const selectUsername = createSelector(
    selectUser,
    user => user?.username ?? null
);

// Status & KYC
export const selectUserStatus = createSelector(
    selectUser,
    user => user?.status ?? null
);

export const selectKycLevel = createSelector(
    selectUser,
    user => user?.kycLevel ?? null
);

export const selectKycStatus = createSelector(
    selectUser,
    user => user?.kycStatus ?? null
);

// Security - Flags Selectors
export const selectIsTwoFactorEnabled = createSelector(
    selectUser,
    user => user?.twoFactorEnabled ?? false
);

export const selectEmailVerified = createSelector(
    selectUser,
    user => user?.emailVerified ?? false
);

export const selectPhoneVerified = createSelector(
    selectUser,
    user => user?.phoneVerified ?? false
);

// Business / Risk / Fee Selectors
export const selectUserTier = createSelector(
    selectUser,
    user => user?.tier ?? null
);

export const selectFeeTier = createSelector(
    selectUser,
    user => user?.feeTier ?? null
);

export const selectReferralCode = createSelector(
    selectUser,
    user => user?.referralCode ?? null
);

export const selectUserSummary = createSelector(
    selectUser,
    user =>
        user
            ? {
                username: user.username,
                tier: user.tier,
                kycLevel: user.kycLevel,
                status: user.status,
            }
            : null
);


// 
export const selectCanAccessAdvancedFeatures = createSelector(
    selectIsAuthenticated,
    selectKycLevel,
    selectUserStatus,
    (isAuth, kycLevel, status) =>
        isAuth && (kycLevel ?? 0) >= 0 && status === 'ACTIVE'
);

//
export const selectIsOnKycPage = createSelector(
    selectRouterState,
    router => router.state?.url?.includes('/kyc') ?? false
);





