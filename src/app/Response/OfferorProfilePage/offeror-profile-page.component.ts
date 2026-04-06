import { Component, OnInit, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
import { forkJoin } from 'rxjs';
import { AuthorizingOfficialsComponent } from './AuthorizingOfficials/authorizing-officials.component';
import { OfferorOrganizationDetailsComponent } from './OfferorDetails/offeror-details.component';
import { LegalInformationComponent } from './LegalInformation/legal-information.component';
import { StockholderInformationComponent } from './StockholderInformation/stockholder-information.component';
import { OfferorProfileService } from '../services/offeror-profile.service';
import { State } from '../../shared/model/state.model';

@Component({
  selector: 'offeror-profile-page',
  templateUrl: './offeror-profile-page.component.html',
  styleUrls: ['./offeror-profile-page.component.css'],
  encapsulation: ViewEncapsulation.None,
  standalone: true,
  imports: [
    CommonModule,
    AuthorizingOfficialsComponent,
    OfferorOrganizationDetailsComponent,
    LegalInformationComponent,
    StockholderInformationComponent,
  ],
})
export class OfferorProfilePageComponent implements OnInit {
  states: State[] = [];
  countries: State[] = [];
  counties: State[] = [];
  referenceDataLoaded = false;

  constructor(private offerorProfileService: OfferorProfileService) {}

  ngOnInit(): void {
    forkJoin({
      states: this.offerorProfileService.GetStates(),
      countries: this.offerorProfileService.GetCountries(),
      counties: this.offerorProfileService.GetCounties(),
    }).subscribe({
      next: ({ states, countries, counties }) => {
        this.states = states;
        this.countries = countries;
        this.counties = counties;
        this.referenceDataLoaded = true;
      },
      error: () => {
        this.referenceDataLoaded = true;
      },
    });
  }
}
