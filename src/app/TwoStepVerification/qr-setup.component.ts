import { Component, OnInit, Output, EventEmitter } from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  Validators,
  ReactiveFormsModule,
} from '@angular/forms';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService, MfaSetupResponse } from '../authorization/auth.service';

@Component({
  selector: 'qr-setup',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './qr-setup.component.html',
  styleUrl: './qr-setup.component.css',
})
export class QrSetupComponent implements OnInit {
  verificationForm: FormGroup;
  mfaSetup: MfaSetupResponse | null = null;
  isLoading = false;
  isVerified = false;
  errorMessage = '';

  @Output() setupComplete = new EventEmitter<boolean>();

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router
  ) {
    this.verificationForm = this.fb.group({
      code: ['', [Validators.required, Validators.pattern(/^\d{6}$/)]],
    });
  }

  ngOnInit() {
    this.setupMfa();
  }

  setupMfa() {
    this.authService.setupMfa().subscribe({
      next: (response) => {
        this.mfaSetup = response;
      },
      error: (error) => {
        this.errorMessage = 'Failed to setup MFA. Please try again.';
      },
    });
  }

  onVerify() {
    if (this.verificationForm.valid) {
      this.isLoading = true;
      this.errorMessage = '';

      this.authService.verifyMfa(this.verificationForm.value.code).subscribe({
        next: () => {
          this.isLoading = false;
          this.isVerified = true;
          this.setupComplete.emit(true);
        },
        error: (error) => {
          this.isLoading = false;
          this.errorMessage = 'Invalid code. Please try again.';
        },
      });
    }
  }

  isFieldInvalid(fieldName: string): boolean {
    const field = this.verificationForm.get(fieldName);
    return field ? field.invalid && field.touched : false;
  }
}
