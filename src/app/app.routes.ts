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
import { RequestOverviewComponent } from './Request/request-overview.component';
import { BasicRequestComponent } from './Request/request-basic.component';
import { RequestOutFrameComponent } from './Request/request-outframe.component';
import { RequestReviewComponent } from './Request/request-review.component';
import { RequestRequiredDocumentsComponent } from './Request/request-required-docs.component';
import { TableDetailsComponent } from './Request/TableDetails/request-tabledetails.component';
import { CreateRequestStepper } from './Request/CreateRequestStepper/create-request-stepper.component';



export const routes: Routes = [
  { path: 'signup', component: SignupComponent },
  { path: 'role-verification', component: RoleVerificationComponent },
  { path: 'login', component: LoginComponent },
  { path: 'forgot-password', component: ForgotPasswordComponent },
  { path: 'municipality-verification', component: MunicipalityVerificationComponent },
  { path: 'validateuser', component: TokenValidationComponent },
  { path: 'municipality-details', component: MunicipalityDetailsComponent },
  { path: 'user-details', component: UserSignUpDetails },
  { path: 'user-designation', component: DesignationSelectionComponent },
  { path: 'payment-plan-confirmation', component: PaymentPlanConfirmationComponent },
  { path: 'payment-information', component: PaymentInfoComponent },

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
    ],
    canActivate: [AuthGuard]
  }
  ,
];

