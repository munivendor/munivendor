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
import { OnDestroy } from '@angular/core';
import { Component, OnInit } from '@angular/core';
import { GoogleSigninButtonModule } from '@abacritt/angularx-social-login';
import { Router } from '@angular/router';
import { UserService } from '../shared/service/user.service';
import { User } from '../shared/model/user.model';
import { UserLogin } from '../shared/model/user-login.model';
import {
  catchError,
  combineLatest,
  filter,
  finalize,
  Observable,
  Subject,
  switchMap,
  take,
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
import { MatSnackBar } from '@angular/material/snack-bar';

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
  ],
  templateUrl: './signup.component.html',
  styleUrls: ['./signup.component.css'],
})
export class SignupComponent implements OnInit, OnDestroy {
  signupFormEmail!: FormGroup;
  signupFormGoogle!: FormGroup;
  userId!: number;
  isLGA: boolean = false;
  organizationTypes: OrganizationType[] = [];
  private userSelectedOrgTypeIdEmail: number | null = null;
  private userSelectedOrgTypeIdGoogle: number | null = null;
  private userCreationInProgress = false;
  private destroy$ = new Subject<void>();

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private userService: UserService,
    private socialAuthService: SocialAuthService,
    private router: Router,
    private signupService: SignupService,
    private organizationService: OrganizationService,
    public dialog: MatDialog,
    private snackBar: MatSnackBar
  ) {}

  openDialog() {
    this.dialog.open(DialogElementsExampleDialog, {
      width: '575px',
    });
  }

  prepareGoogleSignIn(): void {
    this.authService.setSkipNextAuthState(true);
  }

  ngOnInit(): void {
    this.initForm();
    this.setupGoogleAuthListener();

    this.signupService
      .getOrganizationTypes()
      .pipe(takeUntil(this.destroy$))
      .subscribe((organizationTypes) => {
        this.organizationTypes = organizationTypes;
      });

    this.signupFormGoogle
      .get('organizationTypeId')
      ?.valueChanges.pipe(takeUntil(this.destroy$))
      .subscribe((value) => {
        if (!this.isLGA) {
          this.userSelectedOrgTypeIdGoogle = value;
        }
      });

    this.signupFormEmail
      .get('organizationTypeId')
      ?.valueChanges.pipe(takeUntil(this.destroy$))
      .subscribe((value) => {
        if (!this.isLGA) {
          this.userSelectedOrgTypeIdEmail = value;
        }
      });

    this.signupFormEmail
      .get('email')
      ?.valueChanges.pipe(takeUntil(this.destroy$))
      .subscribe((email) => {
        const orgControl = this.signupFormEmail.get('organizationTypeId');
        if (email && email.endsWith('.gov')) {
          // only open dialog if organizationTypeId is 2 (Offeror)
          if (orgControl && orgControl.value === 2) {
            this.openDialog();
          }
          this.isLGA = true;
          orgControl?.setValue(1);
          orgControl?.disable();
        } else {
          this.isLGA = false;
          orgControl?.enable();
          if (this.userSelectedOrgTypeIdEmail !== null) {
            orgControl?.setValue(this.userSelectedOrgTypeIdEmail);
          } else {
            orgControl?.reset();
          }
        }
      });
  }

  private initForm(): void {
    this.signupFormGoogle = this.fb.group({
      organizationTypeId: ['', [Validators.required]],
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
              /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/
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
              /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]).{8,64}$/
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
      }
    );
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

  // Form utility method
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
      const organizationTypeId =
        this.signupFormEmail.controls['organizationTypeId'].value;

      const organization: Organization = {
        organizationTypeId: organizationTypeId,
      };

      this.organizationService.saveOrganization(organization).subscribe({
        next: (response: any) => {
          const organizationUser: User = {
            firstName: this.signupFormEmail.controls['firstname'].value,
            lastName: this.signupFormEmail.controls['lastname'].value,
            workEmail: this.signupFormEmail.controls['email'].value,
            organizationId: response.organizationId,
            username: this.signupFormEmail.controls['email'].value,
            password: this.signupFormEmail.controls['password'].value,
            identityTypeId: 1,
          };

          this.createUserByEmail(organizationUser);
        },
        error: (err) => {
          console.error('Failed to save organization:', err);
        },
      });
    } else {
      this.markFormGroupTouched(this.signupFormEmail);
    }
  }

  private setupGoogleAuthListener(): void {
    combineLatest([
      this.authService.skipNextAuthState$,
      this.socialAuthService.authState,
    ])
      .pipe(
        takeUntil(this.destroy$),
        // Modified filter condition - just check for valid user and form
        filter(([_, user]) => {
          return !!user && this.signupFormGoogle.valid;
        }),
        // Take only the first emission to prevent multiple signups
        take(1),
        switchMap(([_, user]) => {
          this.userCreationInProgress = true;
          const selectedOrganizationTypeId =
            this.signupFormGoogle.get('organizationTypeId')?.value;

          const organizationData: Organization = {
            organizationTypeId: selectedOrganizationTypeId,
          };

          return this.organizationService
            .saveOrganization(organizationData)
            .pipe(
              switchMap((orgResponse) => {
                console.log('Organization created:', orgResponse);

                const userData = {
                  firstName: user.firstName,
                  lastName: user.lastName,
                  workEmail: user.email,
                  username: user.email,
                  userIdentity: user.id,
                  identityTypeId: 2,
                  organizationId: orgResponse.organizationId,
                };

                return this.createUserByGoogle(userData);
              })
            );
        }),
        finalize(() => {
          this.userCreationInProgress = false;
        })
      )
      .subscribe({
        next: (user) => {
          console.log('Google Auth Detected:', user);
          this.router.navigate(['/role-verification']);
        },
        error: (error) => {
          this.snackBar.open(`Sign up failed. ${error.error}`, 'Close', {
            verticalPosition: 'top',
          });
          this.authService.setSkipNextAuthState(false);
        },
      });
  }

  private createUserByGoogle(user: User): Observable<any> {
    return this.userService.createUser(user).pipe(
      switchMap(() => {
        const googleUserLogin: UserLogin = {
          userIdentity: user.userIdentity,
          username: user.username,
        };
        return this.authService
          .login(googleUserLogin)
          .pipe(tap(() => this.authService.setSkipNextAuthState(false)));
      }),
      catchError((error) => {
        this.userCreationInProgress = false;
        this.authService.setSkipNextAuthState(false);
        return throwError(() => error);
      }),
      finalize(() => {
        this.userCreationInProgress = false;
      })
    );
  }

  private createUserByEmail(user: User) {
    this.userService
      .createUser(user)
      .pipe(
        tap((userId: number) => console.log(`User created with ID: ${userId}`)),
        switchMap((userId: number) =>
          this.userService.SendUserVerificationEmail(userId).pipe(
            tap(() => {
              this.router.navigate(['/email-verification'], {
                queryParams: { email: user.workEmail },
              });
            })
          )
        )
      )
      .subscribe({
        error: (error) => {
          this.snackBar.open(`Sign up failed. ${error.error}`, 'Close', {
            verticalPosition: 'top',
          });
        },
      });
  }

  ngOnDestroy(): void {
    this.authService.setSkipNextAuthState(false);
    this.destroy$.next();
    this.destroy$.complete();
  }
}
