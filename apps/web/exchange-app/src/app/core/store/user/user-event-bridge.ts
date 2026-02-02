import { Injectable } from '@angular/core';
import { Store } from '@ngrx/store';
import { USER_EVENT_TYPE, UserEventBus } from './user-event-bus';
import {
    loadUser,
    createUser,
    updateUser,
    deleteUser,
    updateProfile,
    updatePreferences,
    updateLimits,
    loadProfile,
} from './user.actions';

@Injectable({ providedIn: 'root' })
export class UserEventBridge {
    constructor(
        private store: Store,
        private events: UserEventBus
    ) {
        this.events.events$.subscribe(e => {
            switch (e.type) {
                case USER_EVENT_TYPE.GET_USER:
                    this.store.dispatch(loadUser());
                    break;
                case USER_EVENT_TYPE.CREATE_USER:
                    this.store.dispatch(createUser({ user: e.payload }));
                    break;
                case USER_EVENT_TYPE.UPDATE_USER:
                    this.store.dispatch(updateUser({ dto: e.payload }));
                    break;
                case USER_EVENT_TYPE.DELETE_USER:
                    this.store.dispatch(deleteUser({ id: e.payload.id }));
                    break;
                case USER_EVENT_TYPE.GET_PROFILE:
                    this.store.dispatch(loadProfile());
                    break;
                case USER_EVENT_TYPE.UPDATE_PROFILE:
                    this.store.dispatch(updateProfile({ profile: e.payload }));
                    break;
                case USER_EVENT_TYPE.UPDATE_PREFERENCES:
                    this.store.dispatch(updatePreferences({ prefs: e.payload }));
                    break;
                case USER_EVENT_TYPE.UPDATE_LIMITS:
                    this.store.dispatch(updateLimits({ limits: e.payload }));
                    break;
            }
        });
    }
}
