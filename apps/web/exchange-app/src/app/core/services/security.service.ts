import { environment } from "@/environments/environment";
import { ApiResponse } from "@/libs/types";
import { HttpClient } from "@angular/common/http";
import { inject, Injectable } from "@angular/core";
import { map, Observable } from "rxjs";

@Injectable({
    providedIn: 'root'
})
export class SecurityService {
    private readonly http = inject(HttpClient);
    private readonly API_BASE_URL = `${environment.apiUrl}`;

    /**
    * Get user's anti-phishing code
    */
    getAntiPhishingCode(): Observable<{ phishingCode: string } | null> {
        return this.http.get<ApiResponse<{ phishingCode: string } | null>>(`${this.API_BASE_URL}/security/anti-phishing/code`).pipe(
            map((response) => response.data),
        );
    }

    /**
    * Set user anti-phishing code
    */
    setAntiPhishingCode(phishingCode: string): Observable<{ phishingCode: string, isActive: boolean } | null> {
        return this.http.post<ApiResponse<{ phishingCode: string, isActive: boolean } | null>>(`${this.API_BASE_URL}/security/anti-phishing/set`, {
            phishingCode
        }).pipe(
            map((response) => response.data),
        );
    }

    /**
    * Generate random anti-phishing code
    */
    getRandomAntiPhishingCode(): Observable<{ suggestedCode: string }> {
        return this.http.get<ApiResponse<{ suggestedCode: string }>>(`${this.API_BASE_URL}/security/anti-phishing/suggest`).pipe(
            map((response) => response.data),
        );
    }

    /**
    * Create Session
    */
    createSession(phishingCode: string): Observable<{ phishingCode: string, isActive: boolean } | null> {
        return this.http.post<ApiResponse<{ phishingCode: string, isActive: boolean } | null>>(`${this.API_BASE_URL}/security/anti-phishing/set`, {
            phishingCode
        }).pipe(
            map((response) => response.data),
        );
    }

    /**
    * Kill Current Session
    */
    killCurrentSession(): Observable<string> {
        return this.http.delete<ApiResponse<string>>(`${this.API_BASE_URL}/security/login/sessions`).pipe(
            map((response) => response.data),
        );
    }

}