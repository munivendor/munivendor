import { RouterModule } from '@angular/router';
import { FormGroup, FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatCardModule } from '@angular/material/card';
import { Component, OnInit } from '@angular/core';
import { GoogleSigninButtonModule} from '@abacritt/angularx-social-login';
import { Router } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { AuthService } from '../../authorization/auth.service';
import { UserLogin } from '../../shared/model/user-login.model';

@Component({
  selector: 'login',
  standalone: true,
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css'],
  imports: [ReactiveFormsModule, RouterModule, CommonModule, MatButtonModule, MatInputModule, MatCardModule, MatSelectModule, GoogleSigninButtonModule],
})

export class LoginComponent implements OnInit {
  loginForm!: FormGroup;
  userId!: number;

  constructor(
    private fb: FormBuilder,
    public dialog: MatDialog,
    private authService: AuthService,
    private router: Router
  ) {}

  ngOnInit() {
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required]],
    });
  
    this.authService.user$.subscribe((user) => {
      if (user && this.authService.getGoogleSignIn()) {
        console.log("Google Authenticated User:", user);
        const googleUserLogin: UserLogin = { userIdentity: user.id };
        this.loginWithGoogle(googleUserLogin);
      }
    });
  }

  onSubmit() {
    if (this.loginForm.valid) {
      const userLogin: UserLogin = {
        username: this.loginForm.controls["email"].value,
        password: this.loginForm.controls["password"].value
      };
  
      this.authService.setGoogleSignIn(false);
  
      this.authService.login(userLogin).subscribe({
        next: () => this.router.navigate(['/municipality-details']),
        error: (error) => console.error('Login failed:', error)
      });
    }
  }

  private loginWithGoogle(userLogin: UserLogin) {
    this.authService.setGoogleSignIn(true);
    this.authService.login(userLogin, 'login').subscribe({
      next: () => this.router.navigate(['/role-verification']),
      error: (error) => console.error('Google Login failed:', error)
    });
  }
}
