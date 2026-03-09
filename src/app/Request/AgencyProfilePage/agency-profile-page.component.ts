import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { StateService } from '../../Request/services/state.service';
import { MatIconModule } from '@angular/material/icon';
import { DecisionMakersComponent } from './DecisionMakers/decision-makers.component';
import { AgencyDetailsComponent } from './AgencyDetails/agency-details.component';
import { PurchasingDesigneeComponent } from './Designees/purchasing-designee.component';
import { LegalDesigneeComponent } from './Designees/legal-designee.component';
import { ClerkDesigneeComponent } from './Designees/clerk-designee.component';

@Component({
  selector: 'app-agency-profile-page',
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    MatIconModule,
    DecisionMakersComponent,
    AgencyDetailsComponent,
    PurchasingDesigneeComponent,
    LegalDesigneeComponent,
    ClerkDesigneeComponent,
  ],
  templateUrl: './agency-profile-page.component.html',
  styleUrls: ['./agency-profile-page.component.css'],
})
export class AgencyProfilePageComponent {
  organizationId = this.stateService.getOrganizationId();

  constructor(private stateService: StateService) {}
}
