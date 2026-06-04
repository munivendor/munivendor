import { Component, OnInit, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
import { forkJoin } from 'rxjs';
import { AuthorizingOfficialsComponent } from './AuthorizingOfficials/authorizing-officials.component';
import { OfferorOrganizationDetailsComponent } from './OfferorDetails/offeror-details.component';
import { LegalInformationComponent } from './LegalInformation/legal-information.component';
import { StockholderInformationComponent } from './StockholderInformation/stockholder-information.component';
import { OfferorProfileService } from '../services/offeror-profile.service';
import { State } from '../../shared/model/state.model';
import { ComplianceDocumentsComponent } from './RequiredComplianceForms/required-compliance-forms.component';
import { RequiredFilesComponent } from './RequiredFiles/required-files.component';
import { ProhibitedActivitiesRussiaBelarusComponent } from './ProhibitedActivitiesRussiaBelarus/prohibited-activities-russia-belarus.component';
import { ProhibitedActivitiesIranComponent } from './ProhibitedActivitiesIran/prohibited-activities-iran.component';
import { OrganizationDocument } from '../model/organization-document.model';
import { DocumentType } from '../model/document-type.model';
import { StateService } from '../../Request/services/state.service';

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
    ComplianceDocumentsComponent,
    RequiredFilesComponent,
    ProhibitedActivitiesRussiaBelarusComponent,
    ProhibitedActivitiesIranComponent,
  ],
})
export class OfferorProfilePageComponent implements OnInit {
  states: State[] = [];
  countries: State[] = [];
  counties: State[] = [];
  referenceDataLoaded = false;

  organizationId: number | null = null;
  organizationDocuments: OrganizationDocument[] = [];
  documentTypes: DocumentType[] = [];

  offerProfileDetails: {
    offerorProfileId: number;
    formTypeId: number;
    details: string;
  }[] = [];

  constructor(
    private offerorProfileService: OfferorProfileService,
    private stateService: StateService,
  ) {}

  ngOnInit(): void {
    this.organizationId = this.stateService.getOrganizationId();

    forkJoin({
      states: this.offerorProfileService.GetStates(),
      countries: this.offerorProfileService.GetCountries(),
      counties: this.offerorProfileService.GetCounties(),
      documentTypes: this.offerorProfileService.GetDocumentTypes(),
      documents: this.offerorProfileService.GetOrganizationDocuments(
        this.organizationId!,
      ),
      profileDetails:
        this.offerorProfileService.GetOfferorProfileDiscloserDetails(
          this.organizationId!,
        ),
    }).subscribe({
      next: ({
        states,
        countries,
        counties,
        documentTypes,
        documents,
        profileDetails,
      }) => {
        this.states = states;
        this.countries = countries;
        this.counties = counties;
        this.documentTypes = documentTypes;
        this.organizationDocuments = documents;
        this.offerProfileDetails = profileDetails;
        this.referenceDataLoaded = true;
      },
      error: () => {
        this.referenceDataLoaded = true;
      },
    });
  }

  loadDocuments(): void {
    if (!this.organizationId) return;
    this.offerorProfileService
      .GetOrganizationDocuments(this.organizationId)
      .subscribe({
        next: (docs) => {
          this.organizationDocuments = docs;
        },
        error: () => {},
      });
  }

  onDocumentUploaded(): void {
    if (!this.organizationId) return;
    this.offerorProfileService
      .GetOrganizationDocuments(this.organizationId)
      .subscribe({ next: (docs) => (this.organizationDocuments = docs) });
  }

  onProfileDetailsSaved(): void {
    if (!this.organizationId) return;
    this.offerorProfileService
      .GetOfferorProfileDiscloserDetails(this.organizationId)
      .subscribe({ next: (details) => (this.offerProfileDetails = details) });
  }
}
