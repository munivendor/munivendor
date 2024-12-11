import { Routes } from '@angular/router';

import { SignupComponent } from './Municipality/Signup/municipality.signup.component';
//import { SignupPasswordComponent } from './Signup_toremove/signup-password.component';
import { DashboardComponent } from './dashboard/dashboard.component';
import { RequestProposalComponent } from './Request/request-proposal.component';
import { RequestOverviewComponent } from './Request/request-overview.component';
import { BasicRequestComponent } from './Request/request-basic.component';
import { RequestOutFrameComponent } from './Request/request-outframe.component';
import { RequestReviewComponent } from './Request/request-review.component';
import { RequestRequiredDocumentsComponent } from './Request/request-required-docs.component';
import { TableDetailsComponent } from './Request/TableDetails/request-tabledetails.component';
import { CreateRequestStepper } from './Request/CreateRequestStepper/create-request-stepper.component';
import { TokenValidationComponent } from './Municipality/Signup/token-validation.component';
import { MunicipalityDetailsComponent } from './Municipality/Details/municipality.details.component';

export const routes: Routes = [
  { path: 'first-component', component: SignupComponent },
  { 
    path: 'login', component: SignupComponent
  },
  { path: 'second-component', component: SignupComponent },
  { path: 'validateuser', component: TokenValidationComponent },
  { path: 'municipality-details', component: MunicipalityDetailsComponent   },

  { path: 'request-proposal-component', component: RequestProposalComponent },
  { path: 'request-overview-component', component: RequestOverviewComponent },
  {
    path: 'dashboard-component', component: DashboardComponent,
    children: [
      {
        path: 'requests-view', component: TableDetailsComponent,
      },
      { 
        path: 'create-request-view', component: CreateRequestStepper 
      },
      { 
        path: 'edit-request-view/:requestId', component: CreateRequestStepper 
      },
      
      {
        path: 'request-outframe-component', component: RequestOutFrameComponent,
        children: [
          { path: 'request-basic-component', component: BasicRequestComponent },
          { path: 'request-overview-component', component: RequestOverviewComponent },
          { path: 'request-requireddocuments-component', component: RequestRequiredDocumentsComponent },
          { path: 'request-review-component', component: RequestReviewComponent },
      
        ]
      }
    ]
  }
  ,
];

