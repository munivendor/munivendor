import { RouterModule } from '@angular/router';
import { FormGroup, FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatCardModule } from '@angular/material/card';
import { Component, inject, OnInit } from '@angular/core';
import { GoogleSigninButtonModule } from '@abacritt/angularx-social-login';
import { Router } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { AuthService } from '../authorization/auth.service';
import { UserLogin } from '../shared/model/user-login.model';
import { MatSnackBar } from '@angular/material/snack-bar';

@Component({
  selector: 'login',
  standalone: true,
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css'],
  imports: [ReactiveFormsModule, RouterModule, CommonModule, MatButtonModule, MatInputModule, MatCardModule, MatSelectModule, GoogleSigninButtonModule],
})

export class LoginComponent implements OnInit {
  private _snackBar = inject(MatSnackBar);
  loginForm!: FormGroup;
  userId!: number;

  constructor(
    private fb: FormBuilder,
    public dialog: MatDialog,
    private authService: AuthService,
    private router: Router
  ) { }

  ngOnInit() {
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required]],
    });
  }

  onSubmit() {
    if (this.loginForm.valid) {
      const userLogin: UserLogin = {
        username: this.loginForm.controls["email"].value,
        password: this.loginForm.controls["password"].value
      };

      this.authService.login(userLogin).subscribe({
        // in future, add flag to navigate users to appropriate page based on whether they've completed the form
        next: () => this.router.navigate(['/government-agency-details']),
        error: (error) => {
          this._snackBar.open('Login failed: Invalid email, password, or unauthorized email.', 'Close', {
            duration: 3000,
            verticalPosition: 'top',
          });
        }
      });
    }
  }
}
