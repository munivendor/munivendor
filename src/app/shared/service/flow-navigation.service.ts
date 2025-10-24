import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { Observable } from 'rxjs';
import { FlowProgressService } from './flow-progress.service';
import { UserService } from './user.service';
import { User } from '../model/user.model';
import { LoggingService } from '../../exceptionhandling/logging.service';
import { MatSnackBar } from '@angular/material/snack-bar';
@Injectable({
  providedIn: 'root',
})
export class FlowNavigationService {
  private readonly FLOW_ROUTES = {
    government: {
      flowId: 1,
      routes: {
        0: '/organization-details',
        1: '/organization-details',
        2: '/user-details',
        6: '/requests-view',
      },
    },
    agency: {
      flowId: 1,
      routes: {
        0: '/organization-details',
        1: '/organization-details',
        2: '/user-details',
        6: '/requests-view',
      },
    },
    offeror: {
      flowId: 2,
      routes: {
        0: '/organization-details',
        1: '/organization-details',
        2: '/user-details',
        6: '/offeror-requests-view',
      },
    },
  };

  constructor(
    private router: Router,
    private flowProgressService: FlowProgressService,
    private userService: UserService,
    private loggingService: LoggingService,
    private _snackBar: MatSnackBar
  ) {}

  navigateAfterLogin(userId: number, email: string): Observable<void> {
    return new Observable((observer) => {
      const isGovEmail = email.toLowerCase().endsWith('.gov');

      if (isGovEmail) {
        this.handleNavigation(userId, 'government', observer);
        return;
      }

      this.userService.getUser(userId).subscribe({
        next: (user: User) => {
          const flowType = this.getFlowType(false, user.organizationTypeId);
          this.handleNavigation(userId, flowType, observer);
        },
        error: (error) => {
          console.error('Error fetching user data:', error);
          observer.error(error);
          // Extract correlationId
          const correlationId = error?.error?.correlationId;

          this.loggingService.logException(
            new Error(`HTTP Error ${error.status}: ${error.statusText}`),
            3,
            {
              userId: userId,
              correlationId: correlationId,
              methodName: 'navigateAfterLogin',
              className: 'FlowNavigationService',
              operation: 'getUser',
            }
          );

          this._snackBar.open(
            `Login failed. (Correlation ID: ${correlationId}). If you need MuniVendor technical support, please feel free to email vendorsupport@munivenor.com, or call us Monday through Friday, 9am until 5pm EST at (732) 354-1215. In your email, please make sure to include either a screenshot of the error, or the specific Correlation ID code in this error message.`,
            'Close',
            { verticalPosition: 'top', duration: 15000 }
          );
        },
      });
    });
  }

  private handleNavigation(
    userId: number,
    flowType: 'government' | 'agency' | 'offeror',
    observer: any
  ): void {
    const flowConfig = this.FLOW_ROUTES[flowType];
    this.flowProgressService
      .getFlowProgress(userId, flowConfig.flowId)
      .subscribe({
        next: (progress) => {
          this.navigateBasedOnProgress(progress, flowConfig.routes);
          observer.next();
          observer.complete();
        },
        error: (error) => {
          console.error('Error fetching flow progress:', error);
          observer.error(error);
          // Extract correlationId
          const correlationId = error?.error?.correlationId;

          this.loggingService.logException(
            new Error(`HTTP Error ${error.status}: ${error.statusText}`),
            3,
            {
              userId: userId,
              flowType: flowType,
              flowId: flowConfig.flowId,
              correlationId: correlationId,
              methodName: 'handleNavigation',
              className: 'FlowNavigationService',
              operation: 'getFlowProgress',
            }
          );

          this._snackBar.open(
            `Navigation failed. (Correlation ID: ${correlationId}). If you need MuniVendor technical support, please feel free to email vendorsupport@munivenor.com, or call us Monday through Friday, 9am until 5pm EST at (732) 354-1215. In your email, please make sure to include either a screenshot of the error, or the specific Correlation ID code in this error message.`,
            'Close',
            { verticalPosition: 'top', duration: 15000 }
          );
        },
      });
  }

  private getFlowType(
    isGovEmail: boolean,
    organizationTypeId?: number
  ): 'government' | 'agency' | 'offeror' {
    if (isGovEmail) {
      return 'government';
    } else if (organizationTypeId === 1) {
      return 'agency';
    }
    return 'offeror';
  }

  private navigateBasedOnProgress(
    progress: any,
    routes: Record<number, string>
  ): void {
    const pageId = progress?.lastCompletedPageId ?? 1;
    const route = routes[pageId];
    if (route) {
      this.router.navigate([route]);
    } else {
      console.warn(`No route defined for page ID: ${pageId}`);
    }
  }
}
