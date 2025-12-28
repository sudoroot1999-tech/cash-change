import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthService, User } from './auth.service';

export interface UserProfile {
  id: string;
  userId: string;
  firstName: string | null;
  lastName: string | null;
  dateOfBirth: Date | null;
  country: string | null;
  city: string | null;
  address: string | null;
  postalCode: string | null;
  avatarUrl: string | null;
  bio: string | null;
  preferences: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
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

@Injectable({
  providedIn: 'root',
})
export class UserService {
  private readonly http = inject(HttpClient);
  private readonly authService = inject(AuthService);
  private readonly API_URL = `${environment.apiUrl}/users`;

  /**
   * Get current user
   */
  getCurrentUser(): Observable<User> {
    return this.http.get<User>(this.API_URL).pipe(
      map((user) => {
        // Update auth service user
        this.authService.updateUser(user);
        return user;
      }),
    );
  }

  /**
   * Update user
   */
  updateUser(updates: UpdateUserRequest): Observable<User> {
    const userId = this.authService.user()?.id;
    if (!userId) {
      throw new Error('User not authenticated');
    }

    return this.http.put<User>(`${this.API_URL}/${userId}`, updates).pipe(
      map((user) => {
        // Update auth service user
        this.authService.updateUser(user);
        return user;
      }),
    );
  }

  /**
   * Get user profile
   */
  getProfile(): Observable<UserProfile> {
    const userId = this.authService.user()?.id;
    if (!userId) {
      throw new Error('User not authenticated');
    }

    return this.http.get<UserProfile>(`${this.API_URL}/${userId}/profile`);
  }

  /**
   * Update user profile
   */
  updateProfile(updates: UpdateProfileRequest): Observable<UserProfile> {
    const userId = this.authService.user()?.id;
    if (!userId) {
      throw new Error('User not authenticated');
    }

    return this.http.put<UserProfile>(`${this.API_URL}/${userId}/profile`, updates);
  }

  /**
   * Update user preferences
   */
  updatePreferences(preferences: Record<string, unknown>): Observable<UserProfile> {
    const userId = this.authService.user()?.id;
    if (!userId) {
      throw new Error('User not authenticated');
    }

    return this.http.patch<UserProfile>(`${this.API_URL}/${userId}/profile/preferences`, preferences);
  }
}

