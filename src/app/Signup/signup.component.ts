
import { RouterLink, RouterModule } from '@angular/router';
import { FormGroup, FormBuilder, ReactiveFormsModule, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
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
import { catchError, filter, finalize, Subject, switchMap, takeUntil, tap, throwError } from 'rxjs';
import { AuthService } from '../authorization/auth.service';
import { SignupService } from './services/signup.service';
import { OrganizationType } from '../shared/model/organization-type.model';

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
    GoogleSigninButtonModule],
  templateUrl: './signup.component.html',
  styleUrls: ['./signup.component.css'],
})

export class SignupComponent implements OnInit, OnDestroy {
  signupForm!: FormGroup;
  userId!: number;
  isLGA: boolean = false;
  organizationTypes: OrganizationType[] = [];
  private userSelectedOrgTypeId: number | null = null;
  private userCreationInProgress = false;
  private destroy$ = new Subject<void>();

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private userService: UserService,
    private router: Router,
    private signupService: SignupService
  ) { }

  ngOnInit(): void {
    this.initForm();

    this.signupService.getOrganizationTypes()
      .pipe(takeUntil(this.destroy$))
      .subscribe(organizationTypes => {
        this.organizationTypes = organizationTypes;
      });

    this.signupForm.get('organizationTypeId')?.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(value => {
        if (!this.isLGA) {
          this.userSelectedOrgTypeId = value;
        }
      });

    this.signupForm.get('email')?.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(email => {
        const orgControl = this.signupForm.get('organizationTypeId');

        if (email && email.endsWith('.gov')) {
          this.isLGA = true;
          orgControl?.setValue(1);
          orgControl?.disable();
        } else {
          this.isLGA = false;
          orgControl?.enable();
          if (this.userSelectedOrgTypeId !== null) {
            orgControl?.setValue(this.userSelectedOrgTypeId);
          } else {
            orgControl?.reset();
          }
        }
      });

    this.authService.user$
      .pipe(
        takeUntil(this.destroy$),
        filter(user => !!user && !this.userCreationInProgress),
        tap(user => {
          console.log("Google Authenticated User:", user);
          this.userCreationInProgress = true;
        })
      )
      .subscribe({
        next: (user) => {
          const municipalityUser: User = {
            firstName: user.firstName,
            lastName: user.lastName,
            workEmail: user.email,
            username: user.email,
            userIdentity: user.id,
            identityTypeId: 2
          };

          this.createUserByGoogle(municipalityUser);
        },
        error: (error) => {
          this.userCreationInProgress = false;
          console.error('Authentication error', error);
        }
      });
  }

  private initForm(): void {
    this.signupForm = this.fb.group({
      firstname: ['', [
        Validators.required,
        Validators.pattern(/^[A-Za-zÀ-ÖØ-öø-ÿ'' -]{3,50}$/)
      ]],
      lastname: ['', [
        Validators.required,
        Validators.pattern(/^[A-Za-zÀ-ÖØ-öø-ÿ'' -]{3,50}$/)
      ]],
      email: ['', [
        Validators.required,
        Validators.email,
        Validators.pattern(/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/)
      ]],
      username: [''],
      password: ['', [
        Validators.required,
        Validators.minLength(8),
        Validators.maxLength(64),
        Validators.pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]).{8,64}$/)
      ]],
      confirmPassword: ['', [Validators.required]],
      organizationTypeId: ['', [Validators.required]],
      userIdentity: [''],
      identityTypeId: ['']
    },
      {
        validators: this.passwordMatchValidator
      });
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
    const passwordControl = this.signupForm.get('password');

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

  private markFormGroupTouched(formGroup: FormGroup) {
    Object.values(formGroup.controls).forEach(control => {
      control.markAsTouched();

      if (control instanceof FormGroup) {
        this.markFormGroupTouched(control);
      }
    });
  }

  onSubmit() {
    if (this.signupForm.valid) {

      let municipalityUser: User = {
        firstName: this.signupForm.controls["firstname"].value,
        lastName: this.signupForm.controls["lastname"].value,
        workEmail: this.signupForm.controls["email"].value,
        organizationTypeId: this.signupForm.controls["organizationTypeId"].value,
        username: this.signupForm.controls["email"].value,
        password: this.signupForm.controls["password"].value,
        identityTypeId: 1
      };
      this.createUserByEmail(municipalityUser)
    } else {
      this.markFormGroupTouched(this.signupForm);
    }
  }

  private createUserByGoogle(user: User) {
    this.userService.createUser(user).pipe(
      switchMap(() => {
        const googleUserLogin: UserLogin = {
          userIdentity: user.userIdentity,
          username: user.username
        };
        return this.authService.login(googleUserLogin);
      }),
      catchError((error) => {
        this.userCreationInProgress = false;
        return throwError(() => error);
      }),
      finalize(() => {
        this.userCreationInProgress = false;
      })
    ).subscribe({
      next: () => this.router.navigate(['/role-verification']),
      error: (error) => {
        console.error('Failed to log in after Google sign-up:', error);
      }
    });
  }

  private createUserByEmail(user: User) {
    this.userService.createUser(user).pipe(
      tap((userId: number) => console.log(`User created with ID: ${userId}`)),
      switchMap((userId: number) =>
        this.userService.SendUserVerificationEmail(userId).pipe(
          tap(() => {
            this.router.navigate(['/email-verification'], { queryParams: { email: user.workEmail } });
          })
        )
      )
    ).subscribe({
      error: (error) => console.error('Error in user creation or email verification:', error)
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
