import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormsModule,
  ReactiveFormsModule,
  FormBuilder,
  FormGroup,
  Validators,
  AbstractControl,
  ValidationErrors,
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
import { MatSnackBar } from '@angular/material/snack-bar';
import { SafeHtmlPipe } from '../../shared/safe-html.pipe';

interface DialogData {
  organizationId: number;
  requestId?: number;
  total?: number;
  selectedPackage?: CreditPackage;
  showCreditSelection: boolean;
  contextMessage?: string;
  isForSubmission?: boolean;
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
    SafeHtmlPipe,
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
    private stateService: StateService,
    private _snackBar: MatSnackBar,
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
      // Skip to payment selection, but still load packages
      this.currentStep = 'payment-selection';
      this.loadCreditPackages();

      // If a package was already selected, maintain that selection
      if (this.data.selectedPackage) {
        setTimeout(() => {
          const pkg = this.creditPackages.find(
            (p) => p.id === this.data.selectedPackage!.id,
          );
          if (pkg) {
            pkg.selected = true;
            pkg.quantity = 1;
            this.calculatedTotal = this.calculateTotal(pkg);
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

  isPaymentMethodExpired(method: SavedPaymentMethod): boolean {
    if (method.accountType !== 'CC' || !method.expirationDate) {
      return false;
    }

    const expDateStr = method.expirationDate.trim();
    let month: number, year: number;

    if (expDateStr.includes('/')) {
      const [monthStr, yearStr] = expDateStr.split('/');
      month = parseInt(monthStr, 10);
      year = parseInt(yearStr, 10);
    } else {
      return false;
    }

    const fullYear = year < 100 ? 2000 + year : year;

    const expirationDate = new Date(fullYear, month, 0);
    const currentDate = new Date();

    return expirationDate < currentDate;
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
            (p) => p.id === this.data.selectedPackage!.id,
          );
          if (pkg) {
            pkg.selected = true;
            pkg.quantity = 1;
            this.calculatedTotal = this.calculateTotal(pkg);
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
          },
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
        {
          validators: [
            Validators.required,
            this.cardNumberValidator.bind(this),
          ],
          updateOn: 'change',
        },
      ],
      nameOnCard: [
        '',
        [Validators.required, this.nameOnCardOrAccountValidator.bind(this)],
      ],
      expirationDate: [
        '',
        {
          validators: [
            Validators.required,
            this.expirationDateValidator.bind(this),
          ],
          updateOn: 'change',
        },
      ],
      cvv: ['', [Validators.required, this.cvvValidator.bind(this)]],
    });

    this.achForm = this.fb.group(
      {
        nameOnAccount: [
          '',
          [Validators.required, this.nameOnCardOrAccountValidator.bind(this)],
        ],
        bankRoutingNumber: [
          '',
          [Validators.required, this.routingNumberValidator.bind(this)],
        ],
        confirmBankRoutingNumber: ['', [Validators.required]],
        bankAccountNumber: [
          '',
          [Validators.required, this.accountNumberValidator.bind(this)],
        ],
        confirmBankAccountNumber: ['', [Validators.required]],
        bankAccountType: ['', Validators.required],
      },
      {
        validators: [
          this.matchingFieldsValidator(
            'bankRoutingNumber',
            'confirmBankRoutingNumber',
          ),
          this.matchingFieldsValidator(
            'bankAccountNumber',
            'confirmBankAccountNumber',
          ),
        ],
      },
    );

    this.ccForm.get('cardNumber')?.valueChanges.subscribe(() => {
      this.formatCardNumber(this.ccForm.get('cardNumber')!);
      this.onCardNumberInput();

      const cvvControl = this.ccForm.get('cvv');
      if (cvvControl?.value) {
        cvvControl.updateValueAndValidity({ emitEvent: false });
      }
    });

    this.ccForm.get('cvv')?.valueChanges.subscribe(() => {
      this.removeNonDigits(this.ccForm.get('cvv')!);
    });

    this.ccForm.get('expirationDate')?.valueChanges.subscribe(() => {
      this.formatExpirationDate(this.ccForm.get('expirationDate')!);
    });

    this.achForm.get('bankRoutingNumber')?.valueChanges.subscribe(() => {
      this.sanitizeNumericInput(this.achForm.get('bankRoutingNumber')!);
    });

    this.achForm.get('confirmBankRoutingNumber')?.valueChanges.subscribe(() => {
      this.sanitizeNumericInput(this.achForm.get('confirmBankRoutingNumber')!);
    });

    this.achForm.get('bankAccountNumber')?.valueChanges.subscribe(() => {
      this.sanitizeNumericInput(this.achForm.get('bankAccountNumber')!);
    });

    this.achForm.get('confirmBankAccountNumber')?.valueChanges.subscribe(() => {
      this.sanitizeNumericInput(this.achForm.get('confirmBankAccountNumber')!);
    });
  }

