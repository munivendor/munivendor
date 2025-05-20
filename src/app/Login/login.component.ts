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
  
  // login by email
  // in future, add flag to navigate users to appropriate page based on whether they've completed the form
  onSubmit() {
    if (this.loginForm.valid) {
      const userLogin: UserLogin = {
        username: this.loginForm.controls["email"].value,
        password: this.loginForm.controls["password"].value
      };
  
      // Check if email has .gov extension
      const email = this.loginForm.controls["email"].value;
      const isGovEmail = email.toLowerCase().endsWith('.gov');
  
      this.authService.login(userLogin).subscribe({
        next: () => { 
          // Navigate based on email domain AND if user is LGA or Offeror AND what progress they have made
          // in completing each of the forms
          if (isGovEmail) {
            this.router.navigate(['/government-agency-details']);
          } else {
            this.router.navigate(['/role-verification']);
          }
        },
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
