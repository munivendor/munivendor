import { Component, OnInit, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthorizingOfficialsComponent } from './AuthorizingOfficials/authorizing-officials.component';
import { OfferorOrganizationDetailsComponent } from './OfferorDetails/offeror-details.component';
import { LegalInformationComponent } from './LegalInformation/legal-information.component';

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
  ],
})
export class OfferorProfilePageComponent implements OnInit {
  ngOnInit(): void {}
}
