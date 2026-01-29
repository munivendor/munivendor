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
        [Validators.required, this.cardNumberValidator.bind(this)],
      ],
      nameOnCard: [
        '',
        [Validators.required, this.nameOnCardOrAccountValidator.bind(this)],
      ],
      expirationDate: [
        '',
        [Validators.required, this.expirationDateValidator.bind(this)],
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
            'confirmBankRoutingNumber'
          ),
          this.matchingFieldsValidator(
            'bankAccountNumber',
            'confirmBankAccountNumber'
          ),
        ],
      }
    );

    this.ccForm.get('cardNumber')?.valueChanges.subscribe(() => {
      this.sanitizeNumericInput(this.ccForm.get('cardNumber')!);
    });

    this.ccForm.get('cvv')?.valueChanges.subscribe(() => {
      this.sanitizeNumericInput(this.ccForm.get('cvv')!);
    });

    // Trigger CVV revalidation when card number changes (for AMEX detection)
    this.ccForm.get('cardNumber')?.valueChanges.subscribe(() => {
      const cvvControl = this.ccForm.get('cvv');
      if (cvvControl?.value) {
        cvvControl.updateValueAndValidity({ emitEvent: false });
      }
    });

    // Sanitize numeric inputs for ACH
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

    this.isProcessingPayment = true;

    const profileId =
      typeof this.selectedPaymentMethodId === 'string'
        ? parseInt(this.selectedPaymentMethodId, 10)
        : this.selectedPaymentMethodId;

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

          // Handle payment declined (402)
          if (error.status === 402) {
            // Show error message to user
            alert(
              'Payment was declined. Please try a different payment method.'
            );
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
            }
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

  getBankAccountTypeName(codeId: number | undefined): string {
    if (codeId === undefined) return '';
    const accountType = this.bankAccountTypes.find(
      (type) => type.codeId === codeId
    );
    return accountType ? accountType.codeDesc : '';
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

  // CREDIT CARD VALIDATORS
  private cardNumberValidator(
    control: AbstractControl
  ): ValidationErrors | null {
    const cardNumber = control.value;
    if (!cardNumber) return null;

    const sanitized = cardNumber.replace(/\D/g, '');

    if (!/^\d+$/.test(cardNumber)) {
      return { pattern: true };
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

    // AMEX requires 4 digits, others require 3
    const requiredLength = cardType === 'amex' ? 4 : 3;

    return cvv.length === requiredLength ? null : { invalidCvv: true };
  }

  private expirationDateValidator(
    control: AbstractControl
  ): ValidationErrors | null {
    const expDate = control.value;
    if (!expDate) return null;

    // Check format MM/YY
    if (!/^(0[1-9]|1[0-2])\/\d{2}$/.test(expDate)) {
      return { pattern: true };
    }

    // Check if date is not expired
    const [month, year] = expDate.split('/').map(Number);
    const currentDate = new Date();
    const currentYear = currentDate.getFullYear() % 100;
    const currentMonth = currentDate.getMonth() + 1;

    if (year < currentYear || (year === currentYear && month < currentMonth)) {
      return { expired: true };
    }

    return null;
  }

  private nameOnCardOrAccountValidator(
    control: AbstractControl
  ): ValidationErrors | null {
    if (!control.value) return null;

    const pattern = /^[A-Za-z\s'-]{2,50}$/;
    return pattern.test(control.value) ? null : { invalidName: true };
  }

  // ACH VALIDATORS
  private routingNumberValidator(
    control: AbstractControl
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
    control: AbstractControl
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

  private detectCardType(cardNumber: string = ''): string | null {
    cardNumber = cardNumber.replace(/\D/g, '');
    if (/^4/.test(cardNumber)) return 'visa';
    if (/^5[1-5]/.test(cardNumber) || /^2[2-7]/.test(cardNumber))
      return 'mastercard';
    if (/^3[47]/.test(cardNumber)) return 'amex';
    if (/^6(?:011|5)/.test(cardNumber)) return 'discover';
    return null;
  }
}
