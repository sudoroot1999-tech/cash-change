import { AuthenticatedUser, UserStatus } from "@/libs/types";
import { selectIsAuthenticated, selectKycLevel, selectUser, selectUserStatus } from "./user.selector";

@Injectable({ providedIn: 'root' })
export class UserFacade {
    // 🔹 full user
    private readonly userSubject =
        new BehaviorSubject<AuthenticatedUser | null>(null);

    // 🔹 granular subjects
    private readonly statusSubject =
        new BehaviorSubject<UserStatus | null>(null);

    private readonly kycLevelSubject =
        new BehaviorSubject<number | null>(null);

    // 🔹 public streams
    readonly user$ = this.userSubject.asObservable();
    readonly status$ = this.statusSubject.asObservable();
    readonly kycLevel$ = this.kycLevelSubject.asObservable();

    readonly isAuthenticated$ =
        this.store.select(selectIsAuthenticated);

    constructor(private store: Store) {
        // user
        this.store.select(selectUser)
            .subscribe(user => this.userSubject.next(user));

        // status
        this.store.select(selectUserStatus)
            .subscribe(status => this.statusSubject.next(status));

        // kyc level
        this.store.select(selectKycLevel)
            .subscribe(level => this.kycLevelSubject.next(level));
    }

    loadUser() {
        this.store.dispatch(loadUser());
    }

    logout() {
        this.store.dispatch(logout());
    }

    // 🔥 sync access
    get statusSnapshot(): UserStatus | null {
        return this.statusSubject.value;
    }

    get kycLevelSnapshot(): number | null {
        return this.kycLevelSubject.value;
    }
}
