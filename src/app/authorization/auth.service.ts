import { Injectable } from '@angular/core';
import { SocialAuthService, SocialUser } from '@abacritt/angularx-social-login';
import { BehaviorSubject, distinctUntilChanged, Observable, tap } from 'rxjs';
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
  private isGoogleSignIn = false;

  constructor(
    private http: HttpClient,
    private router: Router,
    private socialAuthService: SocialAuthService
  ) {
    this.initializeAuthListener();
  }

  private initializeAuthListener(): void {
    this.socialAuthService.authState.pipe(
      distinctUntilChanged((prev, curr) => prev?.id === curr?.id) // Prevent duplicate emissions
    ).subscribe({
      next: (user) => {
        console.log("Google Auth State Changed:", user);

        if (user) {
          this.userSubject.next(user);
          this.authState.next(true);
          this.isGoogleSignIn = true;
        } else {
          this.safeResetAuthState(); // Ensure reset happens only once
        }
      },
      error: (error) => {
        console.error('Google Auth Error:', error);
        this.safeResetAuthState();
      }
    });
  }

  setGoogleSignIn(isGoogle: boolean): void {
    this.isGoogleSignIn = isGoogle;
  }

  getGoogleSignIn(): boolean {
    return this.isGoogleSignIn;
  }

  // added context because both your signup and login flows are using the same authentication service method,
  // but expecting different navigation outcomes
  login(userLogin: UserLogin, context: 'signup' | 'login' = 'login'): Observable<any> {
    return this.http.post<{ UserId: number; Token: string }>(
      `${this.url}login`, userLogin, { withCredentials: true }
    ).pipe(
      tap(response => {
        if (response) {
          console.log(`${context} successful:`, response);
          this.authState.next(true);

          const userWithContext = {
            ...response,
            authContext: context
          };

          this.userSubject.next(userWithContext as any);
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
    this.isGoogleSignIn = false;

    if (this.router.url !== '/login') {
      this.router.navigate(['/login']);
    }
  }
}