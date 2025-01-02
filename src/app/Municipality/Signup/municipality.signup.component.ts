
import { RouterLink, RouterModule } from '@angular/router';
import {  FormGroup,FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatCardModule } from '@angular/material/card';

import { Component, inject, OnInit } from '@angular/core';
import {  GoogleSigninButtonModule, SocialAuthService, SocialAuthServiceConfig, SocialLoginModule, SocialUser } from '@abacritt/angularx-social-login';
import { GoogleLoginProvider } from '@abacritt/angularx-social-login';

import { Router } from '@angular/router';
import { UserService } from './Services/user.service';
import { User } from './model/user.model';

import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

import { MatDialog } from '@angular/material/dialog'; 
import { EmailVerificationDialogComponent } from './email-verification-dialog.component';
import { open } from 'fs/promises';

const CLIENT_ID =  "954795010792-oafduvq9mhtlatg68rhl4hadtcuajos6.apps.googleusercontent.com";

@Component({
  selector: 'signup',
  standalone: true,
  imports: [ReactiveFormsModule, RouterModule, RouterLink, CommonModule,  MatButtonModule, MatInputModule, MatCardModule, MatSelectModule, GoogleSigninButtonModule],
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

constructor (private fb: FormBuilder, private userService: UserService, public dialog: MatDialog) {
}

  onSubmit() {
    if (this.loginForm.valid) {
      console.log(this.loginForm.value);
     
      let municipalityUser: User = {
        firstName: this.loginForm.controls["firstname"].value,
        lastName: this.loginForm.controls["lastname"].value,
        workEmail: this.loginForm.controls["email"].value
      };
      this.sendUserEmailVerification ();
      this.createMunivendorUser (municipalityUser)
      this.openEmailVerificationDialog ();
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
        
          let municipalityUser: User = {
            firstName: user.firstName,
            lastName: user.lastName,
            workEmail: user.email
          };
    
        this.createMunivendorUser(user);
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

  private createMunivendorUser(user: User) {

  
    /*this.saveUser(municipalityUser, municipalityId);
    console.log('User is logged in:', this.user);*/

    this.saveMunivendorUser(user).subscribe(
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

  openEmailVerificationDialog(): void { 
    this.dialog.open(EmailVerificationDialogComponent);
  }
    
  /*saveMunivendorUser(municipalityUser: User): Observable<number> 
  { 
    return this.userService.SaveUser(municipalityUser).pipe(
      map((userId: number) => {
        this.userId = userId; 
        return userId;
      })
    );
  }
    */
  saveMunivendorUser(municipalityUser: User): Observable<number> {
    const saveUserObservable = this.userService.createUser(municipalityUser);
    saveUserObservable.subscribe((userId: number) => {
      this.userId = userId;
    });
    return saveUserObservable;
  }

  sendUserEmailVerification(): Observable<boolean> {
    const sendUserVerificationEmailObservable = this.userService.SendUserVerificationEmail(1);
    sendUserVerificationEmailObservable.subscribe ((success: boolean) => {
      this.openEmailVerificationDialog();
    });
    return sendUserVerificationEmailObservable;
  }
  
  
  
}
