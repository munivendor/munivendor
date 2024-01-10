import { Routes } from '@angular/router'; 

import { SignupComponent } from './signup/signup.component';
import { SignupPasswordComponent } from './signup/signup-password.component';

export const routes: Routes = [
    { path: 'first-component', component: SignupComponent },
    { path: 'second-component', component: SignupPasswordComponent },
  ];