  private removeNonDigits(control: AbstractControl): void {
    const value = control.value;
    if (!value) return;

    const sanitized = value.replace(/\D/g, '');
    if (sanitized !== value) {
      control.setValue(sanitized, { emitEvent: false });
    }
  }

  private formatExpirationDate(control: AbstractControl): void {
    const value = control.value;
    if (!value) return;

    const digitsOnly = value.replace(/\D/g, '');

    let formatted: string;

    if (digitsOnly.length === 0) {
      formatted = '';
    } else if (digitsOnly.length <= 2) {
      formatted =
        digitsOnly.length === 2 && !value.endsWith('/')
          ? digitsOnly + '/'
          : digitsOnly;
    } else {
      formatted = digitsOnly.slice(0, 2) + '/' + digitsOnly.slice(2, 4);
    }

    if (formatted !== value) {
      control.setValue(formatted, { emitEvent: false });
    }
  }

  detectedCardBrand: string | null = null;

  cardBrandSvgs: { [key: string]: string } = {
    visa: `
    <svg width="38" height="24" viewBox="0 0 38 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="38" height="24" rx="4" fill="#1434CB"/>
      <path d="M15.36 16.53L16.86 7.47H19.35L17.85 16.53H15.36ZM26.76 7.74C26.25 7.53 25.44 7.29 26.45 7.29C21.99 7.29 20.25 8.49 20.25 10.26C20.25 11.55 21.45 12.21 22.35 12.63C23.28 13.05 23.61 13.32 23.61 13.71C23.61 14.28 22.92 14.55 22.26 14.55C21.3 14.55 20.79 14.4 20.04 14.07L19.71 13.92L19.32 16.17C19.92 16.44 21.03 16.68 22.17 16.68C24.81 16.68 26.52 15.51 26.55 13.59C26.55 12.54 25.86 11.73 24.39 11.07C23.52 10.68 23.01 10.41 23.01 9.99C23.01 9.63 23.43 9.24 24.33 9.24C25.11 9.24 25.65 9.39 26.07 9.57L26.28 9.66L26.67 7.5L26.76 7.74ZM30.81 7.47H28.98C28.41 7.47 28.02 7.62 27.75 8.19L24.15 16.53H26.79L27.27 15.18H30.42L30.72 16.53H33.06L30.81 7.47ZM28.26 13.23L29.43 9.87L30.09 13.23H28.26ZM13.65 7.47L11.28 14.19L11.04 13.02C10.62 11.58 9.33 10.02 7.86 9.24L10.05 16.5H12.72L16.35 7.47H13.65Z" fill="white"/>
      <path d="M9.51 7.47H5.7L5.67 7.68C8.55 8.4 10.47 10.02 11.22 12.06L10.32 8.22C10.17 7.65 9.78 7.5 9.24 7.47H9.51Z" fill="#F7B600"/>
    </svg>
  `,
    mastercard: `
    <svg width="38" height="24" viewBox="0 0 38 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="38" height="24" rx="4" fill="#000"/>
      <circle cx="14.5" cy="12" r="7" fill="#EB001B"/>
      <circle cx="23.5" cy="12" r="7" fill="#F79E1B"/>
      <path d="M19 6.47C17.85 7.47 17.13 8.97 17.13 10.62C17.13 12.27 17.85 13.77 19 14.77C20.15 13.77 20.87 12.27 20.87 10.62C20.87 8.97 20.15 7.47 19 6.47Z" fill="#FF5F00"/>
    </svg>
  `,
    amex: `
    <svg width="38" height="24" viewBox="0 0 38 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="38" height="24" rx="4" fill="#006FCF"/>
      <text x="19" y="15" font-family="Arial, sans-serif" font-size="9" font-weight="bold" fill="white" text-anchor="middle">AMEX</text>
    </svg>
  `,
    discover: `
  <svg width="50" height="26" viewBox="0 0 50 26" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect width="50" height="26" rx="4" fill="#FF6000"/>
    <text x="5" y="16" font-family="Arial, sans-serif" font-size="7" font-weight="bold" fill="#000" text-anchor="start">DISC</text>
    <circle cx="26.2" cy="13.2" r="2.8" fill="#FFA500"/>
    <text x="29.9" y="16" font-family="Arial, sans-serif" font-size="7" font-weight="bold" fill="#000" text-anchor="start">VER</text>
  </svg>
`,
  };

