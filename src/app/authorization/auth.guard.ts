import { inject } from '@angular/core';
import { CanActivateFn, Router, ActivatedRouteSnapshot } from '@angular/router';
import { AuthService } from './auth.service';
import { map, Observable, of, switchMap } from 'rxjs';
import { environment } from '../../environments/environment';
import { StateService } from '../Request/services/state.service';
import { FlowProgressService } from '../shared/service/flow-progress.service';

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
  const flowProgressService = inject(FlowProgressService);

  return authService.isAuthenticated$.pipe(
    switchMap((isAuthenticated) => {
      if (!isAuthenticated) {
        return of(true);
      }

      const userId = authService.getCurrentUserId();
      const organizationTypeId = stateService.getOrganizationTypeId();

      const flowId =
        organizationTypeId === 1 || organizationTypeId === undefined ? 1 : 2;

      return flowProgressService.getFlowProgress(Number(userId), flowId).pipe(
        map((progress) => {
          const lastCompletedPageId: number =
            progress?.lastCompletedPageId ?? 0;

          // Only allow navigation to main views if signup is complete (pageId === 6)
          if (lastCompletedPageId === 6) {
            if (organizationTypeId === 1) {
              router.navigate(['/requests-view']);
            } else {
              router.navigate(['/offeror-requests-view']);
            }
            return false;
          }

          // Signup not complete - redirect to appropriate signup step
          const signupRoutes: { [key: number]: string } = {
            0: '/organization-details',
            1: '/organization-details',
            2: '/user-details',
          };

          const route =
            signupRoutes[lastCompletedPageId] || '/organization-details';
          router.navigate([route]);
          return false;
        })
      );
    })
  );
};

export const FlowCompletionGuard: CanActivateFn = (
  route: ActivatedRouteSnapshot
): Observable<boolean> => {
  const authService = inject(AuthService);
  const router = inject(Router);
  const stateService = inject(StateService);
  const flowProgressService = inject(FlowProgressService);

  return authService.isAuthenticated$.pipe(
    switchMap((isAuthenticated) => {
      if (!isAuthenticated) {
        router.navigate(['/login']);
        return of(false);
      }

      const userId = authService.getCurrentUserId();
      const organizationTypeId = stateService.getOrganizationTypeId();
      const flowId =
        organizationTypeId === 1 || organizationTypeId === undefined ? 1 : 2;

      return flowProgressService.getFlowProgress(Number(userId), flowId).pipe(
        map((progress) => {
          const lastCompletedPageId: number =
            progress?.lastCompletedPageId ?? 0;

          if (lastCompletedPageId === 6) {
            return true;
          }

          const signupRoutes: { [key: number]: string } = {
            0: '/organization-details',
            1: '/organization-details',
            2: '/user-details',
          };

          const signupRoute =
            signupRoutes[lastCompletedPageId] || '/organization-details';
          router.navigate([signupRoute]);
          return false;
        })
      );
    })
  );
};
