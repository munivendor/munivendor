import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { UserService } from '../../shared/service/user.service';
import { Subject, takeUntil } from 'rxjs';

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
    private router: Router
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
          this.verificationStatus = 'Verification successful! Redirecting...';
          setTimeout(() => this.router.navigate(['/municipality-details']), 5000);
        },
        error: error => {
          console.error('Validation error:', error);
          this.verificationStatus = 'Verification failed. Invalid or expired token.';
        }
      });
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }
}