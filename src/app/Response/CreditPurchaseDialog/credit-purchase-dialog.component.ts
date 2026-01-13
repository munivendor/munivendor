import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormsModule,
  ReactiveFormsModule,
  FormBuilder,
  FormGroup,
  Validators,
} from '@angular/forms';
import {
  MatDialogRef,
  MatDialogModule,
  MAT_DIALOG_DATA,
} from '@angular/material/dialog';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatRadioModule } from '@angular/material/radio';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatTabsModule } from '@angular/material/tabs';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { PaymentInfoService } from '../BillingInformation/services/payment-info.service';
import { SavedPaymentMethod } from '../BillingInformation/billing-information.component';
import { State } from '../../shared/model/state.model';
import { OrganizationService } from '../../Organization/Details/services/organization.service';
import {
  CreditPackageService,
  CreditPackage,
} from '../../Response/services/credit-package.service';
import { forkJoin, Subject, takeUntil } from 'rxjs';
import { CustomerProfileData } from '../BillingInformation/model/CustomerProfileData';
import { User } from '../../shared/model/user.model';
import { UserService } from '../../shared/service/user.service';
import { AuthService } from '../../authorization/auth.service';
import { LoggingService } from '../../exceptionhandling/logging.service';
import { StateService } from '../../Request/services/state.service';

interface DialogData {
  organizationId: number;
  requestId?: number;
  total?: number;
  selectedPackage?: CreditPackage;
  showCreditSelection: boolean;
  contextMessage?: string;
}

@Component({
  selector: 'app-credit-purchase-dialog',
  templateUrl: './credit-purchase-dialog.component.html',
  styleUrls: ['./credit-purchase-dialog.component.css'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatRadioModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatTabsModule,
    MatProgressSpinnerModule,
  ],
})
export class CreditPurchaseDialogComponent implements OnInit {
  currentStep: 'package-selection' | 'payment-selection' = 'package-selection';
  creditPackages: CreditPackage[] = [];
  paymentMethods: SavedPaymentMethod[] = [];
  selectedPaymentMethodId: string | null = null;
  showAddNew = false;
  isLoading = false;
  isLoadingPackages = true;
  isSavingPaymentMethod = false;
  isProcessingPayment = false;
  selectedTabIndex = 0;
  states: State[] = [];
  bankAccountTypes: any[] = [];

  addressForm!: FormGroup;
  ccForm!: FormGroup;
  achForm!: FormGroup;
  viewReady = false;
  user?: User;
  private destroy$ = new Subject<void>();
  userId!: number;
  workEmail!: string;
  calculatedTotal: number = 0;

