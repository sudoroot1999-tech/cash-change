import { UserService } from "../../services/user-service/user.service";
import { updateKycLevel, updateKycLevelSuccess, updateStatus, updateStatusSuccess } from "./user.action";

@Injectable()
export class UserEffects {

    updateKycLevel$ = createEffect(() =>
        this.actions$.pipe(
            ofType(updateKycLevel),
            switchMap(({ level }) =>
                this.api.updateKycLevel(level).pipe(
                    map(user => updateKycLevelSuccess({ user })),
                    catchError(() => EMPTY)
                )
            )
        )
    );

    updateStatus$ = createEffect(() =>
        this.actions$.pipe(
            ofType(updateStatus),
            switchMap(({ status }) =>
                this.api.updateStatus(status).pipe(
                    map(user => updateStatusSuccess({ user })),
                    catchError(() => EMPTY)
                )
            )
        )
    );

    constructor(
        private actions$: Actions,
        private api: UserService
    ) { }
}
