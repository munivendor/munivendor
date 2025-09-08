import { Component, signal, output, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { AuthService } from '../authorization/auth.service';
import { CdkDragPlaceholder } from '@angular/cdk/drag-drop';
import { QrSetupComponent } from './qr-setup.component';
import { MatSnackBar } from '@angular/material/snack-bar';

export interface TwoStepVerificationStatus {
  isActive: boolean;
  label: string;
}

@Component({
  selector: 'app-two-step-verification',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    CdkDragPlaceholder,
    QrSetupComponent,
  ],
  templateUrl: './two-step-verification.component.html',
  styleUrl: './two-step-verification.component.scss',
})
export class TwoStepVerificationComponent implements OnInit {
  isMfaSetup = false;
  isActivated = false;
  isSetupStarted = false;

  constructor(
    private authService: AuthService,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.authService.userProfile$.pipe().subscribe((profile) => {
      this.isMfaSetup = profile?.isMfaEnabled ?? false;
      if (this.isMfaSetup) {
        this.isActivated = true;
        this.isSetupStarted = true;
      }
      this.updateVerificationStatus(this.isMfaSetup);
    });
  }
  // Using Angular v17 signals for reactive state management
  verificationStatus = signal<TwoStepVerificationStatus>({
    isActive: false,
    label: 'Not Active',
  });

  onActivate(): void {
    this.isActivated = true;
  }

  onSetup(): void {
    this.isSetupStarted = true;
  }

  onSetupComplete(isActive: any): void {
    this.isMfaSetup = isActive;
    this.updateVerificationStatus(isActive);
  }

  onDeactivate(): void {
    this.authService.deactivateMfa().subscribe({
      next: (res) => {
        this.snackBar.open(
          'Two-step verification has been deactivated.',
          'Close',
          {
            verticalPosition: 'top',
          }
        );
        this.isMfaSetup = false;
        this.isActivated = false;
        this.isSetupStarted = false;
      },
      error: (err) => {
        console.error('Failed to deactivate MFA', err);
        this.snackBar.open(
          'Failed to deactivate MFA. Please try again.',
          'Close',
          {
            verticalPosition: 'top',
          }
        );
      },
    });
  }

  // Method to update verification status (for parent component to call)
  updateVerificationStatus(isActive: boolean): void {
    this.verificationStatus.set({
      isActive,
      label: isActive ? 'Active' : 'Not Active',
    });
  }

  // Getter for template usage
  get isVerificationActive(): boolean {
    return this.verificationStatus().isActive;
  }

  get statusLabel(): string {
    return this.verificationStatus().label;
  }
}
