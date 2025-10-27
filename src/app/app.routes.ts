import { Routes } from '@angular/router';
import { AuthGuard, GuestGuard } from './authorization/auth.guard';

// Non-authorized pages
import { SignupComponent } from './Signup/signup.component';
import { LoginComponent } from './Login/login.component';
import { ForgotPasswordComponent } from './ForgotPassword/forgot-password.component';
import { ForgotPasswordResetComponent } from './ForgotPasswordReset/forgot-password-reset.component';
import { EmailVerification } from './Signup/Verification/verification.component';
import { TokenValidationComponent } from './Signup/token-validation.component';

// Authorized pages
// import { RoleVerificationComponent } from './Signup/RoleVerification/role-verification.component';
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
import { DefinitionsComponent } from './DefinitionsPage/definitions.component';
import { UserGuideComponent } from './Response/ReadMePage/read-me.component';

import { OfferorProfilePageComponent } from './Response/OfferorProfilePage/offeror-profile-page.component';

import { ResponseStepper } from './Response/ResponseStepper/response-stepper.component';
import { FlowCompletionGuard } from './authorization/auth.guard';

export const routes: Routes = [
  { path: '', redirectTo: '/login', pathMatch: 'full' },
  // Guest-only routes (authenticated users will be redirected)
  {
    path: 'signup',
    component: SignupComponent,
    canActivate: [GuestGuard],
    data: { showSidenav: false },
  },
  {
    path: 'login',
    component: LoginComponent,
    canActivate: [GuestGuard],
    data: { showSidenav: false },
  },
  {
    path: 'forgot-password',
    component: ForgotPasswordComponent,
    canActivate: [GuestGuard],
    data: { showSidenav: false },
  },
  {
    path: 'reset-password',
    component: ForgotPasswordResetComponent,
    canActivate: [GuestGuard],
    data: { showSidenav: false },
  },
  {
    path: 'email-verification',
    component: EmailVerification,
    canActivate: [GuestGuard],
    data: { showSidenav: false },
  },
  {
    path: 'validateuser',
    component: TokenValidationComponent,
    canActivate: [],
    data: { showSidenav: false },
  },

  // {
  //   path: 'role-verification',
  //   component: RoleVerificationComponent,
  //   canActivate: [AuthGuard],
  // },
  {
    path: 'organization-details',
    component: OrganizationDetailsComponent,
    canActivate: [AuthGuard],
    data: { showSidenav: false },
  },
  {
    path: 'user-details',
    component: UserSignUpDetails,
    canActivate: [AuthGuard],
    data: { showSidenav: false },
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

  {
    path: 'create-request-view',
    component: CreateRequestStepper,
    canActivate: [AuthGuard],
    data: { showSidenav: true },
  },
  {
    path: 'requests-view',
    component: AgencyTableDetailsComponent,
    canActivate: [AuthGuard, FlowCompletionGuard],
    data: { showSidenav: true },
  },
  {
    path: 'offeror-requests-view',
    component: OfferorTableDetailsComponent,
    canActivate: [AuthGuard, FlowCompletionGuard],
    data: { showSidenav: true },
  },
  {
    path: 'edit-request-view/:requestId',
    component: CreateRequestStepper,
    canActivate: [AuthGuard],
    data: { showSidenav: true },
  },
  {
    path: 'categories',
    component: CategoryTreeComponent,
    canActivate: [AuthGuard],
    data: { showSidenav: true },
  },

  {
    path: 'response-basic/:sourceId',
    component: ResponseStepper,
    canActivate: [AuthGuard],
    data: { showSidenav: true },
  },
  {
    path: 'response-basic/:sourceId/edit/:responseId',
    component: ResponseStepper,
    canActivate: [AuthGuard],
    data: { showSidenav: true },
  },
  {
    path: 'definitions',
    component: DefinitionsComponent,
    canActivate: [AuthGuard],
    data: { showSidenav: true },
  },
  {
    path: 'offeror-profile-page',
    component: OfferorProfilePageComponent,
    canActivate: [AuthGuard],
    data: { showSidenav: true },
  },
  {
    path: 'user-guide',
    component: UserGuideComponent,
    canActivate: [AuthGuard],
    data: { showSidenav: true },
  },
];