  readonly MAX_PAYMENT_METHODS = 3;

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: DialogData,
    private dialogRef: MatDialogRef<CreditPurchaseDialogComponent>,
    private paymentInfoService: PaymentInfoService,
    private organizationService: OrganizationService,
    private creditPackageService: CreditPackageService,
    private fb: FormBuilder,
    private userService: UserService,
    private authService: AuthService,
    private loggingService: LoggingService,
    private stateService: StateService
  ) {}

  ngOnInit(): void {
    this.authService.user$.pipe(takeUntil(this.destroy$)).subscribe((user) => {
      if (user) {
        this.userId = user;
        this.userService.getUser(this.userId).subscribe((fullUser) => {
          this.user = fullUser;
          this.workEmail = this.user?.workEmail ?? '';
        });
      }
    });
    if (this.data.showCreditSelection) {
      this.currentStep = 'package-selection';
      this.loadCreditPackages();
    } else {
      this.currentStep = 'payment-selection';
      this.loadCreditPackages();
      if (this.data.selectedPackage) {
        setTimeout(() => {
          const pkg = this.creditPackages.find(
            (p) => p.id === this.data.selectedPackage!.id
          );
          if (pkg) {
            pkg.selected = true;
            pkg.quantity = 1;
          }
        });
      }
      this.loadPaymentData();
      this.initializeForms();
    }
  }

  ngAfterViewInit() {
    setTimeout(() => {
      this.viewReady = true;
    });
  }

  canAddNewPaymentMethod(): boolean {
    return this.paymentMethods.length < this.MAX_PAYMENT_METHODS;
  }

  loadCreditPackages(): void {
    this.isLoadingPackages = true;

    this.creditPackageService.getPaymentPlans().subscribe({
      next: (packages) => {
        this.creditPackages = packages;

        if (this.data.selectedPackage) {
          const pkg = this.creditPackages.find(
            (p) => p.id === this.data.selectedPackage!.id
          );
          if (pkg) {
            pkg.selected = true;
            pkg.quantity = 1;
          }
        }

        this.isLoadingPackages = false;
      },
      error: (error) => {
        this.isLoadingPackages = false;
        const correlationId = error?.error?.correlationId;

        this.loggingService.logException(
          new Error(`HTTP Error ${error.status}: ${error.statusText}`),
          3,
          {
            requestId: this.stateService.getRequestId(),
            organizationId: this.stateService.getOrganizationId(),
            correlationId: correlationId,
            methodName: 'loadCreditPackages',
            className: 'CreditPurchaseDialogComponent',
            operation: 'getPaymentPlans',
            userId: this.stateService.getUserId(),
          }
        );
      },
    });
  }

  initializeForms(): void {
    this.addressForm = this.fb.group({
      streetAddress1: ['', [Validators.required, Validators.maxLength(60)]],
      streetAddress2: ['', Validators.maxLength(60)],
      city: [
        '',
        [Validators.required, Validators.pattern(/^[a-zA-Z\s\-]{1,40}$/)],
      ],
      state: ['', Validators.required],
      zip: ['', [Validators.required, Validators.pattern(/^\d{5}(-\d{4})?$/)]],
    });

    this.ccForm = this.fb.group({
      cardNumber: [
        '',
        [Validators.required, Validators.pattern('^[0-9]{13,19}$')],
      ],
      nameOnCard: [
        '',
        [Validators.required, Validators.pattern(/^[A-Za-z\s'-]{2,50}$/)],
      ],
      expirationDate: [
        '',
        [Validators.required, Validators.pattern(/^(0[1-9]|1[0-2])\/\d{2}$/)],
      ],
      cvv: ['', [Validators.required, Validators.pattern(/^\d{3,4}$/)]],
    });

    this.achForm = this.fb.group({
      nameOnAccount: [
        '',
        [Validators.required, Validators.pattern(/^[A-Za-z\s'-]{2,50}$/)],
      ],
      bankRoutingNumber: [
        '',
        [Validators.required, Validators.pattern(/^\d{9}$/)],
      ],
      bankAccountNumber: [
        '',
        [Validators.required, Validators.pattern(/^\d{6,17}$/)],
      ],
      bankAccountType: ['', Validators.required],
    });
  }

  loadPaymentData(): void {
    this.isLoading = true;

    forkJoin({
      states: this.organizationService.getStates(),
      bankAccountTypes: this.paymentInfoService.getBankAccountTypes(),
      paymentMethods: this.paymentInfoService.getSavedPaymentMethods(
        this.data.organizationId
      ),
    }).subscribe({
      next: ({ states, bankAccountTypes, paymentMethods }) => {
        this.states = states;
        this.bankAccountTypes = bankAccountTypes;
        this.paymentMethods = paymentMethods || [];

        const defaultMethod = this.paymentMethods.find((m) => m.isDefault);
        if (defaultMethod) {
          this.selectedPaymentMethodId = defaultMethod.paymentProfileId;
        }

        this.isLoading = false;
      },
      error: (error) => {
        this.paymentMethods = [];
        this.isLoading = false;

        const correlationId = error?.error?.correlationId;
        const errorUrl = error?.url?.toLowerCase?.() || '';

        const operationMap: Record<string, string> = {
          bankAccountTypes: 'getBankAccountTypes',
          savedPaymentMethods: 'getSavedPaymentMethods',
        };

        const operation =
          Object.entries(operationMap).find(([key]) =>
            errorUrl.includes(key)
          )?.[1] ?? 'UnknownOperation';

        this.loggingService.logException(
          new Error(`HTTP Error ${error.status}: ${error.statusText}`),
          3,
          {
            requestId: this.stateService.getRequestId(),
            organizationId: this.stateService.getOrganizationId(),
            correlationId: correlationId,
            methodName: 'loadPaymentData',
            className: 'CreditPurchaseDialogComponent',
            operation: operation,
            userId: this.stateService.getUserId(),
          }
        );
      },
    });
  }

  onPackageSelectionChange(selectedPackage: CreditPackage): void {
    this.creditPackages.forEach((pkg) => {
      if (pkg.id !== selectedPackage.id) {
        pkg.selected = false;
        pkg.quantity = 0;
      }
    });

    this.calculatedTotal = this.calculateTotal(selectedPackage);
  }

  private calculateTotal(selectedPackage: CreditPackage): number {
    return selectedPackage.price;
  }

  getSelectedPackage(): CreditPackage | null {
    return this.creditPackages.find((pkg) => pkg.selected) || null;
  }

  proceedToPayment(): void {
    const selectedPackage = this.getSelectedPackage();
    if (!selectedPackage) return;

    this.currentStep = 'payment-selection';

    if (!this.ccForm && !this.achForm) {
      this.initializeForms();
    }

    this.loadPaymentData();
  }

  backToPackageSelection(): void {
    this.currentStep = 'package-selection';
  }

  canProceed(): boolean {
    if (this.isProcessingPayment) {
      return false;
    }

    if (this.showAddNew || this.paymentMethods.length === 0) {
      if (!this.addressForm.valid) {
        return false;
      }

      if (this.selectedTabIndex === 0) {
        return this.ccForm.valid;
      } else {
        return this.achForm.valid;
      }
    }
    return this.selectedPaymentMethodId !== null;
  }

  confirmPayment(): void {
    const selectedPackage = this.getSelectedPackage();
    if (!selectedPackage) {
      return;
    }

    this.isProcessingPayment = false;
    this.isSavingPaymentMethod = false;

    if (this.showAddNew || this.paymentMethods.length === 0) {
      this.isSavingPaymentMethod = true;
      this.processNewPaymentMethod(selectedPackage);
    } else {
      this.isProcessingPayment = true;
      this.processExistingPaymentMethod(selectedPackage);
    }
  }

  private processNewPaymentMethod(selectedPackage: CreditPackage): void {
    this.addressForm.markAllAsTouched();

    if (this.selectedTabIndex === 0) {
      this.ccForm.markAllAsTouched();
      if (!this.ccForm.valid || !this.addressForm.valid) {
        this.isSavingPaymentMethod = false;
        return;
      }
    } else {
      this.achForm.markAllAsTouched();
      if (!this.achForm.valid || !this.addressForm.valid) {
        this.isSavingPaymentMethod = false;
        return;
      }
    }

    this.isSavingPaymentMethod = true;

    const customerProfileData: CustomerProfileData = {
      Email: this.user?.workEmail ?? '',
      UserId: this.user?.userId ?? 0,
    };

    if (this.selectedTabIndex === 0) {
      const { firstName, lastName } = this.splitFullName(
        this.ccForm.value.nameOnCard
      );
      const ccPaymentData: any = {
        CardNumber: this.ccForm.value.cardNumber,
        FirstName: firstName,
        LastName: lastName,
        ExpirationDate: this.ccForm.value.expirationDate,
        CVV: this.ccForm.value.cvv,
        BillingAddress: this.addressForm.value.streetAddress1,
        BillingCity: this.addressForm.value.city,
        BillingState: this.addressForm.value.state,
        BillingZipCode: this.addressForm.value.zip,
      };

      this.paymentInfoService
        .saveCreditCardPaymentInfo(
          this.data.organizationId,
          customerProfileData,
          ccPaymentData,
          'CC'
        )
        .subscribe({
          next: (paymentProfileId) => {
            this.loadPaymentMethodsAndComplete(
              paymentProfileId,
              selectedPackage.id
            );
          },
          error: (error) => {
            this.isSavingPaymentMethod = false;
            const correlationId = error?.error?.correlationId;

            this.loggingService.logException(
              new Error(`HTTP Error ${error.status}: ${error.statusText}`),
              3,
              {
                requestId: this.stateService.getRequestId(),
                organizationId: this.stateService.getOrganizationId(),
                correlationId: correlationId,
                methodName: 'processNewPaymentMethod',
                className: 'CreditPurchaseDialogComponent',
                operation: 'saveCreditCardPaymentInfo',
                userId: this.stateService.getUserId(),
              }
            );
          },
        });
    } else {
      const { firstName, lastName } = this.splitFullName(
        this.achForm.value.nameOnAccount
      );

      const achPaymentData: any = {
        FirstName: firstName,
        LastName: lastName,
        BankRoutingNumber: this.achForm.value.bankRoutingNumber,
        BankAccountNumber: this.achForm.value.bankAccountNumber,
        BankAccountType: this.achForm.value.bankAccountType,
        BillingAddress: this.addressForm.value.streetAddress1,
        BillingCity: this.addressForm.value.city,
        BillingState: this.addressForm.value.state,
        BillingZipCode: this.addressForm.value.zip,
      };

      this.paymentInfoService
        .saveACHPaymentInfo(
          this.data.organizationId,
          customerProfileData,
          achPaymentData,
          'ACH'
        )
        .subscribe({
          next: (paymentProfileId) => {
            this.loadPaymentMethodsAndComplete(
              paymentProfileId,
              selectedPackage.id
            );
          },
          error: (error) => {
            this.isSavingPaymentMethod = false;
            const correlationId = error?.error?.correlationId;

            this.loggingService.logException(
              new Error(`HTTP Error ${error.status}: ${error.statusText}`),
              3,
              {
                requestId: this.stateService.getRequestId(),
                organizationId: this.stateService.getOrganizationId(),
                correlationId: correlationId,
                methodName: 'processNewPaymentMethod',
                className: 'CreditPurchaseDialogComponent',
                operation: 'saveACHPaymentInfo',
                userId: this.stateService.getUserId(),
              }
            );
          },
        });
    }
  }

  private loadPaymentMethodsAndComplete(
    newPaymentProfileId: string,
    paymentPlanId: number
  ): void {
    this.isSavingPaymentMethod = true;

    this.paymentInfoService
      .getSavedPaymentMethods(this.data.organizationId)
      .subscribe({
        next: (methods) => {
          this.paymentMethods = methods;
          this.selectedPaymentMethodId = newPaymentProfileId;

          this.showAddNew = false;
          this.isSavingPaymentMethod = false;

          this.addressForm.reset();
          this.ccForm.reset();
          this.achForm.reset();

          const profileId =
            typeof newPaymentProfileId === 'string'
              ? parseInt(newPaymentProfileId, 10)
              : newPaymentProfileId;

          this.dialogRef.close({
            success: true,
            paymentPlanId: paymentPlanId,
            paymentProfileId: profileId,
          });
        },
        error: (error) => {
          this.isSavingPaymentMethod = false;
          this.showAddNew = false;
          const correlationId = error?.error?.correlationId;

          this.loggingService.logException(
            new Error(`HTTP Error ${error.status}: ${error.statusText}`),
            3,
            {
              requestId: this.stateService.getRequestId(),
              organizationId: this.stateService.getOrganizationId(),
              correlationId: correlationId,
              methodName: 'loadPaymentMethodsAndComplete',
              className: 'CreditPurchaseDialogComponent',
              operation: 'getSavedPaymentMethods',
              userId: this.stateService.getUserId(),
            }
          );
        },
      });
  }

  private processExistingPaymentMethod(selectedPackage: CreditPackage): void {
    if (!this.selectedPaymentMethodId) {
      return;
    }

    const profileId =
      typeof this.selectedPaymentMethodId === 'string'
        ? parseInt(this.selectedPaymentMethodId, 10)
        : this.selectedPaymentMethodId;

    this.dialogRef.close({
      success: true,
      paymentPlanId: selectedPackage.id,
      paymentProfileId: profileId,
    });
  }

  onCancel(): void {
    this.dialogRef.close({ success: false });
  }

  trackById(index: number, pkg: CreditPackage) {
    return pkg.id;
  }

  getBankAccountTypeName(enumId: number | undefined): string {
    if (enumId === undefined) return '';
    const accountType = this.bankAccountTypes.find(
      (type) => type.enumId === enumId
    );
    return accountType ? accountType.codeName : '';
  }

  private splitFullName(fullName: string) {
    const parts = fullName.trim().split(' ');
    return { firstName: parts[0], lastName: parts.slice(1).join(' ') || '' };
  }

  cardTypeLabels: Record<string, string> = {
    Visa: 'Visa',
    MasterCard: 'Mastercard',
    Discover: 'Discover',
    AmericanExpress: 'American Express',
  };

  getCardTypeLabel(cardType?: string): string {
    return this.cardTypeLabels[cardType ?? ''] ?? 'Credit Card';
  }
}
