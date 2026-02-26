import { Component, Inject, OnDestroy, OnInit } from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  Validators,
  AbstractControl,
  ValidationErrors,
} from '@angular/forms';
import { MaterialModule } from '../../Organization/shared/material.module';
import { MatDialog } from '@angular/material/dialog';
import { ReactiveFormsModule } from '@angular/forms';
import { PaymentInfoService } from './services/payment-info.service';
import { CustomerProfileData } from './model/CustomerProfileData';
import { MatIconModule } from '@angular/material/icon';
import { MatTabsModule } from '@angular/material/tabs';
import { MatTabChangeEvent } from '@angular/material/tabs';
import { Subject, takeUntil, forkJoin } from 'rxjs';
import { RouterModule } from '@angular/router';
import { State } from '../../shared/model/state.model';
import { OrganizationService } from '../../Organization/Details/services/organization.service';
import { UserService } from '../../shared/service/user.service';
import { AuthService } from '../../authorization/auth.service';
import { User } from '../../shared/model/user.model';
import { CommonModule } from '@angular/common';
import { LoadingService } from '../../shared/LoadingSpinner/loading.service';
import { StateService } from '../../Request/services/state.service';
import { MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { SnackbarNotificationService } from '../../shared/service/snackbar-notification.service';
import { LoggingService } from '../../exceptionhandling/logging.service';
import { SafeHtmlPipe } from '../../shared/safe-html.pipe';

@Component({
  selector: 'your-dialog',
  standalone: true,
  imports: [MatDialogModule, MatButtonModule],
  template: `<h2 mat-dialog-title>{{ data.title }}</h2>
    <mat-dialog-content>{{ data.message }} </mat-dialog-content
    ><mat-dialog-actions style="justify-content: flex-end">
      <button mat-button color="warn" [mat-dialog-close]="true">
        {{ data.confirmText }}
      </button>
      <button mat-button [mat-dialog-close]="false" cdkFocusInitial>
        {{ data.cancelText }}
      </button>
    </mat-dialog-actions>`,
})
export class YourDialog {
  constructor(
    @Inject(MAT_DIALOG_DATA)
    public data: {
      title: string;
      message?: string;
      confirmText?: string;
      cancelText?: string;
    },
  ) {}
}

export interface SavedPaymentMethod {
  paymentProfileId: string;
  accountType: 'ACH' | 'CC';
  lastFourNumbers: string;
  cardType?: string;
  bankAccountType?: number;
  isDefault: boolean;
  bankAccountMasked?: string;
  expirationDate?: string;
}

@Component({
  selector: 'app-billing-information',
  templateUrl: './billing-information.component.html',
  styleUrls: ['./billing-information.component.css'],
  standalone: true,
  imports: [
    CommonModule,
    MaterialModule,
    ReactiveFormsModule,
    MatIconModule,
    MatTabsModule,
    RouterModule,
    SafeHtmlPipe,
  ],
  providers: [PaymentInfoService],
})
export class BillingInformationComponent implements OnInit, OnDestroy {
  achForm!: FormGroup;
  ccForm!: FormGroup;
  addressForm!: FormGroup;

  selectedPaymentType: 'ACH' | 'CC' = 'ACH';
  organizationTypeId?: number;
  user?: User;

  savedPaymentMethods: SavedPaymentMethod[] = [];
  isEditMode = false;
  editingPaymentId: string | null = null;
  showAddNewForm = false;

  isLoading = true;
  isLoadingPaymentMethods = true;
  achFormVisible = true;
  ccFormVisible = true;

  private destroy$ = new Subject<void>();
  organizationId!: number;
  userId!: number;
  bankAccountTypes: { codeId: number; codeDesc: string }[] = [];
  states: State[] = [];
  workEmail!: string;

  readonly MAX_PAYMENT_METHODS = 3;

  constructor(
    private fb: FormBuilder,
    private dialog: MatDialog,
    private paymentInfoService: PaymentInfoService,
    private organizationService: OrganizationService,
    private userService: UserService,
    private authService: AuthService,
    private loadingService: LoadingService,
    private stateService: StateService,
    private snackbarNotificationService: SnackbarNotificationService,
    private loggingService: LoggingService,
  ) {}

  resetForm(): void {
    this.achForm.reset();
    this.ccForm.reset();
    this.addressForm.reset();
  }

  showAddNewPaymentForm(): void {
    this.showAddNewForm = true;
    this.isEditMode = false;
    this.editingPaymentId = null;
    this.resetForm();
  }

  cancelEdit(): void {
    this.showAddNewForm = false;
    this.isEditMode = false;
    this.editingPaymentId = null;

    this.achForm = this.createAchGroup();
    this.ccForm = this.createCreditCardGroup();
    this.addressForm = this.createAddressGroup();

    this.achFormVisible = true;
    this.ccFormVisible = true;

    this.selectedPaymentType = 'ACH';
  }

  deletePaymentMethod(method: SavedPaymentMethod): void {
    const dialogRef = this.dialog.open(YourDialog, {
      width: '400px',
      data: {
        title: 'Delete Payment Method',
        message: `Are you sure you want to delete this ${
          method.accountType === 'CC' ? 'credit card' : 'bank account'
        } ending in ${method.lastFourNumbers}?`,
        confirmText: 'Delete',
        cancelText: 'Cancel',
      },
    });

    dialogRef.afterClosed().subscribe((confirmed) => {
      if (confirmed) {
        this.paymentInfoService
          .deletePaymentMethod(this.organizationId, method.paymentProfileId)
          .pipe(takeUntil(this.destroy$))
          .subscribe({
            next: () => {
              this.savedPaymentMethods = this.savedPaymentMethods.filter(
                (m) => m.paymentProfileId !== method.paymentProfileId,
              );
              this.snackbarNotificationService.showSnackbarSuccess(
                'Payment method successfully deleted.',
              );
            },
            error: (error) => {
              const correlationId = error?.error?.correlationId;
              this.loggingService.logException(
                new Error(`HTTP Error ${error.status}: ${error.statusText}`),
                3,
                {
                  requestId: this.stateService.getRequestId(),
                  organizationId: this.stateService.getOrganizationId(),
                  correlationId: correlationId,
                  methodName: 'deletePaymentMethod',
                  className: 'BillingInformationComponent',
                  operation: 'deletePaymentMethod',
                  userId: this.stateService.getUserId(),
                },
              );
            },
          });
      }
    });
  }

  onTabChange(event: MatTabChangeEvent) {
    const paymentTypes = ['ACH', 'CC'];
    this.selectedPaymentType =
      (paymentTypes[event.index] as 'ACH' | 'CC') || 'ACH';

    if (this.selectedPaymentType === 'ACH') {
      this.recreateForm('cc');
    } else if (this.selectedPaymentType === 'CC') {
      this.recreateForm('ach');
    }

    this.clearFormVisualErrors(this.addressForm);
  }

  private recreateForm(formType: 'ach' | 'cc') {
    if (formType === 'ach') {
      this.achFormVisible = false;
      setTimeout(() => {
        this.achFormVisible = true;
        this.clearFormVisualErrors(this.achForm);
      }, 0);
    } else {
      this.ccFormVisible = false;
      setTimeout(() => {
        this.ccFormVisible = true;
        this.clearFormVisualErrors(this.ccForm);
      }, 0);
    }
  }

  private clearFormVisualErrors(group: FormGroup) {
    Object.keys(group.controls).forEach((key) => {
      const control = group.get(key);
      if (control) {
        control.markAsUntouched();
        control.markAsPristine();
      }
    });
  }

  setDefaultPaymentMethod(method: SavedPaymentMethod): void {
    this.paymentInfoService
      .setDefaultPaymentMethod(this.organizationId, method.paymentProfileId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.savedPaymentMethods.forEach((m) => {
            m.isDefault = m.paymentProfileId === method.paymentProfileId;
          });
          this.snackbarNotificationService.showSnackbarSuccess(
            'Default payment method successfully updated.',
          );
        },
        error: (error) => {
          const correlationId = error?.error?.correlationId;
          this.loggingService.logException(
            new Error(`HTTP Error ${error.status}: ${error.statusText}`),
            3,
            {
              requestId: this.stateService.getRequestId(),
              organizationId: this.stateService.getOrganizationId(),
              correlationId: correlationId,
              methodName: 'setDefaultPaymentMethod',
              className: 'BillingInformationComponent',
              operation: 'setDefaultPaymentMethod',
              userId: this.stateService.getUserId(),
            },
          );
        },
      });
  }

  loadSavedPaymentMethods(organizationId: number): void {
    this.isLoadingPaymentMethods = true;
    this.loadingService.show();

    this.paymentInfoService
      .getSavedPaymentMethods(organizationId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (methods) => {
          this.savedPaymentMethods = methods;
          this.isLoadingPaymentMethods = false;
          this.loadingService.hide();
        },
        error: (error) => {
          this.isLoadingPaymentMethods = false;
          this.loadingService.hide();
          const correlationId = error?.error?.correlationId;
          this.loggingService.logException(
            new Error(`HTTP Error ${error.status}: ${error.statusText}`),
            3,
            {
              requestId: this.stateService.getRequestId(),
              organizationId: this.stateService.getOrganizationId(),
              correlationId: correlationId,
              methodName: 'loadSavedPaymentMethods',
              className: 'BillingInformationComponent',
              operation: 'getSavedPaymentMethods',
              userId: this.stateService.getUserId(),
            },
          );
        },
      });
  }

  ngOnInit(): void {
    this.addressForm = this.createAddressGroup();
    this.achForm = this.createAchGroup();
    this.ccForm = this.createCreditCardGroup();

    forkJoin({
      states: this.organizationService.getStates(),
      bankAccountTypes: this.paymentInfoService.getBankAccountTypes(),
    })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: ({ states, bankAccountTypes }) => {
          this.states = states;
          this.bankAccountTypes = bankAccountTypes;
        },
        error: (error) => {
          const correlationId = error?.error?.correlationId;
          const errorUrl = error?.url?.toLowerCase?.() || '';
          const operationMap: Record<string, string> = {
            states: 'getStates',
            bankAccountTypes: 'getBankAccountTypes',
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
              organizationId: this.organizationId,
              correlationId: correlationId,
              methodName: 'ngOnInit',
              className: 'BillingInformationComponent',
              operation: operation,
              userId: this.stateService.getUserId(),
            },
          );
        },
      });
    this.organizationTypeId = this.stateService.getOrganizationTypeId() ?? 0;
    this.organizationId = this.stateService.getOrganizationId() ?? 0;

    this.authService.user$.pipe(takeUntil(this.destroy$)).subscribe((user) => {
      if (user) {
        this.userId = user;
        this.userService.getUser(this.userId).subscribe((fullUser) => {
          this.user = fullUser;
          this.workEmail = this.user?.workEmail ?? '';
          this.loadSavedPaymentMethods(this.organizationId);
          this.isLoading = false;
        });
      }
    });
  }

  // FORM GROUP CREATORS WITH ENHANCED VALIDATION
  private createAddressGroup(): FormGroup {
    return this.fb.group({
      streetAddress1: [
        '',
        {
          validators: [Validators.required, Validators.maxLength(60)],
          updateOn: 'blur',
        },
      ],
      city: [
        '',
        {
          validators: [
            Validators.required,
            Validators.pattern(/^[a-zA-Z\s\-]{1,40}$/),
          ],
          updateOn: 'blur',
        },
      ],
      state: [
        '',
        {
          validators: [Validators.required],
          updateOn: 'change',
        },
      ],
      zip: [
        '',
        {
          validators: [
            Validators.required,
            Validators.pattern(/^\d{5}(-\d{4})?$/),
          ],
          updateOn: 'change',
        },
      ],
    });
  }

  private createAchGroup(): FormGroup {
    const group = this.fb.group(
      {
        nameOnAccount: [
          '',
          {
            validators: [
              Validators.required,
              this.nameOnCardOrAccountValidator,
            ],
            updateOn: 'blur',
          },
        ],
        bankRoutingNumber: [
          '',
          {
            validators: [
              Validators.required,
              this.routingNumberValidator.bind(this),
            ],
            updateOn: 'change',
          },
        ],
        confirmBankRoutingNumber: [
          '',
          {
            validators: [Validators.required],
            updateOn: 'change',
          },
        ],
        bankAccountNumber: [
          '',
          {
            validators: [
              Validators.required,
              this.accountNumberValidator.bind(this),
            ],
            updateOn: 'change',
          },
        ],
        confirmBankAccountNumber: [
          '',
          {
            validators: [Validators.required],
            updateOn: 'change',
          },
        ],
        bankAccountType: [
          '',
          {
            validators: [Validators.required],
            updateOn: 'change',
          },
        ],
      },
      {
        updateOn: 'blur',
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

    // Use the helper method for all numeric fields
    group.get('bankRoutingNumber')?.valueChanges.subscribe(() => {
      this.removeNonDigits(group.get('bankRoutingNumber')!);
    });

    group.get('confirmBankRoutingNumber')?.valueChanges.subscribe(() => {
      this.removeNonDigits(group.get('confirmBankRoutingNumber')!);
    });

    group.get('bankAccountNumber')?.valueChanges.subscribe(() => {
      this.removeNonDigits(group.get('bankAccountNumber')!);
    });

    group.get('confirmBankAccountNumber')?.valueChanges.subscribe(() => {
      this.removeNonDigits(group.get('confirmBankAccountNumber')!);
    });

    return group;
  }

  private createCreditCardGroup(): FormGroup {
    const group = this.fb.group({
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
        {
          validators: [Validators.required, this.nameOnCardOrAccountValidator],
          updateOn: 'blur',
        },
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
      cvv: [
        '',
        {
          validators: [Validators.required, this.cvvValidator.bind(this)],
          updateOn: 'blur',
        },
      ],
    });

    group.get('cardNumber')?.valueChanges.subscribe(() => {
      this.formatCardNumber(group.get('cardNumber')!);
      this.onCardNumberInput();

      const cvvControl = group.get('cvv');
      if (cvvControl?.value) {
        cvvControl.updateValueAndValidity({ emitEvent: false });
      }
    });

    group.get('cvv')?.valueChanges.subscribe(() => {
      this.removeNonDigits(group.get('cvv')!);
    });

    group.get('expirationDate')?.valueChanges.subscribe(() => {
      this.formatExpirationDate(group.get('expirationDate')!);
    });

    return group;
  }

  private removeNonDigits(control: AbstractControl): void {
    const value = control.value;
    if (!value) return;

    const sanitized = value.replace(/\D/g, '');
    if (sanitized !== value) {
      control.setValue(sanitized, { emitEvent: false });
    }
  }

  private sanitizeNumericInput(control: AbstractControl): void {
    if (control.value) {
      const sanitized = control.value.replace(/\D/g, '');
      if (sanitized !== control.value) {
        control.setValue(sanitized, { emitEvent: false });
      }
    }
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
      const len = digitsOnly.length;
      if (len <= 4) {
        formatted = digitsOnly;
      } else if (len <= 10) {
        formatted = `${digitsOnly.slice(0, 4)} ${digitsOnly.slice(4)}`;
      } else {
        formatted = `${digitsOnly.slice(0, 4)} ${digitsOnly.slice(4, 10)} ${digitsOnly.slice(10, 15)}`;
      }
    } else {
      formatted = digitsOnly.match(/.{1,4}/g)?.join(' ') ?? digitsOnly;
    }

    if (formatted !== value) {
      control.setValue(formatted, { emitEvent: false });
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

    if (checksum !== 0) {
      return {
        invalidRoutingNumber: true,
      };
    }

    return null;
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
    const cardType = this.detectCardType(
      this.ccForm?.get('cardNumber')?.value || '',
    );
    const pattern = cardType === 'amex' ? /^\d{4}$/ : /^\d{3}$/;
    return pattern.test(cvv) ? null : { invalidCvv: true };
  }

  private nameOnCardOrAccountValidator(
    control: AbstractControl,
  ): ValidationErrors | null {
    if (!control.value) return null;
    const pattern = /^[A-Za-z\s'-]{2,50}$/;
    return pattern.test(control.value) ? null : { invalidName: true };
  }

  // HELPER METHODS
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

  // FORM SUBMISSION METHODS
  submitACH() {
    if (this.achForm.invalid || this.addressForm.invalid) {
      this.achForm.markAllAsTouched();
      this.addressForm.markAllAsTouched();
      return;
    }

    const { firstName, lastName } = this.splitFullName(
      this.achForm.value.nameOnAccount,
    );

    const paymentProfileRequest = {
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

    if (this.isEditMode && this.editingPaymentId) {
      this.paymentInfoService
        .updatePaymentMethod(
          this.organizationId,
          this.editingPaymentId,
          paymentProfileRequest,
        )
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => {
            this.afterSaveSuccess();
            this.snackbarNotificationService.showSnackbarSuccess(
              'ACH payment method updated successfully.',
            );
          },
          error: (error) => {
            const correlationId = error?.error?.correlationId;

            this.loggingService.logException(
              new Error(`HTTP Error ${error.status}: ${error.statusText}`),
              3,
              {
                requestId: this.stateService.getRequestId(),
                organizationId: this.stateService.getOrganizationId(),
                correlationId: correlationId,
                methodName: 'submitACH',
                className: 'BillingInformationComponent',
                operation: 'updatePaymentMethod',
                userId: this.stateService.getUserId(),
              },
            );
          },
        });
    } else {
      this.savePaymentInfo('ACH', paymentProfileRequest);
    }
  }

  submitCC() {
    if (this.ccForm.invalid || this.addressForm.invalid) {
      this.ccForm.markAllAsTouched();
      this.addressForm.markAllAsTouched();
      return;
    }

    const { firstName, lastName } = this.splitFullName(
      this.ccForm.value.nameOnCard,
    );

    const paymentProfileRequest = {
      CardNumber: this.ccForm.value.cardNumber.replace(/\s/g, ''),
      CVV: this.ccForm.value.cvv,
      FirstName: firstName,
      LastName: lastName,
      ExpirationDate: this.ccForm.value.expirationDate,
      BillingAddress: this.addressForm.value.streetAddress1,
      BillingCity: this.addressForm.value.city,
      BillingState: this.addressForm.value.state,
      BillingZipCode: this.addressForm.value.zip,
    };

    if (this.isEditMode && this.editingPaymentId) {
      this.paymentInfoService
        .updatePaymentMethod(
          this.organizationId,
          this.editingPaymentId,
          paymentProfileRequest,
        )
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => {
            this.afterSaveSuccess();
            this.snackbarNotificationService.showSnackbarSuccess(
              'Credit card payment method updated successfully.',
            );
          },
          error: (error) => {
            const correlationId = error?.error?.correlationId;

            this.loggingService.logException(
              new Error(`HTTP Error ${error.status}: ${error.statusText}`),
              3,
              {
                requestId: this.stateService.getRequestId(),
                organizationId: this.stateService.getOrganizationId(),
                correlationId: correlationId,
                methodName: 'submitCC',
                className: 'BillingInformationComponent',
                operation: 'updatePaymentMethod',
                userId: this.stateService.getUserId(),
              },
            );
          },
        });
    } else {
      this.savePaymentInfo('CC', paymentProfileRequest);
    }
  }
  private afterSaveSuccess(): void {
    this.loadSavedPaymentMethods(this.organizationId);
    this.resetForms();
  }

  private savePaymentInfo(accountType: 'ACH' | 'CC', paymentData: any) {
    const customerProfileData: CustomerProfileData = {
      Email: this.user?.workEmail ?? '',
      UserId: this.user?.userId ?? 0,
    };

    const saveMethods = {
      ACH: () =>
        this.paymentInfoService.saveACHPaymentInfo(
          this.organizationId,
          customerProfileData,
          paymentData,
          'ACH',
        ),
      CC: () =>
        this.paymentInfoService.saveCreditCardPaymentInfo(
          this.organizationId,
          customerProfileData,
          paymentData,
          'CC',
        ),
    };

    saveMethods[accountType]()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.loadSavedPaymentMethods(this.organizationId);
          this.resetForms();
          this.snackbarNotificationService.showSnackbarSuccess(
            `${accountType} payment method successfully added.`,
          );
        },
        error: (error) => {
          if (error.status === 409) {
            this.snackbarNotificationService.showSnackbarError(
              'A payment method with these details already exists.',
            );
          } else {
            const correlationId = error?.error?.correlationId;
            const errorUrl = error?.url?.toLowerCase?.() || '';

            const operationMap: Record<string, string> = {
              saveACHPaymentInfo: 'saveACHPaymentInfo',
              saveCreditCardPaymentInfo: 'saveCreditCardPaymentInfo',
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
                methodName: 'savePaymentInfo',
                className: 'BillingInformationComponent',
                operation: operation,
                userId: this.stateService.getUserId(),
              },
            );
          }
        },
      });
  }

  private resetForms() {
    this.achForm.reset();
    this.ccForm.reset();
    this.addressForm.reset();

    this.showAddNewForm = false;
    this.isEditMode = false;
    this.editingPaymentId = null;
  }

  private splitFullName(fullName: string) {
    const parts = fullName.trim().split(' ');
    return { firstName: parts[0], lastName: parts.slice(1).join(' ') || '' };
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
