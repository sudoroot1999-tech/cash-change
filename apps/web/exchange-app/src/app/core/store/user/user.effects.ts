import { Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { concatMap, map, catchError, switchMap } from 'rxjs/operators';
import { forkJoin, of } from 'rxjs';
import {
    loadUser,
    loadUserSuccess,
    loadUserFailure,
    updateProfile,
    updatePreferences,
    updateLimits,
    createUser,
    deleteUser,
    createUserSuccess,
    createUserFailure,
    loadProfile,
    loadProfileSuccess,
    loadProfileFailure,
} from './user.actions';
import { UserService } from '@services/user.service';
import { SecurityService } from '@services/security.service';

@Injectable()
export class UserEffects {
    constructor(
        private actions$: Actions,
        private userService: UserService,
        private securityService: SecurityService
    ) { }

    loadUser$ = createEffect(() =>
        this.actions$.pipe(
            ofType(loadUser),
            switchMap(() =>
                forkJoin({
                    user: this.userService.getUser(),
                    profileBundle: this.userService.getProfile(),
                }).pipe(
                    map(({ user, profileBundle }) =>
                        loadUserSuccess({
                            user,
                            profile: profileBundle.profile,
                            preferences: profileBundle.preferences,
                            limits: profileBundle.limits,
                        })
                    ),
                    catchError(error =>
                        of(loadUserFailure({ error }))
                    )
                )
            )
        )
    );

    loadProfile$ = createEffect(() =>
        this.actions$.pipe(
            ofType(loadProfile),
            switchMap(() => this.userService.getProfile().pipe(
                map((data) =>
                    loadProfileSuccess({
                        profile: data.profile,
                        preferences: data.preferences,
                        limits: data.limits,
                    })
                ),
                catchError(error =>
                    of(loadProfileFailure({ error }))
                )
            )
            )
        )
    );


    // updateProfile$ = createEffect(() =>
    //     this.actions$.pipe(
    //         ofType(updateProfile),
    //         concatMap(({ profile }) =>
    //             this.api.updateProfile(profile).pipe(
    //                 map(() => loadUser()) // ⬅️ ترتیب: اول update، بعد reload
    //             )
    //         )
    //     )
    // );

    // updatePreferences$ = createEffect(() =>
    //     this.actions$.pipe(
    //         ofType(updatePreferences),
    //         concatMap(({ prefs }) =>
    //             this.api.updatePreferences(prefs).pipe(
    //                 map(() => loadUser())
    //             )
    //         )
    //     )
    // );

    // updateLimits$ = createEffect(() =>
    //     this.actions$.pipe(
    //         ofType(updateLimits),
    //         concatMap(({ limits }) =>
    //             this.api.updateLimits(limits).pipe(
    //                 map(() => loadUser())
    //             )
    //         )
    //     )
    // );

    createUser$ = createEffect(() =>
        this.actions$.pipe(
            ofType(createUser),
            concatMap(({ user }) =>
                this.securityService.getRandomAntiPhishingCode().pipe(
                    switchMap((data) =>
                        this.userService.createUser({
                            ...user,
                            phishingCode: data?.suggestedCode,
                        })
                    ),
                    map((user) =>
                        createUserSuccess({ user })
                    ),
                    catchError((error) =>
                        of(createUserFailure({ error }))
                    )
                )
            )
        )
    );



    // deleteUser$ = createEffect(() =>
    //     this.actions$.pipe(
    //         ofType(deleteUser),
    //         concatMap(({ id }) =>
    //             this.api.deleteUser(id).pipe(
    //                 map(() => loadUser())
    //             )
    //         )
    //     )
    // );
}
