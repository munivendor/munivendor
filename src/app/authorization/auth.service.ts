import { Injectable } from '@angular/core';
import { SocialAuthService, SocialUser } from '@abacritt/angularx-social-login';
import { BehaviorSubject, Observable, tap } from 'rxjs';
import { Router } from '@angular/router';
import { UserLogin } from '../shared/model/user-login.model';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private url = environment.apiUrl;
  private userSubject = new BehaviorSubject<SocialUser | null>(null);
  user$: Observable<SocialUser | null> = this.userSubject.asObservable();

  private authState = new BehaviorSubject<boolean>(false);
  isAuthenticated$ = this.authState.asObservable();

  private isGoogleSignIn = false;

  constructor(
    private http: HttpClient, 
    private router: Router, 
    private socialAuthService: SocialAuthService
  ) {
    this.initializeAuthListener();
  }

  private initializeAuthListener(): void {
    this.socialAuthService.authState.subscribe({
      next: (user) => {
        if (user) {
          this.userSubject.next(user);
          this.authState.next(true);
          this.isGoogleSignIn = true;
        } else {
          this.resetAuthState();
        }
      },
      error: (error) => {
        console.error('Google Auth Error:', error);
        this.resetAuthState();
      }
    });
  }

  private resetAuthState(): void {
    this.userSubject.next(null);
    this.authState.next(false);
    this.isGoogleSignIn = false;
  }

  setGoogleSignIn(isGoogle: boolean): void {
    this.isGoogleSignIn = isGoogle;
  }

  getGoogleSignIn(): boolean {
    return this.isGoogleSignIn;
  }

  login(userLogin: UserLogin): Observable<any> {
    return this.http.post<{ UserId: number, Token: string }>(`${this.url}login`, userLogin, { withCredentials: true }).pipe(
      tap(response => {
        if (response) {
          this.userSubject.next(response as any);
          this.authState.next(true);
          this.router.navigate(['/municipality-details']);
        }
      })
    );
  }

  logout(): void {
    this.http.post(`${this.url}logout`, {}, { withCredentials: true }).subscribe({
      next: async () => {
        try {
          if (this.userSubject.value) {
            await this.socialAuthService.signOut();
          }
        } catch (error) {
          console.error('Google Sign-Out Error:', error);
        } finally {
          this.resetAuthState();
          this.router.navigate(['/login']);
        }
      },
      error: (error) => {
        console.error('Logout Error:', error);
        this.resetAuthState();
        this.router.navigate(['/login']);
      }
    });
  }
}