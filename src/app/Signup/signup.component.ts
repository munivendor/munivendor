import { RouterLink, RouterModule } from '@angular/router';
import {
  FormGroup,
  FormBuilder,
  ReactiveFormsModule,
  Validators,
  AbstractControl,
  ValidationErrors,
} from '@angular/forms';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatCardModule } from '@angular/material/card';
import { Component, OnInit, OnDestroy } from '@angular/core';
import { GoogleSigninButtonModule } from '@abacritt/angularx-social-login';
import { Router, ActivatedRoute } from '@angular/router';
import { UserService } from '../shared/service/user.service';
import { User } from '../shared/model/user.model';
import { UserLogin } from '../shared/model/user-login.model';
import {
  catchError,
  filter,
  finalize,
  Observable,
  of,
  Subject,
  switchMap,
  takeUntil,
  tap,
  throwError,
} from 'rxjs';
import { AuthService } from '../authorization/auth.service';
import { SignupService } from './services/signup.service';
import { OrganizationType } from '../shared/model/organization-type.model';
import { OrganizationService } from '../Organization/Details/services/organization.service';
import { Organization } from '../Organization/Details/model/organization.model';
import { SocialAuthService } from '@abacritt/angularx-social-login';
import {
  MatDialogModule,
  MatDialog,
  MatDialogActions,
  MatDialogClose,
  MatDialogContent,
  MatDialogTitle,
} from '@angular/material/dialog';
import { StateService } from '../Request/services/state.service';
import { MatIconModule } from '@angular/material/icon';
import { LoggingService } from '../exceptionhandling/logging.service';
import { SnackbarNotificationService } from '../shared/service/snackbar-notification.service';

@Component({
  selector: 'dialog-elements-example-dialog',
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    MatDialogTitle,
    MatDialogContent,
    MatDialogActions,
    MatDialogClose,
    MatButtonModule,
  ],
  template: `
    <h2 mat-dialog-title>Organization Type Change</h2>
    <div mat-dialog-content>
      Hey there! Your organization type has been changed from Offeror to
      Government Agency because you are using a .gov domain extension.
    </div>
    <div mat-dialog-actions align="end">
      <button mat-button mat-dialog-close>Continue</button>
    </div>
  `,
})
export class DialogElementsExampleDialog {}

