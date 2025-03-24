import { Injectable } from '@angular/core';
import { SocialAuthService, SocialUser } from '@abacritt/angularx-social-login';
import { BehaviorSubject, Observable, tap } from 'rxjs';
import { Router } from '@angular/router';
import { UserLogin } from '../shared/model/user-login.model';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private url = environment.apiUrl;
  private userSubject = new BehaviorSubject<SocialUser | null>(null);
  user$: Observable<SocialUser | null> = this.userSubject.asObservable();
  private authState = new BehaviorSubject<boolean>(false);
  isAuthenticated$ = this.authState.asObservable();

  constructor(
    private http: HttpClient,
    private router: Router,
    private socialAuthService: SocialAuthService
  ) {
    this.initializeAuthListener();
  }

  private initializeAuthListener(): void {
    this.socialAuthService.authState.subscribe({
      next: (user) => {
        console.log("Google Auth State Changed:", user);

        if (user) {
          this.userSubject.next(user);
          this.authState.next(true);
        } else {
          this.safeResetAuthState();
        }
      },
      error: (error) => {
        console.error('Google Auth Error:', error);
        this.safeResetAuthState();
      }
    });
  }

  login(userLogin: UserLogin): Observable<any> {
    return this.http.post<{ UserId: number; Token: string }>(
      `${this.url}login`, userLogin, { withCredentials: true }
    ).pipe(
      tap(response => {
        if (response) {
          this.authState.next(true);
          this.userSubject.next(response as any);
        }
      })
    );
  }

  logout(): void {
    if (!this.authState.value) {
      console.warn("User is already logged out, skipping redundant logout.");
      return;
    }

    this.http.post(`${this.url}logout`, {}, { withCredentials: true }).subscribe({
      next: async () => {
        try {
          if (this.userSubject.value) {
            await this.socialAuthService.signOut();
          }
        } catch (error) {
          console.error('Google Sign-Out Error:', error);
        } finally {
          this.safeResetAuthState();
        }
      },
      error: (error) => {
        console.error('Logout Error:', error);
        this.safeResetAuthState();
      }
    });
  }

  private safeResetAuthState(): void {
    if (!this.authState.value) {
      console.warn("Auth state is already reset. Skipping duplicate reset.");
      return;
    }

    console.log('Resetting Auth State');
    this.userSubject.next(null);
    this.authState.next(false);

    if (this.router.url !== '/login') {
      this.router.navigate(['/login']);
    }
  }

  setAuthenticated(isAuthenticated: boolean, userData: any = null): void {
    this.authState.next(isAuthenticated);
    this.userSubject.next(userData);
  }
}