import { Routes } from '@angular/router';
import { AuthGuard } from './authorization/auth.guard';

// Non-authorized pages
import { SignupComponent } from './Signup/signup.component';
import { LoginComponent } from './Login/login.component';
import { ForgotPasswordComponent } from './Login/ForgotPassword/forgot-password.component';
import { EmailVerification } from './Signup/Verification/verification.component';
import { TokenValidationComponent } from './Signup/token-validation.component';

// Authorized pages
import { RoleVerificationComponent } from './Signup/RoleVerification/role-verification.component';
import { GovernmentAgencyDetailsComponent } from './Municipality/Details/municipality.details.component';
import { UserSignUpDetails } from './Signup/UserSignUpDetails/user-signup-details.component';
import { DesignationSelectionComponent } from './Municipality/UserDesignationSelection/municipality.user-designation-selection.component';
import { PaymentPlanConfirmationComponent } from './Signup/PaymentInformation/paymentplanconfirmation.component';
import { BillingInformationComponent } from './Signup/PaymentInformation/paymentinformation.component';

import { DashboardComponent } from './dashboard/dashboard.component';
import { TableDetailsComponent } from './Request/TableDetails/request-tabledetails.component';
import { CreateRequestStepper } from './Request/CreateRequestStepper/create-request-stepper.component';
import { CategoryTreeComponent } from './CategoryTree/category-tree.component';

export const routes: Routes = [
  { path: 'signup', component: SignupComponent },
  { path: 'login', component: LoginComponent },
  { path: 'forgot-password', component: ForgotPasswordComponent },
  { path: 'email-verification', component: EmailVerification },
  { path: 'validateuser', component: TokenValidationComponent },

  { path: 'role-verification', component: RoleVerificationComponent, canActivate: [AuthGuard] },
  { path: 'government-agency-details', component: GovernmentAgencyDetailsComponent, canActivate: [AuthGuard] },
  { path: 'user-details', component: UserSignUpDetails, canActivate: [AuthGuard] },
  { path: 'user-designation', component: DesignationSelectionComponent, canActivate: [AuthGuard] },
  { path: 'payment-plan-confirmation', component: PaymentPlanConfirmationComponent, canActivate: [AuthGuard] },
  { path: 'billing-information', component: BillingInformationComponent, canActivate: [AuthGuard] },
  
  { path: 'dashboard-component', component: DashboardComponent, canActivate: [AuthGuard]},
  { path: 'create-request-view', component: CreateRequestStepper, canActivate: [AuthGuard]},
  { path: 'requests-view', component: TableDetailsComponent, canActivate: [AuthGuard] },
  { path: 'edit-request-view/:requestId', component: CreateRequestStepper, canActivate: [AuthGuard] },
  { path: 'categories', component: CategoryTreeComponent, canActivate: [AuthGuard] },
];

