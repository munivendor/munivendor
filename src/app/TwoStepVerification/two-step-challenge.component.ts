import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Router } from '@angular/router';
import { AuthService } from '../authorization/auth.service';

@Component({
  selector: 'app-two-step-challenge',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './two-step-challenge.component.html',
  styleUrls: ['./two-step-challenge.component.scss'],
})
export class TwoStepChallengeComponent {
  private authService = inject(AuthService);
  private snackBar = inject(MatSnackBar);
  private router = inject(Router);

  code = '';
  loading = signal(false);

  submit(): void {
    if (!this.code.trim()) {
      this.snackBar.open('Please enter the verification code.', 'Close', {
        verticalPosition: 'top',
      });
      return;
    }

    this.loading.set(true);
    this.authService.verifyMfa(this.code).subscribe({
      next: (response) => {
        this.snackBar.open('MFA verification successful!', 'Close', {
          verticalPosition: 'top',
        });
        this.loading.set(false);
        this.authService.setMfaVerified(true);
        // continue login process
        this.authService.completeEmailLogin(response.userId, '');
      },
      error: (error) => {
        console.error('MFA verification failed:', error);
        this.snackBar.open('Invalid code, please try again.', 'Close', {
          verticalPosition: 'top',
        });
        this.loading.set(false);
      },
    });
  }

  onDeactivate(): void {
    this.authService.deactivateMfa().subscribe({
      next: (response) => {
        // update local state so UI hides MFA row
        const isMfaRequired = this.authService.isMfaRequired();
        const isMfaSetup = this.authService.isMfaVerified();

        // also reset AuthService observables
        this.authService.setMfaVerified(false);

        this.snackBar.open(
          response.message || 'Two-step verification disabled',
          'Close',
          {
            duration: 3000,
            verticalPosition: 'top',
          }
        );
      },
      error: (error) => {
        console.error('Deactivate MFA failed:', error);
        this.snackBar.open('Failed to disable Two-step verification', 'Close', {
          duration: 3000,
          verticalPosition: 'top',
        });
      },
    });
  }
}
