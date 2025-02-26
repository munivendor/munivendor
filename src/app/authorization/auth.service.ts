import { Injectable } from '@angular/core';
import { SocialAuthService, SocialUser } from '@abacritt/angularx-social-login';
import { BehaviorSubject, Observable } from 'rxjs';
import { Router } from '@angular/router';
import { User } from '../shared/model/user.model';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  url = environment.apiUrl;
  private userSubject = new BehaviorSubject<SocialUser | null>(null);
  user$: Observable<SocialUser | null> = this.userSubject.asObservable();

  constructor( private http: HttpClient, private router: Router, private socialAuthService: SocialAuthService) {
    this.socialAuthService.authState.subscribe((user) => {
      console.log("user", user)
      if (user) {
        this.userSubject.next(user);
      } else {
        this.userSubject.next(null);
      }
    });
  }

  login(username: string, password: string): void {
    this.http.post('http://localhost:3000/login', { username, password }, { withCredentials: true })
      .subscribe(response => {
        this.router.navigate(['home']);
      }, error => {
        console.error('Login failed', error);
      });
  }

  logout(): void {
    // Inform the server to clear the cookie
    this.http.post('http://localhost:3000/logout', {}, { withCredentials: true }).subscribe(() => {
      this.router.navigate(['login']);
    });
  }

  isAuthenticated(): Observable<boolean> {
    return this.http.get<boolean>(`${this.url}/check-auth`, { withCredentials: true });
}

  storeAuthToken(token: string) {
    localStorage.setItem('auth_token', token);
  }
  
  getAuthUser(): Observable<SocialUser | null> {
    return this.user$;
  }

  /**
   * Signs out the user (handles both social and manual login)
   */
  async signOut(): Promise<void> {
    try {
      if (this.userSubject.value) {
        console.log("Logging out user:", this.userSubject.value);
        await this.socialAuthService.signOut();
      }
    } catch (error) {
      console.error('Google Sign-Out Error:', error);
    } finally {
      localStorage.removeItem('authToken');
      this.userSubject.next(null);
      console.log("Auth token removed, user state cleared");
      this.router.navigate(['/login']);
    }
  }

  // isAuthenticated(): boolean {
  //   return !!localStorage.getItem('authToken');
  // }

  getUser(): User | null {
    const user = this.userSubject.value;
    return user
      ? {
        firstName: user.firstName,
        lastName: user.lastName,
        workEmail: user.email,
      }
      : null;
  }

  setUser(user: SocialUser | null): void {
    this.userSubject.next(user);
  }
}