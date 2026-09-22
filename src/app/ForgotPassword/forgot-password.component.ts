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
import { Subject, interval, take, takeUntil } from 'rxjs';
import { AuthService } from '../authorization/auth.service';
import { LoggingService } from '../exceptionhandling/logging.service';
import { SnackbarNotificationService } from '../shared/service/snackbar-notification.service';

const RESEND_COOLDOWN_SECONDS = 60;

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
        [disabled]="isLoading || cooldownRemaining > 0"
      >
        {{
          isLoading
            ? 'Sending...'
            : cooldownRemaining > 0
              ? 'Resend Link (' + cooldownRemaining + 's)'
              : 'Resend Link'
        }}
      </button>
      <button mat-raised-button color="primary" mat-dialog-close>Ok</button>
    </mat-dialog-actions>
  `,
})
export class ResendPasswordResetDialog implements OnDestroy {
  private destroy$ = new Subject<void>();
  message = '';
  isLoading = false;
  email = '';
  cooldownRemaining = 0;

  constructor(
    public dialogRef: MatDialogRef<ResendPasswordResetDialog>,
    private loggingService: LoggingService,
    @Inject(MAT_DIALOG_DATA) public data: any,
    private authService: AuthService,
    private snackbarNotificationService: SnackbarNotificationService,
  ) {
    this.email = data?.email || '';
    this.cooldownRemaining = data?.cooldownRemaining || 0;
    if (this.cooldownRemaining > 0) {
      this.startCooldown(this.cooldownRemaining);
    }
  }

  onResendClick() {
    if (this.isLoading || this.cooldownRemaining > 0) {
      return;
    }

    this.isLoading = true;
    this.authService.sendPasswordReset(this.email).subscribe({
      next: (response) => {
        this.isLoading = false;
        this.message = 'Reset link sent successfully! Please check your email.';
        this.startCooldown(RESEND_COOLDOWN_SECONDS);
      },
      error: (error) => {
        this.isLoading = false;
        this.startCooldown(RESEND_COOLDOWN_SECONDS);

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
          },
        );

        this.snackbarNotificationService.showSnackbarSupportErrorWithCorrelationId(
          correlationId,
        );
      },
    });
  }

  private startCooldown(seconds: number) {
    this.cooldownRemaining = seconds;
    interval(1000)
      .pipe(take(seconds), takeUntil(this.destroy$))
      .subscribe(() => {
        this.cooldownRemaining--;
      });
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
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
  cooldownRemaining = 0;

  constructor(
    private fb: FormBuilder,
    public dialog: MatDialog,
    private authService: AuthService,
    private loggingService: LoggingService,
    private snackbarNotificationService: SnackbarNotificationService,
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
          this.startCooldown();
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
            },
          );

          this.snackbarNotificationService.showSnackbarSupportErrorWithCorrelationId(
            correlationId,
          );
        },
      });
    }
  }

  onResendLink() {
    if (this.isLoading || this.cooldownRemaining > 0) {
      return;
    }

    this.isLoading = true;
    this.forgotPasswordForm.get('email')?.disable();

    this.authService.sendPasswordReset(this.currentEmail).subscribe({
      next: (response) => {
        this.isLoading = false;
        this.forgotPasswordForm.get('email')?.enable();
        this.startCooldown();
        this.openDialog();
      },
      error: (error) => {
        this.isLoading = false;
        this.forgotPasswordForm.get('email')?.enable();
        this.startCooldown();

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
          },
        );

        this.snackbarNotificationService.showSnackbarSupportErrorWithCorrelationId(
          correlationId,
        );
      },
    });
  }

  private startCooldown() {
    this.cooldownRemaining = RESEND_COOLDOWN_SECONDS;
    interval(1000)
      .pipe(take(RESEND_COOLDOWN_SECONDS), takeUntil(this.destroy$))
      .subscribe(() => {
        this.cooldownRemaining--;
      });
  }

  private openDialog() {
    const dialogRef = this.dialog.open(ResendPasswordResetDialog, {
      width: '400px',
      data: {
        email: this.currentEmail,
        cooldownRemaining: this.cooldownRemaining,
      },
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
            /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
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
