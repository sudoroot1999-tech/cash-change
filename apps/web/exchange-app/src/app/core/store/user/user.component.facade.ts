import { updateKycLevel, updateStatus } from "./user.action";

@Injectable({ providedIn: 'root' })
export class UserComponentFacade {
    constructor(private store: Store) { }

    updateKycLevel(level: number) {
        this.store.dispatch(updateKycLevel({ level }));
    }

    updateStatus(status: UserStatus) {
        this.store.dispatch(updateStatus({ status }));
    }
}
