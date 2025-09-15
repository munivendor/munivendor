import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { Observable } from 'rxjs';
import { FlowProgressService } from './flow-progress.service';
import { UserService } from './user.service';
import { User } from '../model/user.model';

@Injectable({
  providedIn: 'root',
})
export class FlowNavigationService {
  private readonly FLOW_ROUTES = {
    government: {
      flowId: 1,
      routes: {
        0: '/organization-details',
        2: '/user-details',
        // 3: '/user-designation',
        // 4: '/payment-plan-confirmation',
        // 5: '/billing-profile',
        6: '/requests-view',
      },
    },
    agency: {
      flowId: 1,
      routes: {
        // 0: '/role-verification',
        1: '/organization-details',
        2: '/user-details',
        // 3: '/user-designation',
        // 4: '/payment-plan-confirmation',
        // 5: '/billing-profile',
        6: '/requests-view',
      },
    },
    offeror: {
      flowId: 2,
      routes: {
        // 0: '/role-verification',
        1: '/organization-details',
        2: '/user-details',
        // 3: '/payment-plan-confirmation',
        // 5: '/billing-profile',
        6: '/offeror-requests-view',
      },
    },
  };

  constructor(
    private router: Router,
    private flowProgressService: FlowProgressService,
    private userService: UserService
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
        error: (err) => {
          console.error('Error fetching flow progress:', err);
          observer.error(err);
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
