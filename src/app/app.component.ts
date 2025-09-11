import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  Router,
  RouterOutlet,
  NavigationEnd,
  ActivatedRoute,
} from '@angular/router';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatListModule } from '@angular/material/list';
import { combineLatest, Observable } from 'rxjs';
import { filter, map, startWith } from 'rxjs/operators';
import { UserService } from './shared/service/user.service';
import { StateService } from './Request/services/state.service';
import { AuthService } from './authorization/auth.service';
import { Sidenav } from './Sidenav/sidenav.component';
import { FlowNavigationService } from './shared/service/flow-navigation.service';

@Component({
  selector: 'app-root',
  standalone: true,
  styleUrls: ['./app.component.css'],
  templateUrl: './app.component.html',
  imports: [
    CommonModule,
    RouterOutlet,
    MatSidenavModule,
    MatToolbarModule,
    MatListModule,
    Sidenav,
  ],
})
export class AppComponent implements OnInit {
  title = 'munivendor';
  user$: Observable<number | null>;
  showSidenav$: Observable<boolean>;
  userId: number | null = null;
  organizationTypeId: number | null = null;
  private hasNavigated = false;

  constructor(
    private authService: AuthService,
    private router: Router,
    private activatedRoute: ActivatedRoute,
    private stateService: StateService,
    private flowNavigationService: FlowNavigationService,
    private userService: UserService
  ) {
    this.user$ = this.authService.user$;
    this.organizationTypeId = this.stateService.getOrganizationTypeId();

    this.showSidenav$ = combineLatest([
      this.authService.isAuthenticated$,
      this.router.events.pipe(
        filter((event) => event instanceof NavigationEnd),
        map(() => {
          let route = this.activatedRoute;
          while (route.firstChild) {
            route = route.firstChild;
          }
          const showSidenav = route.snapshot.data['showSidenav'] ?? true;
          return showSidenav;
        }),
        startWith(true)
      ),
    ]).pipe(
      map(([isAuthenticated, shouldShowSidenav]) => {
        const result = isAuthenticated && shouldShowSidenav;
        return result;
      })
    );
  }

  ngOnInit() {
    // Handle initial navigation for authenticated users visiting guest routes
    combineLatest([
      this.authService.user$,
      this.authService.isAuthenticated$,
      this.router.events.pipe(
        filter((event) => event instanceof NavigationEnd),
        map(() => this.router.url),
        startWith(this.router.url)
      ),
    ]).subscribe(([userId, isAuthenticated, currentRoute]) => {
      // If user is authenticated and on a guest route or root, redirect them using FlowNavigationService
      if (
        isAuthenticated &&
        userId &&
        this.shouldRedirectAuthenticatedUser(currentRoute) &&
        !this.hasNavigated
      ) {
        this.hasNavigated = true;
        this.userService.getUser(userId).subscribe({
          next: (user) => {
            this.flowNavigationService
              .navigateAfterLogin(userId, user.workEmail ?? '')
              .subscribe({
                next: () => {
                  console.log('Navigation completed successfully');
                },
                error: (error: any) => {
                  console.error('Error during navigation:', error);
                  this.hasNavigated = false;
                },
              });
          },
          error: (error: any) => {
            console.error('Error fetching user for navigation:', error);
            this.hasNavigated = false;
          },
        });
      }
    });
  }

  private shouldRedirectAuthenticatedUser(route: string): boolean {
    const routesToRedirect = [
      '/',
      '/login',
      '/signup',
      '/forgot-password',
      '/email-verification',
    ];
    return routesToRedirect.includes(route);
  }

  onLogOut(): void {
    this.hasNavigated = false;
    this.authService.logout();
  }
}
