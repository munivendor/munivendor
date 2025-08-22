// import { Component, OnInit, OnDestroy } from '@angular/core';
// import { FormBuilder, FormGroup, Validators, AbstractControl } from '@angular/forms';
// import { ActivatedRoute, Router } from '@angular/router';
// import { MatDialog } from '@angular/material/dialog';
// import { Subject } from 'rxjs';
// import { takeUntil } from 'rxjs/operators';

// // Create a simple inline component
// @Component({
//   imports: [MatDialogModule, MatButtonModule],
//   standalone: true,
//   template: `
//     <mat-dialog-content>
//       <p>{{ message }}</p>
//     </mat-dialog-content>
//     <mat-dialog-actions align="end">
//       <button mat-raised-button color="primary" mat-dialog-close>Ok</button>
//     </mat-dialog-actions>
//   `,
// })
// export class SimpleDialogComponent {
//   message = '';
// }

// @Component({
//   selector: 'app-reset-password',
//   templateUrl: './reset-password.component.html',
//   styleUrls: ['./reset-password.component.css']
// })
// export class ResetPasswordComponent implements OnInit, OnDestroy {
//   private destroy$ = new Subject<void>();
//   resetPasswordForm!: FormGroup;
//   token!: string;
//   hidePassword = true;
//   hideConfirmPassword = true;
//   isLoading = false;

//   constructor(
//     private fb: FormBuilder,
//     private route: ActivatedRoute,
//     private router: Router,
//     public dialog: MatDialog
//   ) {}

//   ngOnInit() {
//     // Get token from route parameters
//     this.token = this.route.snapshot.paramMap.get('token') || '';

//     if (!this.token) {
//       // If no token, redirect to forgot password page
//       this.router.navigate(['/forgot-password']);
//       return;
//     }

//     this.resetPasswordForm = this.fb.group({
//       password: [
//         '',
//         [
//           Validators.required,
//           Validators.minLength(8),
//           this.passwordValidator
//         ]
//       ],
//       confirmPassword: [
//         '',
//         [Validators.required]
//       ]
//     }, { validators: this.passwordMatchValidator });
//   }

//   ngOnDestroy() {
//     this.destroy$.next();
//     this.destroy$.complete();
//   }

//   // Custom password validator
//   passwordValidator(control: AbstractControl): {[key: string]: any} | null {
//     const value = control.value;
//     if (!value) {
//       return null;
//     }

//     const hasNumber = /[0-9]/.test(value);
//     const hasUpper = /[A-Z]/.test(value);
//     const hasLower = /[a-z]/.test(value);
//     const hasSpecial = /[#?!@$%^&*-]/.test(value);

//     const passwordValid = hasNumber && hasUpper && hasLower && hasSpecial;

//     if (!passwordValid) {
//       return { passwordStrength: true };
//     }

//     return null;
//   }

//   // Custom validator to check if passwords match
//   passwordMatchValidator(form: AbstractControl): {[key: string]: any} | null {
//     const password = form.get('password');
//     const confirmPassword = form.get('confirmPassword');

//     if (password && confirmPassword && password.value !== confirmPassword.value) {
//       return { passwordMismatch: true };
//     }

//     return null;
//   }

//   onSubmit() {
//     if (this.resetPasswordForm.valid) {
//       this.isLoading = true;

//       const resetData = {
//         token: this.token,
//         password: this.resetPasswordForm.value.password
//       };

//       // TODO: Replace with your actual auth service call
//       // this.authService.resetPassword(resetData)
//       //   .pipe(takeUntil(this.destroy$))
//       //   .subscribe({
//       //     next: (response) => {
//       //       this.showSuccessDialog();
//       //     },
//       //     error: (error) => {
//       //       this.isLoading = false;
//       //       this.showErrorDialog(error.message);
//       //     }
//       //   });

//       // Simulate API call for demo
//       setTimeout(() => {
//         this.isLoading = false;
//         this.showSuccessDialog();
//       }, 2000);
//     }
//   }

//   private showSuccessDialog() {
//     // TODO: Replace with your actual dialog component
//     const dialogRef = this.dialog.open(ConfirmationDialogComponent, {
//       width: '400px',
//       disableClose: true,
//       data: {
//         title: 'Password Reset Successful',
//         message: 'Your password has been reset successfully. You will be redirected to the login page.',
//         buttonText: 'Continue to Login'
//       }
//     });

//     dialogRef.afterClosed().subscribe(() => {
//       this.router.navigate(['/login']);
//     });
//   }

//   private showErrorDialog(errorMessage: string) {
//     // TODO: Replace with your actual dialog component
//     this.dialog.open(ConfirmationDialogComponent, {
//       width: '400px',
//       data: {
//         title: 'Reset Failed',
//         message: errorMessage || 'Failed to reset password. Please try again or request a new reset link.',
//         buttonText: 'OK'
//       }
//     });
//   }

//   // Utility methods for template
//   getPasswordErrorMessage(): string {
//     const passwordControl = this.resetPasswordForm.get('password');

//     if (passwordControl?.hasError('required')) {
//       return 'Password is required';
//     }

//     if (passwordControl?.hasError('minlength')) {
//       return 'Password must be at least 8 characters long';
//     }

//     if (passwordControl?.hasError('passwordStrength')) {
//       return 'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character';
//     }

//     return '';
//   }

//   getConfirmPasswordErrorMessage(): string {
//     const confirmPasswordControl = this.resetPasswordForm.get('confirmPassword');

//     if (confirmPasswordControl?.hasError('required')) {
//       return 'Please confirm your password';
//     }

//     if (this.resetPasswordForm.hasError('passwordMismatch')) {
//       return 'Passwords do not match';
//     }

//     return '';
//   }

//   // Helper methods for password requirements validation in template
//   hasMinLength(): boolean {
//     const password = this.resetPasswordForm.get('password')?.value || '';
//     return password.length >= 8;
//   }

//   hasUppercase(): boolean {
//     const password = this.resetPasswordForm.get('password')?.value || '';
//     return /[A-Z]/.test(password);
//   }

//   hasLowercase(): boolean {
//     const password = this.resetPasswordForm.get('password')?.value || '';
//     return /[a-z]/.test(password);
//   }

//   hasNumber(): boolean {
//     const password = this.resetPasswordForm.get('password')?.value || '';
//     return /[0-9]/.test(password);
//   }

//   hasSpecialChar(): boolean {
//     const password = this.resetPasswordForm.get('password')?.value || '';
//     return /[#?!@$%^&*-]/.test(password);
//   }
// }

// // TODO: Create this component or replace with your existing confirmation dialog
// interface ConfirmationDialogComponent {}
