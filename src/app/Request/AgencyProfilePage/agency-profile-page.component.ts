import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { StateService } from '../../Request/services/state.service';
import { MatIconModule } from '@angular/material/icon';
import { DecisionMakersComponent } from './DecisionMakers/decision-makers.component';
import { AgencyDetailsComponent } from './AgencyDetails/agency-details.component';
import { PurchasingDesigneeComponent } from './Designees/purchasing-designee.component';
import { LegalDesigneeComponent } from './Designees/legal-designee.component';
import { ClerkDesigneeComponent } from './Designees/clerk-designee.component';
import { AgencyProfileService } from '../services/agency-profile.service';
import { UserDesignation } from '../model/user-designation.model';
import { AgencyDetails } from '../model/agency-details.model';
import { State } from '../../shared/model/state.model';

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
export class AgencyProfilePageComponent implements OnInit {
  organizationId = this.stateService.getOrganizationId();
  states: State[] = [];

  agencyDetails: AgencyDetails | null = null; // ← add
  isLoadingAgency = true;
  isLoadingStates = true;

  purchasingDesignee: UserDesignation | null = null;
  legalDesignee: UserDesignation | null = null;
  clerkDesignee: UserDesignation | null = null;
  isLoadingDesignees = true;

  constructor(
    private stateService: StateService,
    private agencyProfileService: AgencyProfileService,
  ) {}

  ngOnInit(): void {
    this.loadAgencyDetails();
    this.loadDesignees();
    this.loadStates();
  }

  loadStates(): void {
    this.isLoadingStates = true;
    this.agencyProfileService.GetStates().subscribe({
      next: (data) => {
        this.states = data;
        this.isLoadingStates = false;
      },
      error: () => {
        this.isLoadingStates = false;
      },
    });
  }

  loadAgencyDetails(): void {
    this.isLoadingAgency = true;
    this.agencyProfileService.GetAgencyDetails(this.organizationId!).subscribe({
      next: (data) => {
        this.agencyDetails = data;
        this.isLoadingAgency = false;
      },
      error: () => {
        this.isLoadingAgency = false;
      },
    });
  }

  loadDesignees(): void {
    this.isLoadingDesignees = true;
    this.agencyProfileService
      .GetUserDesignations(this.organizationId!)
      .subscribe({
        next: (designations) => {
          this.purchasingDesignee =
            designations.find((d) => d.designationId === 1) ?? null;
          this.legalDesignee =
            designations.find((d) => d.designationId === 2) ?? null;
          this.clerkDesignee =
            designations.find((d) => d.designationId === 3) ?? null;
          this.isLoadingDesignees = false;
        },
        error: () => {
          this.isLoadingDesignees = false;
        },
      });
  }
}
