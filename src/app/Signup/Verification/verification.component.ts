import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Subject, takeUntil, finalize } from 'rxjs';
import { CommonModule } from '@angular/common';
import { UserService } from '../../shared/service/user.service';
import { StateService } from '../../Request/services/state.service';
import { MatButtonModule } from '@angular/material/button';
import { LoggingService } from '../../exceptionhandling/logging.service';
import { SnackbarNotificationService } from '../../shared/service/snackbar-notification.service';

@Component({
  selector: 'verification',
  standalone: true,
  imports: [CommonModule, MatButtonModule],
  templateUrl: './verification.component.html',
  styleUrls: ['./verification.component.css'],
})
export class EmailVerification implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  email: string | null = null;
  isResending: boolean = false;
  resendMessage: string = '';
  isSuccess: boolean = false;
  countdown: number = 0;
  userId: number | null;
  private countdownInterval: any;

  constructor(
    private route: ActivatedRoute,
    private userService: UserService,
    private stateService: StateService,
    private loggingService: LoggingService,
    private snackbarNotificationService: SnackbarNotificationService
  ) {
    this.userId = this.stateService.getUserId();
  }

  ngOnInit() {
    this.route.queryParams
      .pipe(takeUntil(this.destroy$))
      .subscribe((params) => {
        this.email = params['email'] || 'your email';
      });
  }

  resendVerificationEmail() {
    if (this.isResending || this.countdown > 0) return;

    this.isResending = true;
    this.resendMessage = '';

    this.userService
      .SendUserVerificationEmail(Number(this.userId))
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => {
          this.isResending = false;
        })
      )
      .subscribe({
        next: (response) => {
          this.handleResendSuccess();
        },
        error: (error) => {
          this.handleResendError('An unexpected error occurred.');
          const correlationId = error?.error?.correlationId;
          this.loggingService.logException(
            new Error(`HTTP Error ${error.status}: ${error.statusText}`),
            3,
            {
              userId: Number(this.userId),
              correlationId: correlationId,
              methodName: 'resendVerificationEmail',
              className: 'EmailVerification',
              operation: 'SendUserVerificationEmail',
            }
          );

          this.snackbarNotificationService.showSnackbarSupportErrorWithCorrelationId(
            correlationId
          );
        },
      });
  }

  private handleResendSuccess() {
    this.isResending = false;
    this.isSuccess = true;
    this.resendMessage = 'Verification email sent successfully!';
    this.startCountdown(60);
  }

  private handleResendError(error: any) {
    this.isResending = false;
    this.isSuccess = false;
    this.resendMessage = 'Failed to resend email. Please try again.';
  }

  private startCountdown(seconds: number) {
    this.countdown = seconds;
    this.countdownInterval = setInterval(() => {
      this.countdown--;
      if (this.countdown <= 0) {
        clearInterval(this.countdownInterval);
        this.resendMessage = '';
      }
    }, 1000);
  }

  getButtonText(): string {
    if (this.isResending) {
      return 'Sending...';
    } else if (this.countdown > 0) {
      return `Resend in ${this.countdown}s`;
    } else {
      return 'Resend Email';
    }
  }

  ngOnDestroy() {
    if (this.countdownInterval) {
      clearInterval(this.countdownInterval);
    }
    this.destroy$.next();
    this.destroy$.complete();
  }
}