  getCardBrandSvg(): string | null {
    return this.detectedCardBrand
      ? this.cardBrandSvgs[this.detectedCardBrand]
      : null;
  }

  onCardNumberInput(): void {
    const cardNumber = this.ccForm.get('cardNumber')?.value || '';

    const sanitized = cardNumber.replace(/\s/g, '');
    this.detectedCardBrand = this.detectCardType(sanitized);
  }

  private formatCardNumber(control: AbstractControl): void {
    const value = control.value;
    if (!value) {
      control.setValue('', { emitEvent: false });
      return;
    }

    const digitsOnly = value.replace(/\D/g, '');

    if (!digitsOnly) {
      control.setValue('', { emitEvent: false });
      return;
    }

    const cardType = this.detectCardType(digitsOnly);
    let formatted: string;

    if (cardType === 'amex') {
      if (digitsOnly.length <= 4) {
        formatted = digitsOnly;
      } else if (digitsOnly.length <= 10) {
        formatted = digitsOnly.slice(0, 4) + ' ' + digitsOnly.slice(4);
      } else {
        formatted =
          digitsOnly.slice(0, 4) +
          ' ' +
          digitsOnly.slice(4, 10) +
          ' ' +
          digitsOnly.slice(10, 15);
      }
    } else {
      formatted = digitsOnly.match(/.{1,4}/g)?.join(' ') || digitsOnly;
    }

    if (formatted !== value) {
      control.setValue(formatted, { emitEvent: false });
    }
  }

