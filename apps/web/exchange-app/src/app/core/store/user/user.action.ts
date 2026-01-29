export const updateKycLevel = createAction(
    '[Auth] Update KYC Level',
    props<{ level: number }>()
);

export const updateKycLevelSuccess = createAction(
    '[Auth] Update KYC Level Success',
    props<{ user: AuthenticatedUser }>()
);

export const updateStatus = createAction(
    '[Auth] Update Status',
    props<{ status: UserStatus }>()
);

export const updateStatusSuccess = createAction(
    '[Auth] Update Status Success',
    props<{ user: AuthenticatedUser }>()
);
