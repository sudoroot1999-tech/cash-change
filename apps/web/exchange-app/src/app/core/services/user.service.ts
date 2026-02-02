import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthService } from './auth.service';
import { ApiResponse, User, UserLimits, UserPreferences, UserProfile } from '@/libs/types';

export interface createUserRequest {
  email: string;
  username: string;
  password: string;
  referralCode?: string;
  phone?: string;
  phishingCode?: string;
}

export interface UpdateUserRequest {
  username?: string;
  phone?: string;
}

export interface UpdateProfileRequest {
  firstName?: string;
  lastName?: string;
  dateOfBirth?: Date;
  country?: string;
  city?: string;
  address?: string;
  postalCode?: string;
  bio?: string;
}

export interface UserProfileResponse {
  profile: UserProfile;
  preferences: UserPreferences;
  limits: UserLimits;
}


@Injectable({
  providedIn: 'root',
})
export class UserService {
  private readonly http = inject(HttpClient);
  private readonly API_BASE_URL = `${environment.apiUrl}`;

  /**
   * Get current user
   */
  getUser(): Observable<User> {
    return this.http.get<ApiResponse<User>>(`${this.API_BASE_URL}/users`).pipe(
      map((response) => response.data),
    );
  }

  /**
 * Create user
 */
  createUser(data: createUserRequest): Observable<User> {
    return this.http.post<ApiResponse<User>>(`${this.API_BASE_URL}/users`, data).pipe(
      map((response) => response.data)
    );
  }

  /**
   * Update user
   */
  updateUser(updates: UpdateUserRequest, userId: string): Observable<User> {
    return this.http.put<ApiResponse<User>>(`${this.API_BASE_URL}/users/${userId}`, updates).pipe(
      map((response) => response.data)
    );
  }

  /**
  * Verify User Email
  */
  verifyEmail(token: string): Observable<string> {
    if (!token) {
      throw new Error('User not authenticated');
    }

    return this.http.post<ApiResponse<string>>(`${this.API_BASE_URL}/users/verify-email`, { token }).pipe(
      map((response) => response.data),
    );
  }

  /**
   * Get user profile
   */
  getProfile(): Observable<UserProfileResponse> {
    return this.http.get<ApiResponse<UserProfileResponse>>(`${this.API_BASE_URL}/users/profile`).pipe(
      map((response) => response.data),
    );
  }

  /**
   * Update user profile
   */
  updateProfile(updates: UpdateProfileRequest, userId: string): Observable<UserProfile> {
    return this.http.put<ApiResponse<UserProfile>>(`${this.API_BASE_URL}/users/profile/${userId}`, updates).pipe(
      map((response) => response.data),
    );
  }

  /**
   * Update user preferences
   */
  updatePreferences(preferences: Record<string, unknown>): Observable<UserProfile> {
    return this.http.patch<ApiResponse<UserProfile>>(`${this.API_BASE_URL}/users/preferences`, preferences).pipe(
      map((response) => response.data),
    );
  }

  /**
  * Upload avatar
  */
  uploadAvatar(file: File): Observable<string> {
    return this.http.post<ApiResponse<string>>(`${this.API_BASE_URL}/users/upload-avatar`, file).pipe(
      map(response => response.data)
    );
  }
}

