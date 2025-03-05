
import { RouterLink, RouterModule } from '@angular/router';
import { FormGroup, FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatCardModule } from '@angular/material/card';
import { ChangeDetectorRef } from '@angular/core';
import { Component, OnInit } from '@angular/core';
import { GoogleSigninButtonModule } from '@abacritt/angularx-social-login';
import { Router } from '@angular/router';
import { UserService } from '../../shared/service/user.service';
import { User } from '../../shared/model/user.model';
import { UserLogin } from '../../shared/model/user-login.model';
import { catchError, distinctUntilChanged, filter, finalize, Subject, switchMap, takeUntil, tap, throwError } from 'rxjs';
import { AuthService } from '../../authorization/auth.service';

@Component({
  selector: 'signup',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    RouterModule,
    RouterLink,
    CommonModule,
    MatButtonModule,
    MatInputModule,
    MatCardModule,
    MatSelectModule,
    GoogleSigninButtonModule],
  templateUrl: './municipality.signup.component.html',
  styleUrls: ['./municipality.signup.component.css'],
})

export class SignupComponent implements OnInit {
  signupForm!: FormGroup;
  userId!: number;
  isLGO: boolean = false;
  private userCreationInProgress = false;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private userService: UserService,
    private router: Router,
    private cdRef: ChangeDetectorRef
  ) {

    this.signupForm = this.fb.group({
      firstname: ['', [Validators.required, Validators.pattern(/^[A-Za-zÀ-ÖØ-öø-ÿ'’ -]{3,50}$/)]],
      lastname: ['', [Validators.required, Validators.pattern(/^[A-Za-zÀ-ÖØ-öø-ÿ'’ -]{3,50}$/)]],
      email: ['', [Validators.required, Validators.email, Validators.pattern(/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/)]],
      username: '',
      password: '',
      confirmPassword: '',
      organization: ['', [Validators.required]],
      userIdentity: '',
      identityTypeId: ''
    });
  }

  private destroy$ = new Subject<void>();
  ngOnInit(): void {  
    this.authService.user$
    .pipe(
      takeUntil(this.destroy$),
      // Prevent duplicate emissions based on user ID
      distinctUntilChanged((prev, curr) => prev?.id === curr?.id),
      // Only proceed if user exists and no creation is in progress
      filter(user => !!user && !this.userCreationInProgress),
      // Tap for side effects like form population
      tap(user => {
        console.log("Google Authenticated User:", user);

        this.signupForm.patchValue({
          firstname: user.firstName || '',
          lastname: user.lastName || '',
          email: user.email || '',
          userIdentity: user.id || ''
        });

        // Set flag to prevent multiple concurrent creations
        this.userCreationInProgress = true;
      })
    )
    .subscribe({
      next: (user) => {
        const municipalityUser: User = {
          firstName: user.firstName,
          lastName: user.lastName,
          workEmail: user.email,
          username: user.email,
          userIdentity: user.id,
          identityTypeId: 2
        };

        this.createGoogleUser(municipalityUser);
      },
      error: (error) => {
        this.userCreationInProgress = false;
        console.error('Authentication error', error);
      }
    });

    this.signupForm.get('email')?.valueChanges.pipe(takeUntil(this.destroy$)).subscribe(email => {
      if (email && email.endsWith('.gov')) {
        this.signupForm.get('organization')?.setValue('LGO');
        this.isLGO = true;
      } else {
        this.isLGO = false;
        this.signupForm.get('organization')?.reset();
      }
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  onSubmit() {
    if (this.signupForm.valid) {
      console.log(this.signupForm.value);

      let municipalityUser: User = {
        firstName: this.signupForm.controls["firstname"].value,
        lastName: this.signupForm.controls["lastname"].value,
        workEmail: this.signupForm.controls["email"].value,
        organization: this.signupForm.controls["organization"].value,
        username: this.signupForm.controls["email"].value,
        password: this.signupForm.controls["password"].value,
        identityTypeId: 1
      };
      this.createManualUser(municipalityUser)
    }
  }

  private createGoogleUser(user: User) {
    this.userService.createUser(user).pipe(
      switchMap(() => {
        const googleUserLogin: UserLogin = { 
          userIdentity: user.userIdentity, 
          username: user.username 
        };
        return this.authService.login(googleUserLogin);
      }),
      catchError((error) => {
        this.userCreationInProgress = false;
        return throwError(() => error);
      }),
      finalize(() => {
        this.userCreationInProgress = false;
      })
    ).subscribe({
      next: () => this.router.navigate(['/role-verification']),
      error: (error) => {
        console.error('Failed to log in after Google sign-up:', error);
      }
    });
  }

  private createManualUser(user: User) {
    this.userService.createUser(user).pipe(
      tap((userId: number) => console.log(`User created with ID: ${userId}`)),
      switchMap((userId: number) => 
        this.userService.SendUserVerificationEmail(userId).pipe(
          tap(() => {
            this.router.navigate(['/municipality-verification'], { queryParams: { email: user.workEmail } });
          })
        )
      )
    ).subscribe({
      error: (error) => console.error('Error in user creation or email verification:', error)
    });
  }
}
