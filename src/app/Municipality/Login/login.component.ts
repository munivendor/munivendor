import { RouterModule } from '@angular/router';
import { FormGroup, FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatCardModule } from '@angular/material/card';
import { Component, OnInit, OnDestroy } from '@angular/core';
import { GoogleSigninButtonModule } from '@abacritt/angularx-social-login';
import { Router } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { AuthService } from '../../authorization/auth.service';
import { UserLogin } from '../../shared/model/user-login.model';
import { Subject, takeUntil, tap } from 'rxjs';
import { StateService } from '../../Request/services/state.service';

@Component({
  selector: 'login',
  standalone: true,
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css'],
  imports: [ReactiveFormsModule, RouterModule, CommonModule, MatButtonModule, MatInputModule, MatCardModule, MatSelectModule, GoogleSigninButtonModule],
})

export class LoginComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  loginForm!: FormGroup;
  userId!: number;

  constructor(
    private fb: FormBuilder,
    public dialog: MatDialog,
    private authService: AuthService,
    private router: Router,
    private stateService: StateService
  ) { }

  ngOnInit() {
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required]],
    });
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  onSubmit() {
    if (this.loginForm.valid) {
      const userLogin: UserLogin = {
        username: this.loginForm.controls["email"].value,
        password: this.loginForm.controls["password"].value
      };

      this.authService.login(userLogin)
        .pipe(
          takeUntil(this.destroy$),
          tap((userId) => {
            this.stateService.setUserId(userId);
            console.log(`User logged in with ID: ${userId}`);
          })
        )
        .subscribe({
          next: () => this.router.navigate(['/municipality-details']),
          error: (error) => console.error('Login failed:', error)
        });
    }
  }

}