import { Routes } from '@angular/router'; 

import { SignupComponent } from './signup/signup.component';
import { SignupPasswordComponent } from './signup/signup-password.component';
import { DashboardComponent } from './dashboard/dashboard.component';
import { RequestComponent } from  './Request/request-list.component';
import { RequestProposalComponent } from  './Request/request-proposal.component';
import { RequestProposalComponent } from  './Request/request-proposal.component';

export const routes: Routes = [
    { path: 'first-component', component: SignupComponent},
    { path: 'second-component', component: SignupPasswordComponent },
    { path: 'dashboard-component', component: DashboardComponent },
    { path: 'request-proposal-component', component: RequestProposalComponent},
    { path: 'request-overview-component', 
    component: RequestOverviewComponent, 
    resolve: {request: RequestOverviewResolver}},
    children: [ { path: 'request-component',component: RequestComponent},]
    }
    
    
  
  ];

