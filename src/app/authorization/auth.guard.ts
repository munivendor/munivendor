import { inject } from '@angular/core';
import { CanActivateFn, Router, ActivatedRouteSnapshot } from '@angular/router';
import { AuthService } from './auth.service';
import { map, Observable, of } from 'rxjs';
import { environment } from '../../environments/environment';

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

export const GuestGuard: CanActivateFn = (): Observable<boolean> => {
  const authService = inject(AuthService);

  return authService.isAuthenticated$.pipe(
    map((isAuthenticated) => {
      // If the user is authenticated, prevent access to guest routes
      if (isAuthenticated) {
        return false;
      }
      // If the user is not authenticated, allow access to guest routes
      return true;
    })
  );
};
