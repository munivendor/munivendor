import { inject, Injectable } from '@angular/core';
import { SocialAuthService } from '@abacritt/angularx-social-login';
import {
  BehaviorSubject,
  catchError,
  filter,
  Observable,
  tap,
  throwError,
  withLatestFrom,
  switchMap,
  of,
} from 'rxjs';
import { Router } from '@angular/router';
import { UserLogin } from '../shared/model/user-login.model';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { MatSnackBar } from '@angular/material/snack-bar';
import { FlowNavigationService } from '../shared/service/flow-navigation.service';
import { UserService } from '../shared/service/user.service';
import { User } from '../shared/model/user.model';
import { StateService } from '../Request/services/state.service';
import { UserProfile } from '../shared/model/user-profile.model';

export interface MfaSetupResponse {
  qrCodeUrl: string;
  secret: string;
}

export interface MfaVerifyResponse {
  message: string;
  userId: number;
}

export interface ForgotPasswordResponse {
  message?: string;
}

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private _snackBar = inject(MatSnackBar);
  private url = environment.apiUrl;
  private userSubject = new BehaviorSubject<number | null>(null);
  private userProfile = new BehaviorSubject<UserProfile | null>(null);
  private mfaRequired = new BehaviorSubject<boolean>(false);
  requiresMfa$ = this.mfaRequired.asObservable();
  private mfaVerified = new BehaviorSubject<boolean>(false);
  mfaVerified$ = this.mfaVerified.asObservable();

  user$: Observable<number | null> = this.userSubject.asObservable();
  userProfile$ = this.userProfile.asObservable();
  authState = new BehaviorSubject<boolean>(false);
  isAuthenticated$ = this.authState.asObservable();
  private skipNextAuthStateSubject = new BehaviorSubject<boolean>(false);
  skipNextAuthState$ = this.skipNextAuthStateSubject.asObservable();
  public isLoggingIn = new BehaviorSubject<boolean>(false);

  // Add a subject to track app initialization
  private appInitialized = new BehaviorSubject<boolean>(false);
  public appInitialized$ = this.appInitialized.asObservable();

  setSkipNextAuthState(value: boolean): void {
    this.skipNextAuthStateSubject.next(value);
  }

  constructor(
    private http: HttpClient,
    private router: Router,
    private socialAuthService: SocialAuthService,
    private flowNavigationService: FlowNavigationService,
    private userService: UserService,
    private stateService: StateService
  ) {
    this.initializeAuthListener();
  }

  // Initialize the app and check for existing auth cookie
  public initializeApp(): Observable<any> {
    return this.checkAuthCookieOnInit().pipe(
      tap(() => {
        this.appInitialized.next(true);
      }),
      catchError((error) => {
        console.log('App initialization completed with error:', error);
        this.appInitialized.next(true);
        return of(null);
      })
    );
  }

  private checkAuthCookieOnInit(): Observable<any> {
    return this.http
      .get<UserProfile>(`${this.url}me`, {
        withCredentials: true,
      })
      .pipe(
        switchMap((response) => {
          this.authState.next(true);
          this.userSubject.next(response.userId);

          return this.userService.getUser(response.userId).pipe(
            tap((user: User) => {
              if (user.organizationId !== undefined) {
                this.stateService.setOrganizationId(user.organizationId);
              } else {
                console.warn(
                  'Organization ID is undefined during restoration.'
                );
              }
            }),
            catchError((userError) => {
              console.error('Error fetching user data during init:', userError);
              return of(null);
            })
          );
        }),
        catchError((err) => {
          console.log('User not authenticated on init');
          this.setAuthenticated(false);
          return throwError(() => err);
        })
      );
  }

  private initializeAuthListener(): void {
    this.socialAuthService.authState
      .pipe(
        withLatestFrom(this.skipNextAuthState$),
        filter(([user, skipNext]) => !!user && !skipNext)
      )
      .subscribe({
        next: ([user, _]) => {
          console.log('Google Auth State Changed:', user);
          if (user && user.id) {
            const userLogin: UserLogin = {
              userIdentity: user.id,
              username: user.email,
            };

            this.login(userLogin).subscribe({
              next: (userId) => {
                this.completeLoginProcess(userId, user.email);
              },
              error: (error) => {
                this.safeResetAuthState();
                this._snackBar.open(
                  'Login failed: Invalid email, password, or unauthorized email.',
                  'Close',
                  {
                    verticalPosition: 'top',
                  }
                );
              },
            });
          }
        },
      });
  }

  setMfaVerified(value: boolean): void {
    this.mfaVerified.next(value);
    sessionStorage.setItem('mfaVerified', String(value));
  }

  isMfaVerified(): boolean {
    const storedValue = sessionStorage.getItem('mfaVerified');
    return (
      this.mfaVerified.value || sessionStorage.getItem('mfaVerified') === 'true'
    );
  }

  isMfaRequired(): boolean {
    return this.mfaRequired.value;
  }

  login(userLogin: UserLogin): Observable<any> {
    this.isLoggingIn.next(true);
    return this.http
      .post<{ UserId: number; Token: string }>(`${this.url}login`, userLogin, {
        withCredentials: true,
      })
      .pipe(
        tap((userId) => {
          if (userId) {
            this.userSubject.next(userId as any);
            this.userService.getUser(Number(userId)).subscribe(
              (user: User) => {
                console.log('User data fetched successfully:', user);
                if (user.organizationId !== undefined) {
                  this.stateService.setOrganizationId(user.organizationId);
                } else {
                  console.warn('Organization ID is undefined.');
                }
              },
              (error) => {
                console.error('Error fetching user data:', error);
              }
            );
          }
        }),
        catchError((error: HttpErrorResponse) => {
          this.isLoggingIn.next(false);
          return throwError(() => error);
        })
      );
  }

  logout(): void {
    if (!this.authState.value) {
      console.warn('User is already logged out, skipping redundant logout.');
      return;
    }

    this.http
      .post(`${this.url}logout`, {}, { withCredentials: true })
      .subscribe({
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

          sessionStorage.removeItem('mfaVerified');
          this.mfaVerified.next(false);
        },
        error: (error) => {
          console.error('Logout Error:', error);
          this.safeResetAuthState();
        },
      });
  }

  private safeResetAuthState(): void {
    if (!this.authState.value) {
      console.warn('Auth state is already reset. Skipping duplicate reset.');
      return;
    }

    this.userSubject.next(null);
    this.authState.next(false);
    this.isLoggingIn.next(false);
    this.stateService.clearOrganizationId();

    if (this.router.url !== '/login') {
      this.router.navigate(['/login']);
    }
  }

  setAuthenticated(isAuthenticated: boolean, userData: any = null): void {
    this.authState.next(isAuthenticated);
    this.userSubject.next(userData);
    this.isLoggingIn.next(false);
  }

  /**
   * Handles the complete login process including navigation for email login
   * This is called from LoginComponent
   */
  completeEmailLogin(userId: number, email: string): void {
    this.completeLoginProcess(userId, email);
  }

  private completeLoginProcess(userId: number, email: string): void {
    this.userSubject.next(userId);
    this.getUserProfile().subscribe({
      next: (profile) => {
        this.userProfile.next(profile);
        if (profile.isMfaEnabled && !this.isMfaVerified()) {
          this.mfaRequired.next(profile.isMfaEnabled);
          this.router.navigate(['/two-step-challenge']);
        } else {
          this.flowNavigationService
            .navigateAfterLogin(userId, email)
            .subscribe({
              next: () => {
                this.setAuthenticated(true, userId);
              },
              error: (error: any) => {
                console.error('Navigation error:', error);
                this.setAuthenticated(true, userId);
                this.router.navigate(['/role-verification']);
              },
            });
        }
      },
      error: (error) => {
        console.error('Error fetching user profile:', error);
        // still continue with navigation even if profile fails
        this.setAuthenticated(true, userId);
        this.router.navigate(['/role-verification']);
      },
    });
  }

  getCurrentUserId(): number | null {
    return this.userSubject.value;
  }

  restoreOrganizationId(): Observable<User | null> {
    const userId = this.getCurrentUserId();
    if (!userId) {
      return of(null);
    }

    return this.userService.getUser(userId).pipe(
      tap((user: User) => {
        if (user && user.organizationId !== undefined) {
          this.stateService.setOrganizationId(user.organizationId);
          console.log(
            'Organization ID manually restored:',
            user.organizationId
          );
        }
      }),
      catchError((error) => {
        console.error('Error manually restoring organization ID:', error);
        return of(null);
      })
    );
  }

  sendPasswordReset(email: string): Observable<ForgotPasswordResponse> {
    return this.http.post<ForgotPasswordResponse>(
      `${this.url}/auth/send-reset?email=${encodeURIComponent(email)}`,
      {},
      {
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );
  }
  setupMfa(): Observable<MfaSetupResponse> {
    return this.http.post<MfaSetupResponse>(
      `${this.url}auth/setup-mfa`,
      {},
      { withCredentials: true }
    );
  }

  verifyMfa(code: string): Observable<MfaVerifyResponse> {
    return this.http.post<MfaVerifyResponse>(
      `${this.url}auth/verify-mfa`,
      { code },
      { withCredentials: true }
    );
  }

  deactivateMfa(): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(
      `${this.url}auth/deactivate-mfa`,
      {},
      { withCredentials: true }
    );
  }

  getUserProfile(): Observable<UserProfile> {
    return this.http
      .get<UserProfile>(`${this.url}me`, { withCredentials: true })
      .pipe(
        tap((profile) => {
          this.userProfile.next(profile);
        }),
        catchError((error: HttpErrorResponse) => {
          return throwError(() => error);
        })
      );
  }
}
