import {
  Component,
  ViewChild,
  OnInit,
  AfterViewInit,
  Inject,
  PLATFORM_ID,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
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
  NavigationSkipped,
} from '@angular/router';
import { filter, firstValueFrom, Observable, Subscription } from 'rxjs';
import { AuthService } from '../authorization/auth.service';
import { UserService } from '../shared/service/user.service';
import { StateService } from '../Request/services/state.service';

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
export class Sidenav implements OnInit, AfterViewInit {
  @ViewChild('drawer') drawer!: MatDrawer;
  organizationTypeId: number | null = null;
  isExpanded = true;
  activeRoute = '';
  user$: Observable<number | null>;
  private subscription = new Subscription();

  agencyMenuItems = [
    {
      id: 'agency-profile',
      icon: 'person',
      label: 'Agency Profile',
      route: '/agency-profile-page',
    },
    {
      id: 'create-solicitations',
      icon: 'add_box',
      label: 'Create A New Solicitation',
      route: '/create-request-view',
    },
    {
      id: 'categories',
      icon: 'dns',
      label: 'Categories',
      route: '/categories',
    },
    {
      id: 'definitions',
      icon: 'help_outline',
      label: 'Definitions',
      route: '/definitions',
    },
  ];

  offerorMenuItems = [
    {
      id: 'offeror-profile',
      icon: 'person',
      label: 'Offeror Profile',
      route: '/offeror-profile-page',
    },
    {
      id: 'faq',
      icon: 'question_answer',
      label: 'FAQ',
      route: '/faq',
    },
    {
      id: 'definitions',
      icon: 'help',
      label: 'Definitions',
      route: '/definitions',
    },
    {
      id: 'user-guide',
      icon: 'warning',
      label: 'User Guide',
      route: '/user-guide',
    },
    {
      id: 'purchasing-history',
      icon: 'shopping_cart',
      label: 'Purchasing/History',
      route: '/purchasing-history',
    },
    {
      id: 'billing-information',
      icon: 'credit_card',
      label: 'Billing Profile',
      route: '/billing-profile',
    },
    {
      id: 'submission-credits',
      icon: 'history',
      label: 'Submission Credit History',
      route: '/submission-credits',
    },
  ];

  bottomMenuItems = [
    {
      id: 'terms-of-service',
      icon: 'description',
      label: 'Terms of Service',
      route: '/terms-of-service',
    },
    {
      id: 'privacy-policy',
      icon: 'privacy_tip',
      label: 'Privacy Policy',
      route: '/privacy-policy',
    },
  ];

  constructor(
    private router: Router,
    private authService: AuthService,
    private userService: UserService,
    @Inject(PLATFORM_ID) private platformId: Object,
    private stateService: StateService,
  ) {
    this.user$ = this.authService.user$;
    this.organizationTypeId = this.stateService.getOrganizationTypeId();
  }

  ngOnInit() {
    this.subscription.add(
      this.router.events
        .pipe(
          filter(
            (event: Event): event is NavigationEnd | NavigationSkipped =>
              event instanceof NavigationEnd ||
              event instanceof NavigationSkipped,
          ),
        )
        .subscribe((event) => {
          if (event instanceof NavigationEnd) {
            this.activeRoute = event.urlAfterRedirects;
          }
          this.forceLayoutRecalculation();
          this.resetScrollPosition();
        }),
    );

    this.subscription.add(
      this.user$.subscribe(async (user) => {
        if (user && this.organizationTypeId === null) {
          try {
            const userData = await firstValueFrom(
              this.userService.getUser(user),
            );
            this.organizationTypeId = userData.organizationTypeId ?? null;
            this.forceLayoutRecalculation();
          } catch (error) {
            console.error('Error fetching user data:', error);
          }
        } else if (!user) {
          this.organizationTypeId = null;
        }
      }),
    );

    if (isPlatformBrowser(this.platformId)) {
      setTimeout(() => {
        this.forceLayoutRecalculation();
      }, 0);

      window.addEventListener('load', () => {
        this.forceLayoutRecalculation();
      });
    }
  }

  ngAfterViewInit() {
    if (isPlatformBrowser(this.platformId)) {
      setTimeout(() => {
        this.forceLayoutRecalculation();
        if (this.drawer && this.drawer._container) {
          this.drawer._container?.updateContentMargins();
        }
      }, 100);
    }
  }

  ngOnDestroy() {
    this.subscription.unsubscribe();
  }

  private resetScrollPosition() {
    if (!isPlatformBrowser(this.platformId)) return;

    const content = document.querySelector<HTMLElement>('.mat-drawer-content');
    if (!content) return;

    content.scrollTop = 0;
    // run again after paint + after your 100ms updateContentMargins timer, so nothing scrolls it back
    // fixes the issue where the scroll position does not reset to the top of the page
    requestAnimationFrame(() => (content.scrollTop = 0));
    setTimeout(() => (content.scrollTop = 0), 150);
  }

  private forceLayoutRecalculation() {
    if (isPlatformBrowser(this.platformId)) {
      document.body.offsetHeight;
      window.dispatchEvent(new Event('resize'));

      if (this.drawer && this.drawer._container) {
        setTimeout(() => {
          this.drawer._container?.updateContentMargins();
        }, 0);
      }
    }
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
        id: 'dashboard',
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
    this.router.navigate([item.route]).then(() => this.resetScrollPosition());
  }

  onLogout() {
    this.handleLogout();
  }

  isActiveRoute(route: string): boolean {
    const currentUrl = this.router.url;

    if (route === '/logout') {
      return false;
    }

    if (route === '/requests-view' || route === '/offeror-requests-view') {
      const isOnRoot =
        currentUrl === '/' || currentUrl === '' || currentUrl === '/home';

      const isDashboardForUserType =
        (route === '/requests-view' && this.organizationTypeId === 1) ||
        (route === '/offeror-requests-view' &&
          this.organizationTypeId !== 1 &&
          this.organizationTypeId !== null);

      return (
        this.router.isActive(route, {
          paths: 'exact',
          queryParams: 'ignored',
          fragment: 'ignored',
          matrixParams: 'ignored',
        }) ||
        (isOnRoot && isDashboardForUserType)
      );
    }

    return this.router.isActive(route, {
      paths: 'exact',
      queryParams: 'ignored',
      fragment: 'ignored',
      matrixParams: 'ignored',
    });
  }

  private handleLogout() {
    this.authService.logout();
  }
}
