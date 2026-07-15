import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { firstValueFrom, Subscription } from 'rxjs';
import { AuthService } from '../authorization/auth.service';
import { UserService } from '../shared/service/user.service';
import { StateService } from '../Request/services/state.service';
import { OfferorTermsContentComponent } from './offeror-terms-content.component';
import { AgencyTermsContentComponent } from './agency-terms-content.component';

@Component({
  selector: 'terms-of-service.component.ts',
  templateUrl: 'terms-of-service.component.html',
  styleUrl: 'terms-of-service.component.css',
  standalone: true,
  imports: [
    CommonModule,
    OfferorTermsContentComponent,
    AgencyTermsContentComponent,
  ],
})
export class TermsOfServiceComponent implements OnInit, OnDestroy {
  organizationTypeId: number | null = null;
  private subscription = new Subscription();

  constructor(
    private authService: AuthService,
    private userService: UserService,
    private stateService: StateService,
  ) {
    this.organizationTypeId = this.stateService.getOrganizationTypeId();
  }

  ngOnInit() {
    if (this.organizationTypeId !== null) {
      return;
    }

    this.subscription.add(
      this.authService.user$.subscribe(async (user) => {
        if (!user || this.organizationTypeId !== null) {
          return;
        }
        try {
          const userData = await firstValueFrom(
            this.userService.getUser(user),
          );
          this.organizationTypeId = userData.organizationTypeId ?? null;
        } catch (error) {
          console.error('Error fetching user data:', error);
        }
      }),
    );
  }

  ngOnDestroy() {
    this.subscription.unsubscribe();
  }

  get isAgency(): boolean {
    return this.organizationTypeId === 1;
  }
}
