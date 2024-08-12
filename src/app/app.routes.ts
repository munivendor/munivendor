import { Routes } from '@angular/router'; 

import { SignupComponent } from './signup/signup.component';
import { SignupPasswordComponent } from './signup/signup-password.component';
import { DashboardComponent } from './dashboard/dashboard.component';
import { RequestComponent } from  './Request/request-list.component';
import { RequestProposalComponent } from  './Request/request-proposal.component';
import { RequestOverviewComponent } from  './Request/request-overview.component';
import { BasicRequestComponent } from  './Request/request-basic.component';
import { RequestOutFrameComponent } from './Request/request-outframe.component';



export const routes: Routes = [
    { path: 'first-component', component: SignupComponent},
    { path: 'second-component', component: SignupPasswordComponent },
    { path: 'dashboard-component', component: DashboardComponent },
    { path: 'request-proposal-component', component: RequestProposalComponent},
    { path: 'request-overview-component',   component: RequestOverviewComponent}, 
 
    { path: 'request-outframe-component',   component: RequestOutFrameComponent,
    children: [
      { path: 'request-basic-component', component: BasicRequestComponent },
      { path: 'request-overview-component', component: RequestOverviewComponent },
      
    ]
  }
    
    , 
    
  
  ];

