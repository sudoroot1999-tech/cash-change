import { createAction, props } from '@ngrx/store';
import { User, UserLimits, UserPreferences, UserProfile } from '@libs/types';
import { createUserRequest } from '@services/user.service';

// set
export const setUser = createAction(
    '[User] Set',
    props<{ user: User }>()
)

// load
export const loadUser = createAction('[User-Api] Load User');

export const loadUserSuccess = createAction(
    '[User-Api] Load Success',
    props<{
        user: User;
        profile: UserProfile;
        preferences: UserPreferences;
        limits: UserLimits;
    }>()
);
export const loadUserFailure = createAction(
    '[User-Api] Load Failure',
    props<{ error: any }>()
);

// create
export const createUser = createAction(
    '[User-Api] Create',
    props<{ user: createUserRequest }>()
);
export const createUserSuccess = createAction(
    '[User-Api] Create Success',
    props<{ user: User }>()
);
export const createUserFailure = createAction(
    '[User-Api] Create Failure',
    props<{ error: any }>()
);

// update
export const updateUser = createAction(
    '[User-Api] Update',
    props<{ dto: any }>()
);

// delete
export const deleteUser = createAction(
    '[User-Api] Delete',
    props<{ id: string }>()
);

// profile
export const updateProfile = createAction(
    '[User-Api] Update Profile',
    props<{ profile: any }>()
);

export const loadProfile = createAction(
    '[User-Api] Load Profile'
);

export const loadProfileSuccess = createAction(
    '[User-Api] Load Profile Success',
    props<{
        profile: UserProfile;
        preferences: UserPreferences;
        limits: UserLimits;
    }>()
);

export const loadProfileFailure = createAction(
    '[User-Api] Load Profile Failure',
    props<{ error: any }>()
);

// preferences
export const updatePreferences = createAction(
    '[User-Api] Update Preferences',
    props<{ prefs: any }>()
);

// limits
export const updateLimits = createAction(
    '[User-Api] Update Limits',
    props<{ limits: any }>()
);