  loadPaymentData(): void {
    this.isLoading = true;

    forkJoin({
      states: this.organizationService.getStates(),
      bankAccountTypes: this.paymentInfoService.getBankAccountTypes(),
      paymentMethods: this.paymentInfoService.getSavedPaymentMethods(
        this.data.organizationId,
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
            errorUrl.includes(key),
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
          },
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

    if (this.selectedPaymentMethodId) {
      const selectedMethod = this.paymentMethods.find(
        (m) => m.paymentProfileId === this.selectedPaymentMethodId,
      );
      return selectedMethod
        ? !this.isPaymentMethodExpired(selectedMethod)
        : false;
    }

    return false;
  }

  savePaymentMethod(): void {
    this.isSavingPaymentMethod = true;
    this.isProcessingPayment = false;

    const selectedPackage = this.getSelectedPackage();
    if (!selectedPackage) {
      this.isSavingPaymentMethod = false;
      return;
    }

    this.processNewPaymentMethod(selectedPackage);
  }

  confirmPayment(): void {
    this.isProcessingPayment = true;
    this.isSavingPaymentMethod = false;

    const selectedPackage = this.getSelectedPackage();
    if (!selectedPackage) {
      this.isProcessingPayment = false;
      return;
    }

    this.processExistingPaymentMethod(selectedPackage);
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
        this.ccForm.value.nameOnCard,
      );
      const ccPaymentData: any = {
        CardNumber: this.ccForm.value.cardNumber.replace(/\s/g, ''),
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
          'CC',
        )
        .subscribe({
          next: (paymentProfileId) => {
            this.loadPaymentMethodsAndComplete(
              paymentProfileId,
              selectedPackage.id,
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
              },
            );
          },
        });
    } else {
      const { firstName, lastName } = this.splitFullName(
        this.achForm.value.nameOnAccount,
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
          'ACH',
        )
        .subscribe({
          next: (paymentProfileId) => {
            this.loadPaymentMethodsAndComplete(
              paymentProfileId,
              selectedPackage.id,
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
              },
            );
          },
        });
    }
  }

  private loadPaymentMethodsAndComplete(
    newPaymentProfileId: string,
    paymentPlanId: number,
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
            },
          );
        },
      });
  }

  private processExistingPaymentMethod(selectedPackage: CreditPackage): void {
    if (!this.selectedPaymentMethodId) {
      return;
    }

    this.isProcessingPayment = true;

    const profileId =
      typeof this.selectedPaymentMethodId === 'string'
        ? parseInt(this.selectedPaymentMethodId, 10)
        : this.selectedPaymentMethodId;

    // If this is for offer submission (response-review component)
    // call submitOffer
    if (this.data.isForSubmission && this.data.requestId) {
      this.paymentInfoService
        .submitOffer(
          this.data.organizationId,
          this.data.requestId,
          profileId,
          selectedPackage.id,
        )
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (response) => {
            this.isProcessingPayment = false;
            this.dialogRef.close({
              success: true,
              submitted: true,
            });
          },
          error: (error) => {
            this.isProcessingPayment = false;

            if (
              error.status === 402 &&
              error.error?.detail === 'PAYMENT_DECLINED'
            ) {
              this._snackBar.open(
                error.error?.declineReasonCode ||
                  'Payment was declined. Please try a different payment method.',
                'Close',
                {
                  verticalPosition: 'top',
                  duration: 5000,
                },
              );

              this.selectedPaymentMethodId = null;

              return;
            }

            this.dialogRef.close({
              success: false,
              error: error,
            });
          },
        });
      return;
    }

    // If standalone credit purchase
    // Call chargePayment directly (purchasing/history component)
    this.paymentInfoService
      .chargePayment(this.data.organizationId, selectedPackage.id, profileId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.isProcessingPayment = false;
          this.dialogRef.close({
            success: true,
            paymentPlanId: selectedPackage.id,
            paymentProfileId: profileId,
          });
        },
        error: (error) => {
          this.isProcessingPayment = false;

          // Handle payment declined (402) - keep dialog open
          if (
            error.status === 402 &&
            error.error?.detail === 'PAYMENT_DECLINED'
          ) {
            this._snackBar.open(
              error.error?.declineReasonCode ||
                'Payment was declined. Please try a different payment method.',
              'Close',
              {
                verticalPosition: 'top',
                duration: 5000,
              },
            );

            this.selectedPaymentMethodId = null;

            return;
          }

          const correlationId = error?.error?.correlationId;
          this.loggingService.logException(
            new Error(`HTTP Error ${error.status}: ${error.statusText}`),
            3,
            {
              requestId: this.stateService.getRequestId(),
              organizationId: this.stateService.getOrganizationId(),
              correlationId: correlationId,
              methodName: 'processExistingPaymentMethod',
              className: 'CreditPurchaseDialogComponent',
              operation: 'chargePayment',
              userId: this.stateService.getUserId(),
            },
          );

          this.dialogRef.close({
            success: false,
            error: error,
          });
        },
      });
  }

  onCancel(): void {
    this.dialogRef.close({ success: false });
  }

  trackById(index: number, pkg: CreditPackage) {
    return pkg.id;
  }

  private splitFullName(fullName: string) {
    const parts = fullName.trim().split(' ');
    return { firstName: parts[0], lastName: parts.slice(1).join(' ') || '' };
  }

  // CREDIT CARD VALIDATORS
  private cardNumberValidator(
    control: AbstractControl,
  ): ValidationErrors | null {
    const cardNumber = control.value;
    if (!cardNumber) return null;

    const sanitized = cardNumber.replace(/\s/g, '').replace(/\D/g, '');

    if (sanitized.length === 0) {
      return null;
    }

    if (sanitized.length < 13 || sanitized.length > 19) {
      return { pattern: true };
    }

    // Luhn algorithm (checksum validation)
    let sum = 0;
    let isEven = false;

    for (let i = sanitized.length - 1; i >= 0; i--) {
      let digit = parseInt(sanitized.charAt(i), 10);

      if (isEven) {
        digit *= 2;
        if (digit > 9) {
          digit -= 9;
        }
      }

      sum += digit;
      isEven = !isEven;
    }

    return sum % 10 === 0 ? null : { invalidCard: true };
  }

  private cvvValidator(control: AbstractControl): ValidationErrors | null {
    const cvv = control.value;
    if (!cvv) return null;

    if (!/^\d+$/.test(cvv)) {
      return { invalidCvv: true };
    }

    const cardNumber = this.ccForm?.get('cardNumber')?.value || '';
    const cardType = this.detectCardType(cardNumber);

    const requiredLength = cardType === 'amex' ? 4 : 3;

    return cvv.length === requiredLength ? null : { invalidCvv: true };
  }

  onExpirationDateKeydown(event: KeyboardEvent): void {
    const input = event.target as HTMLInputElement;
    const value = input.value;
    const cursorPosition = input.selectionStart ?? 0;

    if (event.key === 'Backspace') {
      if (cursorPosition === 3 && value[2] === '/') {
        event.preventDefault();
        const newValue = value.slice(0, 1);
        this.ccForm
          .get('expirationDate')
          ?.setValue(newValue, { emitEvent: true });

        setTimeout(() => {
          input.setSelectionRange(1, 1);
        }, 0);
      }
    }

    if (event.key === 'Delete') {
      if (cursorPosition === 2 && value[2] === '/') {
        event.preventDefault();
        setTimeout(() => {
          input.setSelectionRange(3, 3);
        }, 0);
      }
    }
  }

  private expirationDateValidator(
    control: AbstractControl,
  ): ValidationErrors | null {
    const value = control.value;
    if (!value) return null;

    const match = value.match(/^(\d{2})\/(\d{2})$/);
    if (!match) return { pattern: true };

    const month = parseInt(match[1], 10);
    const year = parseInt('20' + match[2], 10);

    if (month < 1 || month > 12) {
      return { invalidMonth: true };
    }

    const now = new Date();
    const expiry = new Date(year, month - 1);

    if (expiry < now) {
      return { expired: true };
    }

    return null;
  }

  private nameOnCardOrAccountValidator(
    control: AbstractControl,
  ): ValidationErrors | null {
    if (!control.value) return null;

    const pattern = /^[A-Za-z\s'-]{2,50}$/;
    return pattern.test(control.value) ? null : { invalidName: true };
  }

  // ACH VALIDATORS
  private routingNumberValidator(
    control: AbstractControl,
  ): ValidationErrors | null {
    const routingNumber = control.value;
    if (!routingNumber) return null;

    if (!/^\d+$/.test(routingNumber)) {
      return { pattern: true };
    }

    if (routingNumber.length !== 9) {
      return { pattern: true };
    }

    // ABA routing number checksum validation
    const digits = routingNumber.split('').map(Number);
    const checksum =
      (3 * (digits[0] + digits[3] + digits[6]) +
        7 * (digits[1] + digits[4] + digits[7]) +
        (digits[2] + digits[5] + digits[8])) %
      10;

    return checksum === 0 ? null : { invalidRoutingNumber: true };
  }

  private accountNumberValidator(
    control: AbstractControl,
  ): ValidationErrors | null {
    const accountNumber = control.value;
    if (!accountNumber) return null;

    if (!/^\d+$/.test(accountNumber)) {
      return { pattern: true };
    }

    if (accountNumber.length < 6 || accountNumber.length > 17) {
      return { pattern: true };
    }

    if (/^0+$/.test(accountNumber) || /^1+$/.test(accountNumber)) {
      return { suspiciousAccountNumber: true };
    }

    return null;
  }

  private sanitizeNumericInput(control: AbstractControl): void {
    if (control.value) {
      const sanitized = control.value.replace(/\D/g, '');
      if (sanitized !== control.value) {
        control.setValue(sanitized, { emitEvent: false });
      }
    }
  }

  private matchingFieldsValidator(field1: string, field2: string) {
    return (group: FormGroup): ValidationErrors | null => {
      const control1 = group.get(field1);
      const control2 = group.get(field2);

      if (!control1 || !control2) return null;

      if (control2.value && control1.value !== control2.value) {
        control2.setErrors({ mismatch: true });
        return { mismatch: true };
      } else {
        const errors = control2.errors;
        if (errors) {
          delete errors['mismatch'];
          control2.setErrors(Object.keys(errors).length ? errors : null);
        }
      }

      return null;
    };
  }

  detectCardType(cardNumber: string = ''): string | null {
    const sanitized = cardNumber.replace(/\D/g, '');

    if (sanitized.length < 4) return null;

    if (/^4/.test(sanitized)) return 'visa';
    if (/^5[1-5]/.test(sanitized) || /^2[2-7]/.test(sanitized))
      return 'mastercard';
    if (/^3[47]/.test(sanitized)) return 'amex';
    if (/^6(?:011|5)/.test(sanitized)) return 'discover';

    return null;
  }
}
