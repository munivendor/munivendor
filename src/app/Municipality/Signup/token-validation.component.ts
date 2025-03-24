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
        if (this.token) {
          this.validateToken(this.token);
        } else {
          this.verificationStatus = 'Invalid or missing verification link.';
        }
      });
  }

  validateToken(token: string): void {
    this.userService.ValidateEmailToken(token)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: response => {
          if (response === true) {
            const userData = { emailVerified: true };
            this.authService.setAuthenticated(true, userData);
            this.verificationStatus = 'Verification successful! Redirecting...';
            setTimeout(() => this.router.navigate(['/municipality-details']), 5000);
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