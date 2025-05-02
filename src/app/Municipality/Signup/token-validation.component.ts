import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { UserService } from '../../shared/service/user.service';
import { Subject, takeUntil } from 'rxjs';
import { AuthService } from '../../authorization/auth.service';
@Component({
  selector: 'token-validation',
  templateUrl: './token-validation.component.html',
  styleUrls: []
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
    private authService: AuthService
  ) { }

  ngOnInit() {
    this.route.queryParams
      .pipe(takeUntil(this.destroy$))
      .subscribe(params => {
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
    this.userService.ValidateEmailToken(token, userId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: response => {
          if (response === true) {
            // userId is now returned from the backend, we can set the authenticated user
            // and redirect to the municipality details page
            // this.authService.setAuthenticated(response, userId);
            this.verificationStatus = 'Verification successful! Redirecting to login...';
            setTimeout(() => this.router.navigate(['/login']), 5000);
          } else {
            this.verificationStatus = 'Verification failed. Invalid or expired token. Redirecting...';
            setTimeout(() => this.router.navigate(['/signup']), 5000);
          }
        }
      });
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }
}