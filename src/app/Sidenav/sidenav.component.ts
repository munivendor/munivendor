import { Component, ViewChild, OnInit, Input } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { CommonModule } from '@angular/common';
import { MatDrawer } from '@angular/material/sidenav';
import {
  RouterOutlet,
  Router,
  NavigationEnd,
  RouterModule,
  Event,
} from '@angular/router';
import { filter, firstValueFrom, Observable, Subscription } from 'rxjs';
import { AuthService } from '../authorization/auth.service';
import { UserService } from '../shared/service/user.service';

@Component({
  selector: 'custom-sidenav',
  templateUrl: 'sidenav.component.html',
  styleUrl: 'sidenav.component.css',
  imports: [
    MatSidenavModule,
    MatButtonModule,
    MatIconModule,
    MatListModule,
    CommonModule,
    RouterOutlet,
    RouterModule,
  ],
  standalone: true,
})
export class SidenavExample implements OnInit {
  @ViewChild('drawer') drawer!: MatDrawer;
  @Input() organizationTypeId: number | null = null;

  isExpanded = true;
  activeRoute = '';
  user$: Observable<number | null>;
  private subscription = new Subscription();

  // profiles are commented out for MVP
  agencyMenuItems = [
    // { icon: 'person', label: 'Agency Profile', route: '/profile' },
    {
      icon: 'add_box',
      label: 'Create Solicitations',
      route: '/create-request-view',
    },
    { icon: 'dns', label: 'Categories', route: '/categories' },
    { icon: 'help_outline', label: 'Definitions', route: '/definitions' },
  ];

  offerorMenuItems = [
    // { icon: 'person', label: 'Offeror Profile', route: '/offeror-profile' },
    { icon: 'help_outline', label: 'Definitions', route: '/definitions' },
  ];

  constructor(
    private router: Router,
    private authService: AuthService,
    private userService: UserService
  ) {
    this.user$ = this.authService.user$;
  }

  ngOnInit() {
    this.subscription.add(
      this.router.events
        .pipe(
          filter(
            (event: Event): event is NavigationEnd =>
              event instanceof NavigationEnd
          )
        )
        .subscribe((event: NavigationEnd) => {
          this.activeRoute = event.urlAfterRedirects;
        })
    );

    this.subscription.add(
      this.user$.subscribe(async (user) => {
        if (user && this.organizationTypeId === null) {
          try {
            const userData = await firstValueFrom(
              this.userService.getUser(user)
            );
            this.organizationTypeId = userData.organizationTypeId ?? null;
          } catch (error) {
            console.error('Error fetching user data:', error);
          }
        } else if (!user) {
          this.organizationTypeId = null;
        }
      })
    );
  }

  ngOnDestroy() {
    this.subscription.unsubscribe();
  }

  get baseMenuItems() {
    if (this.organizationTypeId === 1) {
      return this.agencyMenuItems;
    } else if (this.organizationTypeId !== null) {
      return this.offerorMenuItems;
    }
    return [];
  }

  get menuItems() {
    const items = [...this.baseMenuItems];

    if (this.organizationTypeId !== null) {
      const dashboardRoute =
        this.organizationTypeId === 1
          ? '/requests-view'
          : '/offeror-requests-view';

      items.unshift({
        icon: 'dashboard',
        label: 'Dashboard',
        route: dashboardRoute,
      });
    }

    return items;
  }

  toggleSidenav() {
    this.isExpanded = !this.isExpanded;
    setTimeout(() => {
      if (this.drawer && this.drawer._container) {
        this.drawer._container.updateContentMargins();
      }
    }, 0);
  }

  onMenuClick(item: any) {
    this.router.navigate([item.route]);
  }

  onLogout() {
    this.handleLogout();
  }

  isActiveRoute(route: string): boolean {
    if (route === '/logout') {
      return false;
    }

    if (route === '/requests-view' || route === '/offeror-requests-view') {
      const isOnRoot =
        this.activeRoute === '/' ||
        this.activeRoute === '' ||
        this.activeRoute === '/home';
      const isDashboardForUserType =
        (route === '/requests-view' && this.organizationTypeId === 1) ||
        (route === '/offeror-requests-view' &&
          this.organizationTypeId !== 1 &&
          this.organizationTypeId !== null);

      return this.activeRoute === route || (isOnRoot && isDashboardForUserType);
    }

    return (
      this.activeRoute === route || this.activeRoute.startsWith(route + '/')
    );
  }

  private handleLogout() {
    this.authService.logout();
  }
}
