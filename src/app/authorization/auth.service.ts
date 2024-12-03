import { inject, Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { SocialAuthService, SocialUser, GoogleLoginProvider } from 'angularx-social-login';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  
  private authService = inject(SocialAuthService);
  private router = inject(Router);
  user:SocialUser | undefined;

  constructor(private authService: SocialAuthService) {
    this.authService.authState.subscribe(user => {
      this.user = user;
    });
  }

  signInWithGoogle(): Promise<any> {
    return this.authService.signIn(GoogleLoginProvider.PROVIDER_ID);
  }

  signOut(): Promise<any> {
    return this.authService.signOut();
  }

  getUser(): SocialUser | null {
    return this.user;
  }

  isAuthenticated(): boolean {
    return this.user !== null;
  }
}
