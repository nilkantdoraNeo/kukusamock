import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { tap } from 'rxjs/operators';
import { UserProfile } from '../models/user.model';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private tokenKey = 'quiz_token';
  user = signal<UserProfile | null>(null);

  constructor(private http: HttpClient) {}

  signup(payload: { username: string; email: string; phone: string; age: number; password: string }) {
    return this.http.post<{ token: string; user: UserProfile }>(
      `${environment.apiUrl}/auth/signup`,
      payload
    ).pipe(tap((res: { token: string; user: UserProfile }) => this.setSession(res.token, res.user)));
  }

  login(email: string, password: string) {
    return this.http.post<{ token: string; user: UserProfile }>(
      `${environment.apiUrl}/auth/login`,
      { email, password }
    ).pipe(tap((res: { token: string; user: UserProfile }) => this.setSession(res.token, res.user)));
  }

  updateProfile(payload: Partial<UserProfile>) {
    return this.http.patch<UserProfile>(
      `${environment.apiUrl}/auth/profile`,
      payload
    ).pipe(tap((profile: UserProfile) => this.user.set(profile)));
  }

  logout() {
    localStorage.removeItem(this.tokenKey);
    this.user.set(null);
  }

  getToken() {
    return localStorage.getItem(this.tokenKey);
  }

  loadProfile() {
    return this.http.get<UserProfile>(`${environment.apiUrl}/auth/profile`)
      .pipe(tap((profile: UserProfile) => this.user.set(profile)));
  }

  private setSession(token: string, user: UserProfile) {
    localStorage.setItem(this.tokenKey, token);
    this.user.set(user);
  }
}
