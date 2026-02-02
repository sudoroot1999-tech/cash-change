import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { Store } from '@ngrx/store';
import { User, UserLimits, UserPreferences, UserProfile } from '@/libs/types';
import { selectError, selectLimits, selectLoading, selectPreferences, selectProfile, selectUser } from './user.selectors';
import { USER_EVENT_TYPE, UserEventBus } from './user-event-bus';
import { createUserRequest } from '@services/user.service';
import { setUser } from './user.actions';

@Injectable({ providedIn: 'root' })
export class UserFacade {
    private readonly userSubject =
        new BehaviorSubject<User | null>(null);

    private readonly profileSubject =
        new BehaviorSubject<UserProfile | null>(null);

    private readonly preferencesSubject =
        new BehaviorSubject<UserPreferences | null>(null);

    private readonly limitsSubject =
        new BehaviorSubject<UserLimits | null>(null);

    private readonly loadingSubject =
        new BehaviorSubject<boolean>(false);

    private readonly errorSubject =
        new BehaviorSubject<any | null>(null);

    readonly user$ = this.userSubject.asObservable();
    readonly profile$ = this.profileSubject.asObservable();
    readonly preferences$ = this.preferencesSubject.asObservable();
    readonly limits$ = this.limitsSubject.asObservable();
    readonly loading$ = this.loadingSubject.asObservable();
    readonly error$ = this.errorSubject.asObservable();

    constructor(
        private store: Store,
        private events: UserEventBus
    ) {
        this.store.select(selectUser)
            .subscribe(user => this.userSubject.next(user));
        this.store.select(selectProfile)
            .subscribe(profile => this.profileSubject.next(profile));
        this.store.select(selectPreferences)
            .subscribe(preferences => this.preferencesSubject.next(preferences));
        this.store.select(selectLimits)
            .subscribe(limits => this.limitsSubject.next(limits));
        this.store.select(selectLoading)
            .subscribe(loading => this.loadingSubject.next(loading));
        this.store.select(selectError)
            .subscribe(error => this.errorSubject.next(error));
    }

    setUser(dto: User) {
        this.store.dispatch(setUser({ user: dto }));
    }

    createUser(dto: createUserRequest) {
        this.events.emit(USER_EVENT_TYPE.CREATE_USER, dto);
    }

    updateProfile(profile: any) {
        this.events.emit(USER_EVENT_TYPE.UPDATE_PROFILE, profile);
    }

    updatePreferences(prefs: any) {
        this.events.emit(USER_EVENT_TYPE.UPDATE_PREFERENCES, prefs);
    }

    updateLimits(limits: any) {
        this.events.emit(USER_EVENT_TYPE.UPDATE_LIMITS, limits);
    }

    deleteUser(id: string) {
        this.events.emit(USER_EVENT_TYPE.DELETE_USER, { id });
    }

    loadUser() {
        this.events.emit(USER_EVENT_TYPE.GET_USER);
    }

    loadProfile() {
        this.events.emit(USER_EVENT_TYPE.GET_PROFILE);
    }
}
