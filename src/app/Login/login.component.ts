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
import { Component, OnInit } from '@angular/core';
import { GoogleSigninButtonModule } from '@abacritt/angularx-social-login';
import { MatDialog } from '@angular/material/dialog';
import { AuthService } from '../authorization/auth.service';
import { UserLogin } from '../shared/model/user-login.model';
import { LoggingService } from '../exceptionhandling/logging.service';
import { SnackbarNotificationService } from '../shared/service/snackbar-notification.service';

@Component({
  selector: 'login',
  standalone: true,
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css'],
  imports: [
    ReactiveFormsModule,
    RouterModule,
    CommonModule,
    MatButtonModule,
    MatInputModule,
    MatCardModule,
    MatSelectModule,
    GoogleSigninButtonModule,
  ],
})
export class LoginComponent implements OnInit {
  loginForm!: FormGroup;
  buttonWidth = 400;

  constructor(
    private fb: FormBuilder,
    public dialog: MatDialog,
    private authService: AuthService,
    private loggingService: LoggingService,
    private snackbarNotificationService: SnackbarNotificationService
  ) {}

  ngOnInit() {
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required]],
    });
  }

  onSubmit(): void {
    const userLogin: UserLogin = {
      username: this.loginForm.controls['email'].value,
      password: this.loginForm.controls['password'].value,
    };

    const email = this.loginForm.controls['email'].value;

    this.authService.login(userLogin).subscribe({
      next: (response) => {
        this.authService.completeEmailLogin(response, email);
      },
      error: (error) => {
        // Extract correlationId
        const correlationId = error?.error?.correlationId;
        this.loggingService.logException(
          new Error(`HTTP Error ${error.status}: ${error.statusText}`),
          3,
          {
            userLogin: userLogin,
            correlationId: correlationId,
            methodName: 'onSubmit',
            className: 'LoginComponent',
            operation: 'login',
          }
        );
        this.snackbarNotificationService.showUploadError(correlationId);
      },
    });
  }
}