@Component({
  selector: 'signup',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    RouterModule,
    RouterLink,
    CommonModule,
    MatButtonModule,
    MatInputModule,
    MatCardModule,
    MatSelectModule,
    GoogleSigninButtonModule,
    MatDialogModule,
    MatIconModule,
  ],
  templateUrl: './signup.component.html',
  styleUrls: ['./signup.component.css'],
})
export class SignupComponent implements OnInit, OnDestroy {
  signupMode: 'offeror' | 'agency' = 'offeror';
  signupFormEmail!: FormGroup;
  signupFormGoogle!: FormGroup;
  organizationTypes: OrganizationType[] = [];
  private userCreationInProgress = false;
  private destroy$ = new Subject<void>();
  hidePassword = true;
  hideConfirmPassword = true;
  buttonWidth = 400;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private userService: UserService,
    private socialAuthService: SocialAuthService,
    private router: Router,
    private signupService: SignupService,
    private organizationService: OrganizationService,
    public dialog: MatDialog,
    private stateService: StateService,
    private loggingService: LoggingService,
    private snackbarNotificationService: SnackbarNotificationService,
    private route: ActivatedRoute,
  ) {}

  togglePasswordVisibility(): void {
    this.hidePassword = !this.hidePassword;
  }

  toggleConfirmPasswordVisibility(): void {
    this.hideConfirmPassword = !this.hideConfirmPassword;
  }

  prepareGoogleSignIn(): void {
    this.authService.setSkipNextAuthState(true);
    this.authService.setSignupInProgress(true);
  }

  private detectSignupMode(): void {
    this.signupMode = this.route.snapshot.data['signupMode'] ?? 'offeror';
  }

  private setOrgTypeByMode(): void {
    const value = this.signupMode === 'offeror' ? 2 : 1;
    this.signupFormEmail.get('organizationTypeId')?.setValue(value);
    this.signupFormEmail.get('organizationTypeId')?.disable();
    this.signupFormGoogle.get('organizationTypeId')?.setValue(value);
    this.signupFormGoogle.get('organizationTypeId')?.disable();
  }

  ngOnInit(): void {
    this.detectSignupMode();
    this.initForm();
    this.setupGoogleAuthListener();

    this.signupService
      .getOrganizationTypes()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (organizationTypes) => {
          this.organizationTypes = organizationTypes;
        },
        error: (error) => {
          const correlationId = error?.error?.correlationId;
          this.loggingService.logException(
            new Error(`HTTP Error ${error.status}: ${error.statusText}`),
            3,
            {
              correlationId: correlationId,
              methodName: 'ngOnInit',
              className: 'SignupComponent',
              operation: 'getOrganizationTypes',
            },
          );
          this.snackbarNotificationService.showSnackbarSupportErrorWithCorrelationId(
            correlationId,
          );
        },
      });
  }

  private initForm(): void {
    this.signupFormGoogle = this.fb.group({
      organizationTypeId: [''],
    });

    this.signupFormEmail = this.fb.group(
      {
        firstname: [
          '',
          [
            Validators.required,
            Validators.pattern(/^[A-Za-zÀ-ÖØ-öø-ÿ'' -]{3,50}$/),
          ],
        ],
        lastname: [
          '',
          [
            Validators.required,
            Validators.pattern(/^[A-Za-zÀ-ÖØ-öø-ÿ'' -]{3,50}$/),
          ],
        ],
        email: [
          '',
          [
            Validators.required,
            Validators.email,
            Validators.pattern(
              /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
            ),
          ],
        ],
        username: [''],
        password: [
          '',
          [
            Validators.required,
            Validators.minLength(8),
            Validators.maxLength(64),
            Validators.pattern(
              /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]).{8,64}$/,
            ),
          ],
        ],
        confirmPassword: ['', [Validators.required]],
        organizationTypeId: ['', [Validators.required]],
        userIdentity: [''],
        identityTypeId: [''],
      },
      {
        validators: this.passwordMatchValidator,
      },
    );

    this.setOrgTypeByMode();
  }

  passwordMatchValidator(group: AbstractControl): ValidationErrors | null {
    const password = group.get('password')?.value;
    const confirmPassword = group.get('confirmPassword')?.value;

    if (password === confirmPassword) {
      return null;
    } else {
      group.get('confirmPassword')?.setErrors({ passwordMismatch: true });
      return { passwordMismatch: true };
    }
  }

  getPasswordErrorMessage(): string {
    const passwordControl = this.signupFormEmail.get('password');

    if (passwordControl?.hasError('required')) {
      return 'Password is required.';
    }
    if (passwordControl?.hasError('minlength')) {
      return 'Password must be at least 8 characters long.';
    }
    if (passwordControl?.hasError('maxlength')) {
      return 'Password cannot exceed 64 characters.';
    }
    if (passwordControl?.hasError('pattern')) {
      return 'Password must include uppercase, lowercase, number, and special character.';
    }
    return '';
  }

  markFormGroupTouched(formGroup: FormGroup) {
    Object.values(formGroup.controls).forEach((control) => {
      control.markAsTouched();
      if (control instanceof FormGroup) {
        this.markFormGroupTouched(control);
      }
    });
  }

  onSubmitByEmail() {
    if (this.signupFormEmail.valid) {
      const rawValues = this.signupFormEmail.getRawValue();

      const organization: Organization = {
        organizationTypeId: rawValues.organizationTypeId,
      };

      this.organizationService.initializeOrganization(organization).subscribe({
        next: (response: any) => {
          const organizationUser: User = {
            firstName: rawValues.firstname,
            lastName: rawValues.lastname,
            workEmail: rawValues.email,
            organizationId: response.organizationId,
            organizationTypeId: rawValues.organizationTypeId, // ← fix: was missing
            username: rawValues.email,
            password: rawValues.password,
            identityTypeId: 1,
          };

          this.createUserByEmail(organizationUser);
          this.stateService.setOrganizationId(response.organizationId);
        },
        error: (error) => {
          const correlationId = error?.error?.correlationId;
          this.loggingService.logException(
            new Error(`HTTP Error ${error.status}: ${error.statusText}`),
            3,
            {
              correlationId: correlationId,
              methodName: 'onSubmitByEmail',
              className: 'SignupComponent',
              operation: 'initializeOrganization',
            },
          );
          this.snackbarNotificationService.showSnackbarSupportErrorWithCorrelationId(
            correlationId,
          );
        },
      });
    } else {
      this.markFormGroupTouched(this.signupFormEmail);
    }
  }

  private setupGoogleAuthListener(): void {
    this.socialAuthService.authState
      .pipe(
        takeUntil(this.destroy$),
        filter((user) => {
          return !!user && !this.userCreationInProgress;
        }),

        switchMap((user) => {
          this.userCreationInProgress = true;
          const selectedOrganizationTypeId =
            this.signupFormGoogle.getRawValue().organizationTypeId;

          const organizationData: Organization = {
            organizationTypeId: selectedOrganizationTypeId,
          };

          return this.organizationService
            .initializeOrganization(organizationData)
            .pipe(
              switchMap((orgResponse) => {
                const userData: User = {
                  firstName: user.firstName,
                  lastName: user.lastName,
                  workEmail: user.email,
                  username: user.email,
                  userIdentity: user.id,
                  identityTypeId: 2,
                  organizationId: orgResponse.organizationId,
                  organizationTypeId: selectedOrganizationTypeId, // ← fix: was missing
                };
                this.stateService.setOrganizationTypeId(
                  selectedOrganizationTypeId,
                );
                this.stateService.setOrganizationId(orgResponse.organizationId);
                return this.createOrLoginGoogleUser(userData);
              }),
              catchError((error) => {
                this.userCreationInProgress = false;
                this.authService.setSignupInProgress(false);
                this.authService.setSkipNextAuthState(false);
                // Sign out of the Google SDK session so the failed sign-in
                // isn't left cached in authState and replayed into this
                // listener the next time SignupComponent is (re)initialized.
                this.socialAuthService.signOut().catch(() => {});
                this.snackbarNotificationService.showSnackbarError(
                  'Sign up failed. This email may already exist or an error occurred.',
                );
                return of(null);
              }),
              finalize(() => {
                this.userCreationInProgress = false;
                this.authService.setSignupInProgress(false);
              }),
            );
        }),
      )
      .subscribe((result) => {
        if (result) {
          this.router.navigate(['/organization-details']);
        }
      });
  }

  private createOrLoginGoogleUser(user: User): Observable<any> {
    return this.userService.createUser(user).pipe(
      tap((userId: number) => {
        this.stateService.setUserId(userId);
      }),
      catchError((error) => {
        if (error.status === 409) {
          return of(null);
        }
        const correlationId = error?.error?.correlationId;
        this.loggingService.logException(
          new Error(`HTTP Error ${error.status}: ${error.statusText}`),
          3,
          {
            correlationId: correlationId,
            methodName: 'createOrLoginGoogleUser',
            className: 'SignupComponent',
            operation: 'createUser',
          },
        );
        this.snackbarNotificationService.showSnackbarSupportErrorWithCorrelationId(
          correlationId,
        );
        return throwError(() => error);
      }),
      switchMap(() => {
        const googleUserLogin: UserLogin = {
          userIdentity: user.userIdentity,
          username: user.username,
        };
        return this.authService.login(googleUserLogin).pipe(
          tap(() => this.authService.setSkipNextAuthState(false)),
          catchError((loginError) => {
            this.authService.setSkipNextAuthState(false);
            const correlationId = loginError?.error?.correlationId;
            this.loggingService.logException(
              new Error(
                `HTTP Error ${loginError.status}: ${loginError.statusText}`,
              ),
              3,
              {
                correlationId: correlationId,
                methodName: 'createOrLoginGoogleUser',
                className: 'SignupComponent',
                operation: 'login',
              },
            );
            this.snackbarNotificationService.showSnackbarSupportErrorWithCorrelationId(
              correlationId,
            );
            return throwError(() => loginError);
          }),
        );
      }),
    );
  }

  private createUserByEmail(user: User) {
    this.userService
      .createUser(user)
      .pipe(
        tap((userId: number) => {
          this.stateService.setUserId(userId);
        }),
        switchMap((userId: number) =>
          this.userService.SendUserVerificationEmail(userId).pipe(
            tap(() => {
              this.router.navigate(['/email-verification'], {
                queryParams: { email: user.workEmail },
              });
            }),
            catchError((error) => {
              const correlationId = error?.error?.correlationId;
              this.loggingService.logException(
                new Error(`HTTP Error ${error.status}: ${error.statusText}`),
                3,
                {
                  correlationId: correlationId,
                  methodName: 'createUserByEmail',
                  className: 'SignupComponent',
                  operation: 'SendUserVerificationEmail',
                },
              );
              this.snackbarNotificationService.showSnackbarSupportErrorWithCorrelationId(
                correlationId,
              );
              return throwError(() => error);
            }),
          ),
        ),
      )
      .subscribe({
        error: (error) => {
          const correlationId = error?.error?.correlationId;
          this.loggingService.logException(
            new Error(`HTTP Error ${error.status}: ${error.statusText}`),
            3,
            {
              correlationId: correlationId,
              methodName: 'createUserByEmail',
              className: 'SignupComponent',
              operation: 'createUser',
            },
          );
          this.snackbarNotificationService.showSnackbarSupportErrorWithCorrelationId(
            correlationId,
          );
        },
      });
  }

  ngOnDestroy(): void {
    this.authService.setSkipNextAuthState(false);
    this.destroy$.next();
    this.destroy$.complete();
  }
}
