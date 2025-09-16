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
  debounceTime,
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

export interface ForgotPasswordResponse {
  message?: string;
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

  private _snackBar = inject(MatSnackBar);
  private url = environment.apiUrl;
  private userSubject = new BehaviorSubject<number | null>(null);

  user$: Observable<number | null> = this.userSubject.asObservable();
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

  public initializeApp(): Observable<any> {
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
          if (err.status === 401) {
            this.router.navigate(['/login']);
          }
          return throwError(() => err);
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
          console.log('Google Auth State Changed (login mode):', user);
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
    console.log('Attempting login with:', userLogin);
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
    console.log(`Setting authenticated state to ${isAuthenticated}`);
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

    this.userService
      .getUser(userId)
      .pipe(
        tap((user: User) => {
          console.log('User data fetched in completeLoginProcess:', user);

          if (user.organizationId !== undefined) {
            this.stateService.setOrganizationId(user.organizationId);
          }
          if (user.organizationTypeId !== undefined) {
            this.stateService.setOrganizationTypeId(user.organizationTypeId); // Add this method
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
          console.error('Navigation error:', error);
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
}
