import { RouterModule } from '@angular/router';
import {
  FormGroup,
  FormBuilder,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatCardModule } from '@angular/material/card';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { Component, OnInit, OnDestroy, Inject } from '@angular/core';
import { GoogleSigninButtonModule } from '@abacritt/angularx-social-login';
import {
  MAT_DIALOG_DATA,
  MatDialog,
  MatDialogModule,
  MatDialogRef,
} from '@angular/material/dialog';
import { Subject, takeUntil } from 'rxjs';
import { AuthService } from '../authorization/auth.service';
import { LoggingService } from '../exceptionhandling/logging.service';
import { MatSnackBar } from '@angular/material/snack-bar';
import { SnackbarNotificationService } from '../shared/service/snackbar-notification.service';

@Component({
  imports: [
    MatDialogModule,
    MatButtonModule,
    MatProgressSpinnerModule,
    CommonModule,
  ],
  standalone: true,
  template: `
    <mat-dialog-content>
      <p>{{ message }}</p>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button
        mat-button
        color="primary"
        (click)="onResendClick()"
        [disabled]="isLoading"
      >
        {{ isLoading ? 'Sending...' : 'Resend Link' }}
      </button>
      <button mat-raised-button color="primary" mat-dialog-close>Ok</button>
    </mat-dialog-actions>
  `,
})
export class ResendPasswordResetDialog {
  message = '';
  isLoading = false;
  email = '';

  constructor(
    public dialogRef: MatDialogRef<ResendPasswordResetDialog>,
    private loggingService: LoggingService,
    @Inject(MAT_DIALOG_DATA) public data: any,
    private authService: AuthService,
    private snackbarNotificationService: SnackbarNotificationService
  ) {
    this.email = data?.email || '';
  }

  onResendClick() {
    this.isLoading = true;
    this.authService.sendPasswordReset(this.email).subscribe({
      next: (response) => {
        this.isLoading = false;
        this.message = 'Reset link sent successfully! Please check your email.';
      },
      error: (error) => {
        this.isLoading = false;

        const correlationId = error?.error?.correlationId;

        this.loggingService.logException(
          new Error(`HTTP Error ${error.status}: ${error.statusText}`),
          3,
          {
            email: this.email,
            correlationId: correlationId,
            methodName: 'onResendClick',
            className: 'ResendPasswordResetDialog',
            operation: 'sendPasswordReset',
          }
        );

        this.snackbarNotificationService.showSnackbarSupportErrorWithCorrelationId(
          correlationId
        );
      },
    });
  }
}

@Component({
  selector: 'forgot-password',
  standalone: true,
  templateUrl: './forgot-password.component.html',
  styleUrls: ['./forgot-password.component.css'],
  imports: [
    ReactiveFormsModule,
    RouterModule,
    CommonModule,
    MatButtonModule,
    MatInputModule,
    MatCardModule,
    MatSelectModule,
    GoogleSigninButtonModule,
    MatDialogModule,
    MatProgressSpinnerModule,
  ],
})
export class ForgotPasswordComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  forgotPasswordForm!: FormGroup;
  userId!: number;
  showResendButton = false;
  currentEmail = '';
  isLoading = false;

  constructor(
    private fb: FormBuilder,
    public dialog: MatDialog,
    private authService: AuthService,
    private loggingService: LoggingService,
    private snackbarNotificationService: SnackbarNotificationService
  ) {}

  onSubmit() {
    if (this.forgotPasswordForm.valid) {
      this.currentEmail = this.forgotPasswordForm.value.email;
      this.isLoading = true;
      this.forgotPasswordForm.get('email')?.disable();

      this.authService.sendPasswordReset(this.currentEmail).subscribe({
        next: (response) => {
          this.isLoading = false;
          this.forgotPasswordForm.get('email')?.enable();
          this.openDialog();
        },
        error: (error) => {
          this.isLoading = false;
          this.forgotPasswordForm.get('email')?.enable();

          const correlationId = error?.error?.correlationId;

          this.loggingService.logException(
            new Error(`HTTP Error ${error.status}: ${error.statusText}`),
            3,
            {
              email: this.currentEmail,
              correlationId: correlationId,
              methodName: 'onSubmit',
              className: 'ForgotPasswordComponent',
              operation: 'sendPasswordReset',
            }
          );

          this.snackbarNotificationService.showSnackbarSupportErrorWithCorrelationId(
            correlationId
          );
        },
      });
    }
  }

  onResendLink() {
    this.isLoading = true;
    this.forgotPasswordForm.get('email')?.disable();

    this.authService.sendPasswordReset(this.currentEmail).subscribe({
      next: (response) => {
        this.isLoading = false;
        this.forgotPasswordForm.get('email')?.enable();
        this.openDialog();
      },
      error: (error) => {
        this.isLoading = false;
        this.forgotPasswordForm.get('email')?.enable();

        const correlationId = error?.error?.correlationId;

        this.loggingService.logException(
          new Error(`HTTP Error ${error.status}: ${error.statusText}`),
          3,
          {
            email: this.currentEmail,
            correlationId: correlationId,
            methodName: 'onResendClick',
            className: 'ForgotPasswordComponent',
            operation: 'sendPasswordReset',
          }
        );

        this.snackbarNotificationService.showSnackbarSupportErrorWithCorrelationId(
          correlationId
        );
      },
    });
  }

  private openDialog() {
    const dialogRef = this.dialog.open(ResendPasswordResetDialog, {
      width: '400px',
      data: { email: this.currentEmail },
    });

    dialogRef.componentInstance.message = `We've sent a password reset link to ${this.currentEmail}. Please check your email and follow the instructions.`;

    dialogRef.afterClosed().subscribe((result) => {
      this.showResendButton = true;
    });
  }

  ngOnInit() {
    this.forgotPasswordForm = this.fb.group({
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
    });

    this.forgotPasswordForm
      .get('email')
      ?.valueChanges.pipe(takeUntil(this.destroy$))
      .subscribe((newEmail) => {
        if (this.showResendButton && newEmail !== this.currentEmail) {
          this.showResendButton = false;
        }
      });
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
