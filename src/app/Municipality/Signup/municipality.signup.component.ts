
import { RouterLink, RouterModule } from '@angular/router';
import {  FormGroup,FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogTitle, MatDialogContent, MatDialogActions } from '@angular/material/dialog';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatCardModule } from '@angular/material/card';

import { Component, inject, OnInit } from '@angular/core';
import {  GoogleSigninButtonModule, SocialAuthService, SocialAuthServiceConfig, SocialLoginModule, SocialUser } from '@abacritt/angularx-social-login';
import { GoogleLoginProvider } from '@abacritt/angularx-social-login';

import { Router } from '@angular/router';
import { UserService } from './Services/user.service';
import { User } from './model/User';

import { Observable } from 'rxjs';
    import { map } from 'rxjs/operators';

const CLIENT_ID =  "954795010792-oafduvq9mhtlatg68rhl4hadtcuajos6.apps.googleusercontent.com";

@Component({
  selector: 'signup',
  standalone: true,
  imports: [ReactiveFormsModule, RouterModule, RouterLink, CommonModule, SocialLoginModule, GoogleSigninButtonModule, MatButtonModule, MatInputModule, MatCardModule, MatSelectModule],
  providers: [
    {
      provide: 'SocialAuthServiceConfig',
      useValue: {
        autoLogin: true,
        providers: [
          {
            id: GoogleLoginProvider.PROVIDER_ID,
            provider: new GoogleLoginProvider(CLIENT_ID)
          }
        ]
      } as SocialAuthServiceConfig
    },
    SocialAuthService
  ],
  templateUrl:'./municipality.signup.component.html' ,
  styleUrls:['./municipality.signup.component.css'], 
})

export class SignupComponent implements OnInit {
loginForm!: FormGroup;
userId!: number;

constructor (private fb: FormBuilder, private userService: UserService) {
}

  onSubmit() {
    if (this.loginForm.valid) {
      console.log(this.loginForm.value);
      this.loginForm.controls["email"].value
    }
  }

  private authService = inject(SocialAuthService);
  private router = inject(Router);
  user:SocialUser | undefined;

  ngOnInit() {
    this.authService.authState.subscribe((user) => {
      this.user = user;

      if (user) {
       /* if (user) {
          this.router.navigate(['/protected']);
        }*/
        
        this.createMunicipalityUser(user, 1);
      }
      else {
        console.log('User is not logged in');
      }
    });

    this.loginForm = this.fb.group({
      firstname: ['', [Validators.required, Validators.minLength(3)]],
      lastname: ['', [Validators.required, Validators.minLength(3)]],
      email: ['', Validators.email],
      title: '',
      phoneNumber: 'phone number (required)',
    })
  }

  private createMunicipalityUser(socialUser: SocialUser, municipalityId: number) {

    let municipalityUser: User = {
      firstName: socialUser.firstName,
      lastName: socialUser.lastName,
      workEmail: socialUser.email
    };

    /*this.saveUser(municipalityUser, municipalityId);
    console.log('User is logged in:', this.user);*/

    this.saveUser(municipalityUser, municipalityId).subscribe(
      (userId: number) => {
        console.log('User ID:', userId);
      },
      (error) => {
        console.error('Error saving user', error);
      }
    );
    
  }

  signInWithGoogle(): void {
    this.authService.signIn(GoogleLoginProvider.PROVIDER_ID).then(user => {
     
     
      console.log(user);
    }).catch(error => {
      console.error(error);
    });
  }

  signOut(): void {
    this.authService.signOut().then(() => {
      console.log('Signed out successfully');
    }).catch(error => {
      console.error(error);
    });
  }

  /*saveUser(municipalityUser: User, municipalityId: number): void 
  { 
    this.userService.SaveUser(municipalityUser, municipalityId).subscribe( (userId:number) => { 
      this.userId = userId; },
     (error) => { console.error('Error fetching users', error); } 
    ); 
  }*/
    
    
    saveUser(municipalityUser: User, municipalityId: number): Observable<number> 
    { 
      return this.userService.SaveUser(municipalityUser).pipe(
        map((userId: number) => {
          this.userId = userId; 
          return userId;
        })
      );
    }
    
  
}
