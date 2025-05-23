import { Injectable } from '@angular/core';
import { SocialAuthService, SocialUser } from '@abacritt/angularx-social-login';
import { BehaviorSubject, catchError, filter, Observable, tap, throwError, withLatestFrom } from 'rxjs';
import { Router } from '@angular/router';
import { UserLogin } from '../shared/model/user-login.model';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
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
  private skipNextAuthStateSubject = new BehaviorSubject<boolean>(false);
  skipNextAuthState$ = this.skipNextAuthStateSubject.asObservable();

  setSkipNextAuthState(value: boolean): void {
    this.skipNextAuthStateSubject.next(value);
  }

  constructor(
    private http: HttpClient,
    private router: Router,
    private socialAuthService: SocialAuthService
  ) {
    this.initializeAuthListener();
  }

  private initializeAuthListener(): void {
    this.socialAuthService.authState.pipe(
      withLatestFrom(this.skipNextAuthState$),
      filter(([user, skipNext]) => !!user && !skipNext)
    ).subscribe({
      next: ([user, _]) => {
        console.log("Google Auth State Changed:", user);
        if (user && user.id) {
          const userLogin: UserLogin = {
            userIdentity: user.id,
            username: user.email
          };
  
          this.login(userLogin).subscribe({
            next: (response) => {
              this.authState.next(true);
              this.userSubject.next(response);
              if (user.email.toLowerCase().endsWith('.gov')) {
                this.router.navigate(['/government-agency-details']);
              } else {
                this.router.navigate(['/role-verification']);
              }
            },
            error: (error) => {
              this.safeResetAuthState();
            }
          });
        }
      }
    });
  }

  login(userLogin: UserLogin): Observable<any> {
    return this.http.post<{ UserId: number; Token: string }>(
      `${this.url}login`, userLogin, { withCredentials: true }
    ).pipe(
      tap(response => {
        if (response) {
          console.log("Login successful:", response);
          this.authState.next(true);
          this.userSubject.next(response as any);
        }
      }),
      catchError((error: HttpErrorResponse) => {
        return throwError(() => error);
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