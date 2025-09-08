import { Routes } from '@angular/router';
import { AuthGuard } from './authorization/auth.guard';

// Non-authorized pages
import { SignupComponent } from './Signup/signup.component';
import { LoginComponent } from './Login/login.component';
import { ForgotPasswordComponent } from './ForgotPassword/forgot-password.component';
import { EmailVerification } from './Signup/Verification/verification.component';
import { TokenValidationComponent } from './Signup/token-validation.component';

// Authorized pages
import { RoleVerificationComponent } from './Signup/RoleVerification/role-verification.component';
import { OrganizationDetailsComponent } from './Organization/Details/organization.details.component';
import { UserSignUpDetails } from './Signup/UserSignUpDetails/user-signup-details.component';
// import { DesignationSelectionComponent } from './Organization/UserDesignationSelection/organization.user-designation-selection.component';
// import { PaymentPlanConfirmationComponent } from './Signup/PaymentInformation/paymentplanconfirmation.component';
// import { BillingProfileComponent } from './Signup/PaymentInformation/paymentinformation.component';

// import { DashboardComponent } from './dashboard/dashboard.component';
import { AgencyTableDetailsComponent } from './Request/TableDetails/request-tabledetails.component';
import { OfferorTableDetailsComponent } from './Request/TableDetails/offeror-request-tabledetails.component';
import { CreateRequestStepper } from './Request/CreateRequestStepper/create-request-stepper.component';
import { CategoryTreeComponent } from './CategoryTree/category-tree.component';

import { ResponseStepper } from './Response/ResponseStepper/response-stepper.component';
import { TwoStepVerificationComponent } from './TwoStepVerification/two-step-verification.component';
import { TwoStepChallengeComponent } from './TwoStepVerification/two-step-challenge.component';

export const routes: Routes = [
  { path: '', redirectTo: '/login', pathMatch: 'full' },
  { path: 'signup', component: SignupComponent },
  { path: 'login', component: LoginComponent },
  { path: 'forgot-password', component: ForgotPasswordComponent },
  { path: 'email-verification', component: EmailVerification },
  { path: 'validateuser', component: TokenValidationComponent },

  {
    path: 'role-verification',
    component: RoleVerificationComponent,
    canActivate: [AuthGuard],
  },
  {
    path: 'organization-details',
    component: OrganizationDetailsComponent,
    canActivate: [AuthGuard],
  },
  {
    path: 'user-details',
    component: UserSignUpDetails,
    canActivate: [AuthGuard],
  },
  // {
  //   path: 'user-designation',
  //   component: DesignationSelectionComponent,
  //   canActivate: [AuthGuard],
  // },
  // {
  //   path: 'payment-plan-confirmation',
  //   component: PaymentPlanConfirmationComponent,
  //   canActivate: [AuthGuard],
  // },
  // {
  //   path: 'billing-profile',
  //   component: BillingProfileComponent,
  //   canActivate: [AuthGuard],
  // },

  // {
  //   path: 'dashboard-component',
  //   component: DashboardComponent,
  //   canActivate: [AuthGuard],
  // },
  {
    path: 'create-request-view',
    component: CreateRequestStepper,
    canActivate: [AuthGuard],
  },
  {
    path: 'requests-view',
    component: AgencyTableDetailsComponent,
    canActivate: [AuthGuard],
  },
  {
    path: 'offeror-requests-view',
    component: OfferorTableDetailsComponent,
    canActivate: [AuthGuard],
  },
  {
    path: 'edit-request-view/:requestId',
    component: CreateRequestStepper,
    canActivate: [AuthGuard],
  },
  {
    path: 'categories',
    component: CategoryTreeComponent,
    canActivate: [AuthGuard],
  },

  {
    path: 'response-basic/:sourceId',
    component: ResponseStepper,
    canActivate: [AuthGuard],
  },
  {
    path: 'response-basic/:sourceId/edit/:responseId',
    component: ResponseStepper,
    canActivate: [AuthGuard],
  },
  {
    path: 'two-step-verification',
    component: TwoStepVerificationComponent,
    canActivate: [AuthGuard],
  },
  {
    path: 'two-step-challenge',
    component: TwoStepChallengeComponent,
    canActivate: [AuthGuard],
  },
];
