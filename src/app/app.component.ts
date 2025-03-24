import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router'
import { SocialUser } from '@abacritt/angularx-social-login';
import { AuthService } from './authorization/auth.service';
import { filter, Observable } from 'rxjs';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatListModule } from '@angular/material/list';

@Component({
  selector: 'app-root',
  standalone: true,
  styleUrls: ['./app.component.css'],
  templateUrl: './app.component.html',
  imports: [
    CommonModule, 
    RouterOutlet, 
    RouterLink, 
    RouterLinkActive, 
    MatSidenavModule, 
    MatToolbarModule, 
    MatListModule
  ],
})
export class AppComponent {
  title = 'munivendor';
  user$: Observable<SocialUser | null>;
  showSidenav: boolean = true;

  constructor(private authService: AuthService, private router: Router) {
    this.user$ = this.authService.user$;
     // Monitor route changes to decide whether to show or hide the sidenav
     this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe(() => {
      this.toggleSidenav();
    });
  }

   toggleSidenav() {
    const currentRoute = this.router.url;
    const routesToHideSidenav = [
      '/role-verification',
      '/validateuser',
      '/municipality-details',
      '/user-details',
      '/user-designation',
      '/payment-plan-confirmation',
      '/payment-information'
    ];

    this.showSidenav = !routesToHideSidenav.some(route => currentRoute.includes(route));
  }

  onLogOut(): void {
    this.authService.logout();
  }
}