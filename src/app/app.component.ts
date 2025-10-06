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
import { filter, map } from 'rxjs/operators';
import { StateService } from './Request/services/state.service';
import { AuthService } from './authorization/auth.service';
import { Sidenav } from './Sidenav/sidenav.component';
import { LoadingSpinnerComponent } from '../app/shared/LoadingSpinner/loading-spinner.component';
import { IdleService } from './shared/service/idle.service';

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
    LoadingSpinnerComponent,
  ],
})
export class AppComponent implements OnInit {
  title = 'munivendor';
  user$: Observable<number | null>;
  showSidenav$: Observable<boolean>;
  userId: number | null = null;
  organizationTypeId: number | null = null;
  hasNavigated = false;

  constructor(
    private authService: AuthService,
    private router: Router,
    private activatedRoute: ActivatedRoute,
    private stateService: StateService,
    private idleService: IdleService
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
          return route.snapshot.data['showSidenav'] ?? true;
        })
      ),
    ]).pipe(
      map(
        ([isAuthenticated, shouldShowSidenav]) =>
          isAuthenticated && shouldShowSidenav
      )
    );
  }

  ngOnInit(): void {
    if (this.authService.isAuthenticated$) {
      this.idleService.startWatching();
    }

    this.authService.userLoggedOut$.subscribe(() => {
      this.idleService.stopWatching();
    });
  }

  onLogOut(): void {
    this.hasNavigated = false;
    this.authService.logout();
  }
}
