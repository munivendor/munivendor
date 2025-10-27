import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { UserService } from '../shared/service/user.service';
import { Subject, takeUntil } from 'rxjs';
import { MatCardModule } from '@angular/material/card';
import { CommonModule } from '@angular/common';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { LoggingService } from '../exceptionhandling/logging.service';
import { AppConstants } from '../constants/app.constants';

@Component({
  selector: 'token-validation',
  templateUrl: './token-validation.component.html',
  styleUrls: [],
  standalone: true,
  imports: [CommonModule, MatCardModule, MatProgressSpinnerModule],
})
export class TokenValidationComponent implements OnInit, OnDestroy {
  token: string | null = null;
  userId: number | null = null;
  verificationStatus = 'Verifying...';
  private destroy$ = new Subject<void>();

  constructor(
    private route: ActivatedRoute,
    private userService: UserService,
    private router: Router,
    private loggingService: LoggingService
  ) {}

  ngOnInit() {
    this.route.queryParams
      .pipe(takeUntil(this.destroy$))
      .subscribe((params) => {
        this.token = params['token'];
        this.userId = params['userId'];
        if (this.token) {
          if (this.userId !== null) {
            this.validateToken(this.token, this.userId);
          } else {
            this.verificationStatus = 'Invalid or missing user ID.';
          }
        } else {
          this.verificationStatus = 'Invalid or missing verification link.';
        }
      });
  }

  validateToken(token: string, userId: number): void {
    this.userService
      .ValidateEmailToken(token, userId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          if (response === true) {
            this.verificationStatus =
              'Verification successful! Redirecting to login...';
            setTimeout(() => this.router.navigate(['/login']), 5000);
          } else {
            this.verificationStatus =
              'Verification failed. Invalid or expired token. Redirecting...';
            setTimeout(() => this.router.navigate(['/signup']), 5000);
          }
        },
        error: (error) => {
          // Extract correlationId
          const correlationId = error?.error?.correlationId;
          this.verificationStatus = `Something went wrong. Please try again later. (Correlation ID: ${correlationId}). ${AppConstants.SUPPORT_MESSAGE}`;

          this.loggingService.logException(
            new Error(`HTTP Error ${error.status}: ${error.statusText}`),
            3,
            {
              token: token,
              userId: userId,
              correlationId: correlationId,
              methodName: 'validateToken',
              className: 'TokenValidationComponent',
              operation: 'ValidateEmailToken',
            }
          );
        },
      });
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
