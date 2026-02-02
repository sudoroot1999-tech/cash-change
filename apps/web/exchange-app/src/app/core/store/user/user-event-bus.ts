import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';

export const USER_EVENT_TYPE = {
    CREATE_USER: 'create-user',
    UPDATE_USER: 'update-user',
    GET_USER: 'get-user',
    DELETE_USER: 'delete-user',
    GET_PROFILE: 'get-profile',
    UPDATE_PROFILE: 'update-profile',
    UPDATE_PREFERENCES: 'update-preferences',
    UPDATE_LIMITS: 'update-limits',
}

export type UserEventType = (typeof USER_EVENT_TYPE)[keyof typeof USER_EVENT_TYPE];

export interface UserEvent<T = any> {
    type: UserEventType;
    payload?: T;
}

@Injectable({ providedIn: 'root' })
export class UserEventBus {
    private readonly subject = new Subject<UserEvent>();
    readonly events$ = this.subject.asObservable();

    emit<T>(type: UserEventType, payload?: T) {
        this.subject.next({ type, payload });
    }
}
