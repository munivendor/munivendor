import { Component, OnInit, OnDestroy } from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  Validators,
  ReactiveFormsModule,
  AbstractControl,
  ValidationErrors,
} from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatInputModule } from '@angular/material/input';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { Subject, takeUntil } from 'rxjs';
import { AuthService } from '../authorization/auth.service';
import { LoggingService } from '../exceptionhandling/logging.service';
import { SnackbarNotificationService } from '../shared/service/snackbar-notification.service';

@Component({
  selector: 'reset-password',
  standalone: true,
  templateUrl: './forgot-password-reset.component.html',
  styleUrls: ['./forgot-password-reset.component.css'],
  imports: [
    ReactiveFormsModule,
    RouterModule,
    CommonModule,
    MatButtonModule,
    MatInputModule,
    MatCardModule,
    MatIconModule,
    MatProgressSpinnerModule,
  ],
})
export class ForgotPasswordResetComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  resetPasswordForm!: FormGroup;

  token: string | null = null;
  userId: string | null = null;

  isValidatingToken = true;
  isTokenValid = false;
  isSubmitting = false;
  resetSuccess = false;

  hideNewPassword = true;
  hideConfirmPassword = true;

  tokenError = '';

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private authService: AuthService,
    private loggingService: LoggingService,
    private snackbarNotificationService: SnackbarNotificationService
  ) {}

  ngOnInit() {
    this.route.queryParams
      .pipe(takeUntil(this.destroy$))
      .subscribe((params) => {
        this.token = params['token'];

        if (!this.token) {
          this.isValidatingToken = false;
          this.isTokenValid = false;
          this.tokenError =
            'Invalid reset link. Please request a new password reset.';
          return;
        }

        this.isValidatingToken = false;
        this.isTokenValid = true;
      });

    this.resetPasswordForm = this.fb.group(
      {
        newPassword: [
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
        confirmPassword: ['', Validators.required],
      },
      {
        validators: this.passwordMatchValidator,
      }
    );
  }

  private passwordMatchValidator(
    control: AbstractControl
  ): ValidationErrors | null {
    const newPassword = control.get('newPassword');
    const confirmPassword = control.get('confirmPassword');

    if (!newPassword || !confirmPassword) {
      return null;
    }

    if (confirmPassword.value === '') {
      return null;
    }

    if (newPassword.value !== confirmPassword.value) {
      confirmPassword.setErrors({
        ...confirmPassword.errors,
        passwordMismatch: true,
      });
      return { passwordMismatch: true };
    } else {
      if (confirmPassword.errors) {
        delete confirmPassword.errors['passwordMismatch'];
        if (Object.keys(confirmPassword.errors).length === 0) {
          confirmPassword.setErrors(null);
        }
      }
    }

    return null;
  }

  onSubmit() {
    if (this.resetPasswordForm.valid && this.token) {
      this.isSubmitting = true;

      const newPassword = this.resetPasswordForm.value.newPassword;

      this.authService.resetPassword(this.token, newPassword).subscribe({
        next: (response) => {
          this.isSubmitting = false;
          this.resetSuccess = true;

          setTimeout(() => {
            this.router.navigate(['/login']);
          }, 5000);
        },
        error: (error) => {
          this.isSubmitting = false;
          this.tokenError =
            error.error || 'Something went wrong. Please try again later.';
          this.isTokenValid = false;

          const correlationId = error?.error?.correlationId;

          this.loggingService.logException(
            new Error(`HTTP Error ${error.status}: ${error.statusText}`),
            3,
            {
              correlationId: correlationId,
              methodName: 'onSubmit',
              className: 'ForgotPasswordResetComponent',
              operation: 'resetPassword',
              token: this.token,
            }
          );

          this.snackbarNotificationService.showSnackbarError(correlationId);
        },
      });
    }
  }

  getPasswordStrengthErrors(): string[] {
    const errors: string[] = [];
    const passwordControl = this.resetPasswordForm.get('newPassword');

    if (passwordControl?.hasError('passwordStrength')) {
      const strengthErrors = passwordControl.errors?.['passwordStrength'];

      if (!strengthErrors.hasUpperCase) {
        errors.push('at least one uppercase letter');
      }
      if (!strengthErrors.hasLowerCase) {
        errors.push('at least one lowercase letter');
      }
      if (!strengthErrors.hasNumeric) {
        errors.push('at least one number');
      }
      if (!strengthErrors.hasSpecialChar) {
        errors.push('at least one special character');
      }
    }

    return errors;
  }

  getPasswordErrorMessage(): string {
    const passwordControl = this.resetPasswordForm.get('newPassword');

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

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
