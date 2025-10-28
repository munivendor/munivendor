import { Injectable, PLATFORM_ID, Inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
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
  debounceTime,
  Subject,
} from 'rxjs';
import { Router } from '@angular/router';
import { UserLogin } from '../shared/model/user-login.model';
import {
  HttpClient,
  HttpErrorResponse,
  HttpParams,
} from '@angular/common/http';
import { environment } from '../../environments/environment';
import { MatSnackBar } from '@angular/material/snack-bar';
import { FlowNavigationService } from '../shared/service/flow-navigation.service';
import { UserService } from '../shared/service/user.service';
import { User } from '../shared/model/user.model';
import { StateService } from '../Request/services/state.service';
import { LoggingService } from '../exceptionhandling/logging.service';
import { SnackbarNotificationService } from '../shared/service/snackbar-notification.service';

export interface ForgotPasswordResponse {
  message?: string;
}

interface UserSession {
  userId: number;
  timestamp: number;
}

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private signupInProgressSubject = new BehaviorSubject<boolean>(false);
  signupInProgress$ = this.signupInProgressSubject.asObservable();

  setSignupInProgress(inProgress: boolean): void {
    this.signupInProgressSubject.next(inProgress);
  }
  private url = environment.apiUrl;
  private userSubject = new BehaviorSubject<number | null>(null);

  user$: Observable<number | null> = this.userSubject.asObservable();
  authState = new BehaviorSubject<boolean>(false);
  isAuthenticated$ = this.authState.asObservable();
  private skipNextAuthStateSubject = new BehaviorSubject<boolean>(false);
  skipNextAuthState$ = this.skipNextAuthStateSubject.asObservable();
  public isLoggingIn = new BehaviorSubject<boolean>(false);
  private appInitialized = new BehaviorSubject<boolean>(false);
  public appInitialized$ = this.appInitialized.asObservable();
  userLoggedOut$ = new Subject<void>();

  setSkipNextAuthState(value: boolean): void {
    this.skipNextAuthStateSubject.next(value);
  }

  private storageEventListener?: (event: StorageEvent) => void;
  private isBrowser: boolean;
  private readonly allowGuestUrls = new Set([
    '/',
    '/login',
    '/signup',
    '/forgot-password',
    '/email-verification',
    '/validateuser',
    '/reset-password',
  ]);

  constructor(
    private http: HttpClient,
    private router: Router,
    private socialAuthService: SocialAuthService,
    private flowNavigationService: FlowNavigationService,
    private userService: UserService,
    private stateService: StateService,
    private loggingService: LoggingService,
    private _snackBar: MatSnackBar,
    private snackbarNotificationService: SnackbarNotificationService,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {
    this.isBrowser = isPlatformBrowser(this.platformId);
    if (this.isBrowser) {
      this.initializeAuthListener();
      this.setupCrossTabSessionSync();
    }
  }

  private setupCrossTabSessionSync(): void {
    this.storageEventListener = (event: StorageEvent) => {
      if (event.key === 'currentSession') {
        this.handleSessionChangeFromOtherTab(event.newValue);
      }
    };

    window.addEventListener('storage', this.storageEventListener);
  }

  private handleSessionChangeFromOtherTab(newSessionData: string | null): void {
    if (!newSessionData) {
      // Session cleared in another tab
      this.forceLogoutThisTab();
      return;
    }

    try {
      const newSession: UserSession = JSON.parse(newSessionData);
      const currentUser = this.userSubject.value;

      if (!currentUser || currentUser !== newSession.userId) {
        // Different user - force logout and refresh
        this.forceLogoutThisTab();
      }
    } catch (error) {
      console.error('Error parsing session data:', error);
      this.forceLogoutThisTab();
    }
  }

  private forceLogoutThisTab(): void {
    this.safeResetAuthState();
    alert('You have been logged out because another session was started.');
    setTimeout(() => {
      window.location.reload();
    }, 100);
  }

  private setCurrentSession(userSession: UserSession): void {
    localStorage.setItem('currentSession', JSON.stringify(userSession));
  }

  private clearCurrentSession(): void {
    localStorage.removeItem('currentSession');
    sessionStorage.clear();
  }

  public initializeApp(): Observable<any> {
    // If already initialized, return early
    if (this.authState.value && this.userSubject.value) {
      this.appInitialized.next(true);
      return of(null);
    }

    return this.checkAuthCookieOnInit().pipe(
      tap((result) => {
        this.appInitialized.next(true);
      }),
      catchError((error) => {
        this.appInitialized.next(true);
        return of(null);
      })
    );
  }

  private checkAuthCookieOnInit(): Observable<any> {
    return this.http
      .get<{ userId: number; email: string }>(`${this.url}me`, {
        withCredentials: true,
      })
      .pipe(
        switchMap((response) => {
          this.authState.next(true);
          this.userSubject.next(response.userId);

          return this.userService.getUser(response.userId).pipe(
            tap((user: User) => {
              if (user.userId !== undefined) {
                this.stateService.setUserId(Number(user.userId));
              }
              if (user.organizationTypeId !== undefined) {
                this.stateService.setOrganizationTypeId(
                  user.organizationTypeId
                );
              }
              if (user.organizationId !== undefined) {
                this.stateService.setOrganizationId(user.organizationId);
              }
            }),
            catchError((userError) => {
              console.error('Error fetching user data during init:', userError);
              return of(null);
            })
          );
        }),
        catchError((err) => {
          this.setAuthenticated(false);
          if (
            err.status === 401 &&
            !this.allowGuestUrls.has(window.location.pathname)
          ) {
            this.router.navigate(['/login']);
          }
          // Return of(null) instead of throwError to prevent error propagation
          return of(null);
        })
      );
  }

  private initializeAuthListener(): void {
    this.socialAuthService.authState
      .pipe(
        debounceTime(100),
        withLatestFrom(this.skipNextAuthState$, this.signupInProgress$),
        filter(
          ([user, skipNext, signupInProgress]) =>
            !!user &&
            !skipNext &&
            !signupInProgress &&
            this.router.url !== '/signup'
        )
      )
      .subscribe({
        next: ([user, _skip, _signup]) => {
          const userLogin: UserLogin = {
            userIdentity: user.id,
            username: user.email,
          };

          this.login(userLogin).subscribe({
            next: (userId) => this.completeLoginProcess(userId, user.email),
            error: () => {
              this.safeResetAuthState();
              this._snackBar.open(
                'Login failed: Invalid email, password, or unauthorized email.',
                'Close',
                { verticalPosition: 'top' }
              );
            },
          });
        },
      });
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
            this.authState.next(true);
            this.userSubject.next(userId as any);
            this.userService.getUser(Number(userId)).subscribe(
              (user: User) => {
                if (user.organizationId !== undefined) {
                  this.stateService.setOrganizationId(user.organizationId);
                }
                if (user.organizationTypeId !== undefined) {
                  this.stateService.setOrganizationTypeId(
                    user.organizationTypeId
                  );
                }
                if (user.userId !== undefined) {
                  this.stateService.setUserId(user.userId);
                }

                const userSession: UserSession = {
                  userId: Number(userId),
                  timestamp: Date.now(),
                };
                this.setCurrentSession(userSession);
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
      this.clearCurrentSession();
      console.warn('User is already logged out, skipping redundant logout.');
      return;
    }

    this.http
      .post(`${this.url}logout`, {}, { withCredentials: true })
      .subscribe({
        next: async () => {
          this.clearCurrentSession();
          try {
            if (this.userSubject.value) {
              await this.socialAuthService.signOut();
            }
            this.userLoggedOut$.next();
          } catch (error) {
            console.error('Google Sign-Out Error:', error);
          } finally {
            this.safeResetAuthState();
          }
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

  get isAuthenticated(): boolean {
    return this.authState.value;
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

    this.userService
      .getUser(userId)
      .pipe(
        tap((user: User) => {
          if (user.organizationId !== undefined) {
            this.stateService.setOrganizationId(user.organizationId);
          }
          if (user.organizationTypeId !== undefined) {
            this.stateService.setOrganizationTypeId(user.organizationTypeId);
          }
        }),
        switchMap(() => {
          return this.flowNavigationService.navigateAfterLogin(userId, email);
        })
      )
      .subscribe({
        next: () => {
          this.setAuthenticated(true, userId);
        },
        error: (error: any) => {
          const correlationId = error?.error?.correlationId;

          this.loggingService.logException(
            new Error(`HTTP Error ${error.status}: ${error.statusText}`),
            3,
            {
              userId: userId,
              correlationId: correlationId,
              methodName: 'completeLoginProcess',
              className: 'AuthService',
              operation: 'getUser',
            }
          );

          this.setAuthenticated(false, undefined);

          this.snackbarNotificationService.showSnackbarError(correlationId);
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
      `${this.url}auth/send-reset?email=${encodeURIComponent(email)}`,
      {},
      {
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );
  }

  resetPassword(token: string, newPassword: string): Observable<any> {
    // Your backend expects query parameters, not a body
    const params = new HttpParams()
      .set('token', token)
      .set('newPassword', newPassword);

    return this.http.post(`${this.url}auth/reset-password`, null, { params });
  }
}
