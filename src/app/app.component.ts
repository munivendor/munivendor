import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router'
import { SocialUser } from '@abacritt/angularx-social-login';
import { AuthService } from './authorization/auth.service';
import { Observable } from 'rxjs';

@Component({
  selector: 'app-root',
  standalone: true,
  styleUrls: ['./app.component.css'],
  template: `
     <div class="topnav">
      <!-- Non-authorized -->
      <a routerLink="/signup" routerLinkActive="active" ariaCurrentWhenActive="page" *ngIf="!(user$ | async)">Sign Up</a>
      <a routerLink="/login" routerLinkActive="active" ariaCurrentWhenActive="page" *ngIf="!(user$ | async)">Log In</a>
      <a routerLink="/forgot-password" routerLinkActive="active" ariaCurrentWhenActive="page" *ngIf="!(user$ | async)">Forgot Password</a>
      <a routerLink="/municipality-verification" routerLinkActive="active" ariaCurrentWhenActive="page" *ngIf="!(user$ | async)">Email Verificaiton</a>

      <a routerLink="/role-verification" routerLinkActive="active" ariaCurrentWhenActive="page" *ngIf="user$ | async">Role Verification</a>
      <a routerLink="/municipality-details" routerLinkActive="active" ariaCurrentWhenActive="page" *ngIf="user$ | async">LGO Details</a>
      <a routerLink="/user-details" routerLinkActive="active" ariaCurrentWhenActive="page" *ngIf="user$ | async">User Details</a>
      <a routerLink="/user-designation" routerLinkActive="active" ariaCurrentWhenActive="page" *ngIf="user$ | async">User Designation</a>
      <a routerLink="/payment-plan-confirmation" routerLinkActive="active" ariaCurrentWhenActive="page" *ngIf="user$ | async">Payment Plan</a>
      <a routerLink="/payment-information" routerLinkActive="active" ariaCurrentWhenActive="page" *ngIf="user$ | async">Payment Information</a>

      <!-- Authorized -->
      <a routerLink="/dashboard-component" routerLinkActive="active" ariaCurrentWhenActive="page" *ngIf="user$ | async">Dashboard</a>
      <a routerLink="/request-outframe-component" routerLinkActive="active" ariaCurrentWhenActive="page" *ngIf="user$ | async">Basic Request</a>
      <a routerLink="/request-proposal-component" routerLinkActive="active" ariaCurrentWhenActive="page" *ngIf="user$ | async">Proposal</a>
      <a routerLink="/request-overview-component" routerLinkActive="active" ariaCurrentWhenActive="page" *ngIf="user$ | async">Overview</a>
      <a (click)="onLogOut()" *ngIf="user$ | async">Sign Out</a>
    </div>

    <div class="main-content">
    <router-outlet></router-outlet>
    </div>
  `,
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive],
})
export class AppComponent {
  title = 'munivendor';
  user$: Observable<SocialUser | null>;

  constructor(private authService: AuthService) {
    this.user$ = this.authService.user$;
  }

  onLogOut(): void {
    console.log("Logging out...");
    this.authService.logout();
  }
}

