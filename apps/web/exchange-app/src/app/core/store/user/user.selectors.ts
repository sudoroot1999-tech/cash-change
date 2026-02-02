import { createFeatureSelector, createSelector } from '@ngrx/store';
import { UserState } from './user.reducer';

export const selectUserState =
    createFeatureSelector<UserState>('user');

export const selectUser =
    createSelector(selectUserState, s => s.user);

export const selectProfile =
    createSelector(selectUserState, s => s.profile);

export const selectPreferences =
    createSelector(selectUserState, s => s.preferrences);

export const selectLimits =
    createSelector(selectUserState, s => s.limits);

export const selectLoading =
    createSelector(selectUserState, s => s.loading);

export const selectError =
    createSelector(selectUserState, s => s.error);

export const selectFullUser =
    createSelector(selectUserState, s => ({
        user: s.user,
        limits: s.limits,
        preferences: s.preferrences,
        profile: s.profile
    }));
