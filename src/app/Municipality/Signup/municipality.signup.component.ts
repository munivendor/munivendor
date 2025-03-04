
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
import { Observable } from 'rxjs';
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
      organization: ['', [Validators.required]],
    });
  }

  ngOnInit(): void {
    this.authService.user$.subscribe((user) => {
      if (user) {
        console.log("Google Authenticated User:", user);
        const municipalityUser: User = {
          firstName: user.firstName,
          lastName: user.lastName,
          workEmail: user.email,
  
        };

        this.createGoogleMunivendorUser(municipalityUser)
      }
    });

    this.signupForm.get('email')?.valueChanges.subscribe(email => {
      if (email && email.endsWith('.gov')) {
        this.signupForm.get('organization')?.setValue('LGO');
        this.isLGO = true;
      } else {
        this.isLGO = false;
        this.signupForm.get('organization')?.reset();
      }
      this.cdRef.detectChanges();
    });
  }

  onSubmit() {
    if (this.signupForm.valid) {
      console.log(this.signupForm.value);

      let municipalityUser: User = {
        firstName: this.signupForm.controls["firstname"].value,
        lastName: this.signupForm.controls["lastname"].value,
        workEmail: this.signupForm.controls["email"].value,
        organization: this.signupForm.controls["organization"].value,
      };
      this.createManualMunivendorUser(municipalityUser)
    }
  }

  private createGoogleMunivendorUser(user: User) {
    this.saveMunivendorUser(user).subscribe(
      (userId: number) => {
        // hit login endpoint API and add switch cases to check which frames users will be directed to as returning user
        // switch 
        // dashboard-component
        this.router.navigate(['/role-verification']);
      },
      (error) => {
        console.error('Error saving user', error);
      }
    );
  }

  private createManualMunivendorUser(user: User) {
    this.saveMunivendorUser(user).subscribe(
      (userId: number) => {
        // TODO: user$ observable is still not logged in at this point
        // until they finish filling all the details

       

        // IF user navigates directly to dashboard
        // Update user$ observable with the newly created user
        // const updatedUser: SocialUser = {
        //   ...user, 
        //   id: userId.toString(),
        // };
        // this.authService.setUser(updatedUser);

        this.sendUserEmailVerification(userId, user);
      },
      (error) => {
        console.error('Error saving user', error);
      }
    );
  }

  saveMunivendorUser(municipalityUser: User): Observable<number> {
    return this.userService.createUser(municipalityUser);
  }

  sendUserEmailVerification(userId: number, user: any): any {
    this.userService.SendUserVerificationEmail(userId).subscribe({
      next: () => {
        // send verification email
        // user clicks on the verification email
        // if successful, redirect to login page
        // user logs in with login endpoint

        // hit login endpoint API and add switch cases to check which frames users will be directed to as returning user
        // switch 
        // dashboard-component
        this.router.navigate(['/municipality-verification'], { queryParams: { email: user.workEmail } });
      },
      error: (error) => {
        console.log('Error in sending verification email:', error)
      }
    })
  }
}
