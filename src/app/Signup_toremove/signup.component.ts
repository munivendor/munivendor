
import { RouterLink, RouterModule } from '@angular/router';
import {  FormGroup,FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { CommonModule } from '@angular/common';

import { Component, inject, OnInit } from '@angular/core';
import {  GoogleSigninButtonModule, SocialAuthService, SocialAuthServiceConfig, SocialLoginModule, SocialUser } from '@abacritt/angularx-social-login';
import { GoogleLoginProvider } from '@abacritt/angularx-social-login';

import { Router } from '@angular/router';

const CLIENT_ID =  "954795010792-oafduvq9mhtlatg68rhl4hadtcuajos6.apps.googleusercontent.com";

@Component({
  selector: 'signup',
  standalone: true,
  imports: [ReactiveFormsModule, RouterModule, RouterLink, CommonModule, SocialLoginModule, GoogleSigninButtonModule],
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
  templateUrl:'./signup.component.html' ,
  styleUrls:['./signup.component.css'], 
})

export class SignupComponent implements OnInit {
loginForm!: FormGroup;
constructor (private fb: FormBuilder) {}


  onSubmit() {
    // Handle form submission here
    if (this.loginForm.valid) {
      console.log(this.loginForm.value);
      // Additional logic to authenticate user or 
      // perform other actions
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
        if (user) {
          this.router.navigate(['/protected']);
        }
        console.log('User is logged in:', this.user);
      }
      else {
        console.log('User is not logged in');
      }
    });

    this.loginForm = this.fb.group({
      firstname: ['firstname (required)', [Validators.required, Validators.minLength(3)]],
      lastname: ['lastname (required)', [Validators.required, Validators.minLength(3)]],
      email: ['email (required)', Validators.email],
      title: '',
      phoneNumber: 'phone number (required)',
    })

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
  
}
