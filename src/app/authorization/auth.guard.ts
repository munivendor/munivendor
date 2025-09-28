import { inject } from '@angular/core';
import { CanActivateFn, Router, ActivatedRouteSnapshot } from '@angular/router';
import { AuthService } from './auth.service';
import { map, Observable, of } from 'rxjs';
import { environment } from '../../environments/environment';
import { StateService } from '../Request/services/state.service';

export const AuthGuard: CanActivateFn = (
  route: ActivatedRouteSnapshot
): Observable<boolean> => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (environment.disableAuthGuard) {
    return of(true);
  }

  return authService.isAuthenticated$.pipe(
    map((isAuthenticated) => {
      if (isAuthenticated) {
        return true;
      } else {
        router.navigate(['/login']);
        return false;
      }
    })
  );
};

export const GuestGuard: CanActivateFn = (
  route: ActivatedRouteSnapshot
): Observable<boolean> => {
  const authService = inject(AuthService);
  const router = inject(Router);
  const stateService = inject(StateService);
  const organizationTypeId = stateService.getOrganizationTypeId();
  console.log(stateService.getOrganizationTypeId());

  return authService.isAuthenticated$.pipe(
    map((isAuthenticated) => {
      if (isAuthenticated) {
        if (organizationTypeId === 1) {
          router.navigate(['/requests-view']);
        } else {
          router.navigate(['/offeror-requests-view']);
        }

        return false;
      }
      return true;
    })
  );
};
