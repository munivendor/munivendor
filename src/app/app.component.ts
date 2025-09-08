import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { AuthService } from './authorization/auth.service';
import { filter, Observable } from 'rxjs';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatListModule } from '@angular/material/list';
import { combineLatest } from 'rxjs';
import { map } from 'rxjs/operators';
import { UserService } from './shared/service/user.service';
import { firstValueFrom } from 'rxjs';
import { Sidenav } from './Sidenav/sidenav.component';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-root',
  standalone: true,
  styleUrls: ['./app.component.css'],
  templateUrl: './app.component.html',
  imports: [
    CommonModule,
    FormsModule,
    RouterOutlet,
    MatSidenavModule,
    MatToolbarModule,
    MatListModule,
    Sidenav,
  ],
})
export class AppComponent {
  title = 'munivendor';
  user$: Observable<number | null>;
  showSidenav: boolean = true;
  userId: number | null = null;
  organizationTypeId: number | null = null;

  constructor(
    private authService: AuthService,
    private router: Router,
    private userService: UserService
  ) {
    this.user$ = this.authService.user$;
    combineLatest([
      this.authService.user$,
      this.authService.isAuthenticated$,
      this.router.events.pipe(
        filter((event) => event instanceof NavigationEnd),
        map(() => this.router.url)
      ),
    ]).subscribe(([user, isLoggedIn, currentRoute]) => {
      this.showSidenav = this.shouldShowSidenav(user, isLoggedIn, currentRoute);
      if (
        this.authService.isMfaRequired() &&
        !this.authService.isMfaVerified()
      ) {
        this.showSidenav = false;
      }
      if (user) {
        firstValueFrom(this.userService.getUser(user)).then((userData) => {
          this.organizationTypeId = userData.organizationTypeId ?? null;
        });
      } else {
        this.userId = null;
      }
    });
  }

  private shouldShowSidenav(
    user: number | null,
    isLoggingIn: boolean,
    currentRoute: string
  ): boolean {
    const routesToHideSidenav = [
      '/role-verification',
      '/validateuser',
      '/organization-details',
      '/user-details',
      // '/user-designation',
      // '/payment-plan-confirmation',
      // '/billing-profile',
    ];
    return (
      !!user &&
      !!isLoggingIn &&
      !routesToHideSidenav.some((route) => currentRoute.includes(route))
    );
  }

  onLogOut(): void {
    this.authService.logout();
  }
}
