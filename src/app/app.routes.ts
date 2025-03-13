import { Routes } from '@angular/router';
import { AuthGuard } from './authorization/auth.guard';

// Non-authorized pages
import { SignupComponent } from './Municipality/Signup/municipality.signup.component';
import { RoleVerificationComponent } from './Municipality/RoleVerification/role-verification.component';
import { LoginComponent } from './Municipality/Login/login.component';
import { ForgotPasswordComponent } from './Municipality/ForgotPassword/forgot-password.component';

import { MunicipalityVerificationComponent } from './Municipality/Verification/municipality.verification.component';
import { TokenValidationComponent } from './Municipality/Signup/token-validation.component';
import { MunicipalityDetailsComponent } from './Municipality/Details/municipality.details.component';
import { UserSignUpDetails } from './Municipality/UserSignUpDetails/user-signup-details.component';
import { DesignationSelectionComponent } from './Municipality/UserDesignationSelection/municipality.user-designation-selection.component';
import { PaymentPlanConfirmationComponent } from './Municipality/PaymentInformation/paymentplanconfirmation.component';
import { PaymentInfoComponent } from './Municipality/PaymentInformation/paymentinformation.component';

// Authorized pages
import { DashboardComponent } from './dashboard/dashboard.component';
import { TableDetailsComponent } from './Request/TableDetails/request-tabledetails.component';
import { CreateRequestStepper } from './Request/CreateRequestStepper/create-request-stepper.component';

export const routes: Routes = [
  { path: 'signup', component: SignupComponent },
  { path: 'login', component: LoginComponent },
  { path: 'forgot-password', component: ForgotPasswordComponent },
  { path: 'email-verification', component: MunicipalityVerificationComponent },

  { path: 'role-verification', component: RoleVerificationComponent, canActivate: [AuthGuard] },
  { path: 'validateuser', component: TokenValidationComponent, canActivate: [AuthGuard] },
  { path: 'municipality-details', component: MunicipalityDetailsComponent, canActivate: [AuthGuard] },
  { path: 'user-details', component: UserSignUpDetails, canActivate: [AuthGuard] },
  { path: 'user-designation', component: DesignationSelectionComponent, canActivate: [AuthGuard] },
  { path: 'payment-plan-confirmation', component: PaymentPlanConfirmationComponent, canActivate: [AuthGuard] },
  { path: 'payment-information', component: PaymentInfoComponent, canActivate: [AuthGuard] },

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
    ],
    canActivate: [AuthGuard]
  }
  ,
];

