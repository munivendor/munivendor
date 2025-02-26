import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { UserService } from '../../shared/service/user.service';

@Component({
  selector: 'token-validation',
  templateUrl: './token-validation.component.html',
  styleUrls: []
})
export class TokenValidationComponent implements OnInit {
  token: string | null = null;
  verificationStatus = 'Verifying...';

  constructor(
    private route: ActivatedRoute,
    private userService: UserService,
    private router: Router) { }

  ngOnInit() {
    this.route.queryParams.subscribe(params => {
      this.token = params['token'];
      if (this.token) {
        this.validateToken(this.token);
      } else {
        this.verificationStatus = 'Invalid or missing verification link.';
      }
    });
  }

  validateToken(token: string): void {
    this.userService.ValidateEmailToken(token).subscribe(response => {
      this.verificationStatus = 'Verification successful! Redirecting...';
      setTimeout(() => this.router.navigate(['/municipality-details']), 5000);
    },
      error => {
        console.error('Validation error:', error);
        this.verificationStatus = 'Verification failed. Invalid or expired token.';
      }
    );
  }
}



