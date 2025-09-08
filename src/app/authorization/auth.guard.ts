import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth.service';
import { map, Observable, of } from 'rxjs';
import { environment } from '../../environments/environment';

export const AuthGuard: CanActivateFn = (): Observable<boolean> => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (environment.disableAuthGuard) {
    return of(true);
  }

  return authService.isAuthenticated$.pipe(
    map((isAuthenticated) => {
      if (isAuthenticated) {
        if (authService.isMfaRequired() && !authService.isMfaVerified()) {
          router.navigate(['/two-step-challenge']);
          return false;
        }
        return true;
      } else {
        router.navigate(['/login']);
        return false;
      }
    })
  );
};
