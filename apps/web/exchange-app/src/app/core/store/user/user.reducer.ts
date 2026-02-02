import { createFeature, createReducer, on } from '@ngrx/store';
import { User, UserLimits, UserPreferences, UserProfile } from '@/libs/types';
import { createUser, createUserFailure, createUserSuccess, loadUser, loadUserFailure, loadUserSuccess, setUser } from './user.actions';

export interface UserState {
    loading: boolean;
    user: User | null;
    profile: UserProfile | null;
    preferrences: UserPreferences | null;
    limits: UserLimits | null;
    error: any | null;
}

export const initialState: UserState = {
    user: null,
    loading: false,
    profile: null,
    preferrences: null,
    limits: null,
    error: null
};

export const userFeature = createFeature({
    name: 'user',
    reducer: createReducer(
        initialState,
        on(setUser, (state, { user }) => ({
            ...state,
            user
        })),
        on(loadUser, state => ({
            ...state,
            loading: true,
            error: null
        })),

        on(loadUserSuccess, (state, { user, profile, preferences, limits }) => ({
            ...state,
            loading: false,
            user,
            profile,
            preferrences: preferences,
            limits
        })),

        on(loadUserFailure, (state, { error }) => ({
            ...state,
            loading: false,
            error
        })),
        on(createUser, (state) => ({
            ...state,
            loading: true
        })),
        on(createUserSuccess, (state, { user }) => ({
            ...state,
            loading: false,
            user
        })),
        on(createUserFailure, (state, { error }) => ({
            ...state,
            loading: false,
            error
        })),
    )
});
