import { Routes } from '@angular/router';

import { SignupComponent } from './signup/signup.component';
import { SignupPasswordComponent } from './signup/signup-password.component';
import { DashboardComponent } from './dashboard/dashboard.component';
import { RequestComponent } from './Request/request-list.component';
import { RequestProposalComponent } from './Request/request-proposal.component';
import { RequestOverviewComponent } from './Request/request-overview.component';
import { BasicRequestComponent } from './Request/request-basic.component';
import { RequestOutFrameComponent } from './Request/request-outframe.component';
import { RequestReviewComponent } from './Request/request-review.component';
import { RequestRequiredDocumentsComponent } from './Request/request-required-docs.component';
import { TableDetailsComponent } from './Request/TableDetails/request-tabledetails.component';
import { CreateRequestPage } from './Request/CreateRequestPage/create-request-page.component';

export const routes: Routes = [
  { path: 'first-component', component: SignupComponent },
  { path: 'second-component', component: SignupPasswordComponent },

  { path: 'request-proposal-component', component: RequestProposalComponent },
  { path: 'request-overview-component', component: RequestOverviewComponent },
  // { path: 'dashboard-component/request-outframe-component', redirectTo: '/dashboard-component/request-outframe-component/request-basic-component', pathMatch: 'full' },
  // { path: 'dashboard-component/request-outframe-component', redirectTo: '/dashboard-component/request-outframe-component/request-overview-component', pathMatch: 'full' },
  {
    path: 'dashboard-component', component: DashboardComponent,
    children: [
      {
        path: 'requests-view', component: TableDetailsComponent,
      },
      { 
        path: 'create-request-view', component: CreateRequestPage 
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

