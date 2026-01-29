import { updateKycLevelSuccess, updateStatusSuccess } from "./user.action";

export const userReducer = createReducer(
    initialAuthState,

    on(updateKycLevelSuccess, (state, { user }) => ({
        ...state,
        user,
    })),

    on(updateStatusSuccess, (state, { user }) => ({
        ...state,
        user,
    }))
);
