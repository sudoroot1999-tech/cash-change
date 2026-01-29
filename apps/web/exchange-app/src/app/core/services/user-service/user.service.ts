import { AuthenticatedUser, UserStatus } from "@/libs/types";

@Injectable({ providedIn: 'root' })
export class UserService {
    constructor(private http: HttpClient) { }

    me() {
        return this.http.get<AuthenticatedUser>('/api/auth/me');
    }

    updateKycLevel(level: number) {
        return this.http.patch<AuthenticatedUser>(
            '/api/auth/kyc-level',
            { level }
        );
    }

    updateStatus(status: UserStatus) {
        return this.http.patch<AuthenticatedUser>(
            '/api/auth/status',
            { status }
        );
    }
}
