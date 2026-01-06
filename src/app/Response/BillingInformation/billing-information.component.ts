import { Component, Inject, OnDestroy, OnInit } from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  Validators,
  AbstractControl,
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
    }
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
  bankAccountTypes: { enumId: number; codeName: string }[] = [];
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
    private snackbarNotificationService: SnackbarNotificationService
  ) {}

  resetForm(): void {
    this.achForm.reset();
    this.ccForm.reset();
    this.addressForm.reset();
  }

  showAddNewPaymentForm(): void {
    if (this.savedPaymentMethods.length >= this.MAX_PAYMENT_METHODS) {
      this.snackbarNotificationService.showSnackbarError(
        'You have reached the maximum of 3 payment methods. Please delete an existing payment method to add a new one.'
      );
      return;
    }

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
                (m) => m.paymentProfileId !== method.paymentProfileId
              );
              this.snackbarNotificationService.showSnackbarSuccess(
                'Payment method successfully deleted.'
              );
            },
            error: (error) => {
              this.snackbarNotificationService.showSnackbarError(
                'Failed to delete payment method. Please try again.'
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
            'Default payment method updated successfully.'
          );
        },
        error: (error) => {
          console.error('Error setting default payment method:', error);
          this.snackbarNotificationService.showSnackbarError(
            'Failed to set default payment method. Please try again.'
          );
        },
      });
  }

  // editPaymentMethod(method: SavedPaymentMethod): void {
  //   this.isEditMode = true;
  //   this.editingPaymentId = method.paymentProfileId;
  //   this.showAddNewForm = true;
  //   this.selectedPaymentType = method.accountType;

  //   this.loadingService.show();
  //   this.paymentInfoService
  //     .getPaymentMethodDetails(this.organizationId, method.paymentProfileId)
  //     .pipe(takeUntil(this.destroy$))
  //     .subscribe({
  //       next: (details) => {
  //         const paymentDetails = details[0];

  //         if (method.accountType === 'CC') {
  //           this.ccForm.get('cardNumber')?.clearValidators();
  //           this.ccForm.get('cardNumber')?.updateValueAndValidity();

  //           this.ccForm.patchValue({
  //             cardNumber: `${method.lastFourNumbers}`,
  //             nameOnCard: `${paymentDetails.firstName} ${paymentDetails.lastName}`,
  //             expirationDate: paymentDetails.expirationDate,
  //           });

  //           this.addressForm.patchValue({
  //             streetAddress1: paymentDetails.billingAddress,
  //             city: paymentDetails.billingCity,
  //             state: paymentDetails.billingState,
  //             zip: paymentDetails.billingZip,
  //           });

  //           this.ccForm
  //             .get('nameOnCard')
  //             ?.setValidators([
  //               Validators.required,
  //               this.nameOnCardOrAccountValidator,
  //             ]);
  //           this.ccForm
  //             .get('expirationDate')
  //             ?.setValidators([Validators.required]);
  //           this.ccForm
  //             .get('cvv')
  //             ?.setValidators([
  //               Validators.required,
  //               this.cvvValidator.bind(this),
  //             ]);
  //         } else if (method.accountType === 'ACH') {
  //           this.achForm.get('bankRoutingNumber')?.clearValidators();
  //           this.achForm.get('confirmBankRoutingNumber')?.clearValidators();
  //           this.achForm.get('bankAccountNumber')?.clearValidators();
  //           this.achForm.get('confirmBankAccountNumber')?.clearValidators();

  //           this.achForm.patchValue({
  //             bankRoutingNumber: paymentDetails.bankRoutingNumber,
  //             confirmBankRoutingNumber: paymentDetails.bankRoutingNumber,
  //             bankAccountNumber: `${method.bankAccountMasked}`,
  //             confirmBankAccountNumber: `${method.bankAccountMasked}`,
  //             bankAccountType: paymentDetails.bankAccountType,
  //             nameOnAccount: `${paymentDetails.firstName} ${paymentDetails.lastName}`,
  //           });

  //           this.addressForm.patchValue({
  //             streetAddress1: paymentDetails.billingAddress,
  //             city: paymentDetails.billingCity,
  //             state: paymentDetails.billingState,
  //             zip: paymentDetails.billingZip,
  //           });

  //           this.achForm
  //             .get('nameOnAccount')
  //             ?.setValidators([
  //               Validators.required,
  //               this.nameOnCardOrAccountValidator,
  //             ]);

  //           Object.keys(this.achForm.controls).forEach((key) => {
  //             this.achForm.get(key)?.updateValueAndValidity();
  //           });
  //         }

  //         this.loadingService.hide();
  //       },
  //       error: (error) => {
  //         console.error('Error loading payment method details:', error);
  //         this.loadingService.hide();
  //         this.snackbarNotificationService.showSnackbarError(
  //           'Failed to load payment method details. Please try again.'
  //         );
  //       },
  //     });
  // }

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
          this.snackbarNotificationService.showSnackbarError(
            'Failed to load payment methods. Please refresh the page.'
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
          console.error('Error loading initial data:', error);
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

  private createAddressGroup(): FormGroup {
    return this.fb.group(
      {
        streetAddress1: ['', [Validators.required, Validators.maxLength(60)]],
        streetAddress2: ['', Validators.maxLength(60)],
        city: [
          '',
          [Validators.required, Validators.pattern(/^[a-zA-Z\s\-]{1,40}$/)],
        ],
        state: ['', Validators.required],
        zip: [
          '',
          [Validators.required, Validators.pattern(/^\d{5}(-\d{4})?$/)],
        ],
      },
      { updateOn: 'change' }
    );
  }

  private createAchGroup(): FormGroup {
    return this.fb.group(
      {
        bankRoutingNumber: [
          '',
          [Validators.required, Validators.pattern(/^\d{9}$/)],
        ],
        confirmBankRoutingNumber: [
          '',
          [Validators.required, Validators.pattern(/^\d{9}$/)],
        ],
        bankAccountNumber: [
          '',
          [Validators.required, Validators.pattern(/^\d{9,12}$/)],
        ],
        confirmBankAccountNumber: [
          '',
          [Validators.required, Validators.pattern(/^\d{9,12}$/)],
        ],
        bankAccountType: ['', Validators.required],
        nameOnAccount: [
          '',
          [Validators.required, this.nameOnCardOrAccountValidator],
        ],
      },
      { updateOn: 'change' }
    );
  }

  private createCreditCardGroup(): FormGroup {
    return this.fb.group(
      {
        cardNumber: [
          '',
          [
            Validators.required,
            Validators.pattern('^[0-9]{13,19}$'),
            this.luhnValidator.bind(this),
          ],
        ],
        nameOnCard: [
          '',
          [Validators.required, this.nameOnCardOrAccountValidator],
        ],
        expirationDate: ['', Validators.required],
        cvv: ['', [Validators.required, this.cvvValidator.bind(this)]],
      },
      { updateOn: 'change' }
    );
  }

  getBankAccountTypeName(enumId: number | undefined): string {
    if (enumId === undefined) return '';
    const accountType = this.bankAccountTypes.find(
      (type) => type.enumId === enumId
    );
    return accountType ? accountType.codeName : '';
  }

  submitACH() {
    if (this.achForm.invalid || this.addressForm.invalid) {
      this.achForm.markAllAsTouched();
      this.addressForm.markAllAsTouched();
      return;
    }

    const { firstName, lastName } = this.splitFullName(
      this.achForm.value.nameOnAccount
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
          paymentProfileRequest
        )
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => {
            this.afterSaveSuccess();
            this.snackbarNotificationService.showSnackbarSuccess(
              'ACH payment method updated successfully.'
            );
          },
          error: (err) => {
            console.error('ACH update failed', err);
            this.snackbarNotificationService.showSnackbarError(
              'Failed to update ACH payment method. Please try again.'
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
      this.ccForm.value.nameOnCard
    );

    const paymentProfileRequest = {
      CardNumber: this.ccForm.value.cardNumber,
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
          paymentProfileRequest
        )
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => {
            this.afterSaveSuccess();
            this.snackbarNotificationService.showSnackbarSuccess(
              'Credit card payment method updated successfully.'
            );
          },
          error: (err) => {
            console.error('CC update failed', err);
            this.snackbarNotificationService.showSnackbarError(
              'Failed to update credit card payment method. Please try again.'
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
          'ACH'
        ),
      CC: () =>
        this.paymentInfoService.saveCreditCardPaymentInfo(
          this.organizationId,
          customerProfileData,
          paymentData,
          'CC'
        ),
    };

    saveMethods[accountType]()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.loadSavedPaymentMethods(this.organizationId);
          this.resetForms();
          this.snackbarNotificationService.showSnackbarSuccess(
            `${accountType} payment method successfully added.`
          );
        },
        error: (err) => {
          console.error(`Error saving ${accountType} payment info`, err);
          this.snackbarNotificationService.showSnackbarError(
            `Failed to add ${accountType} payment method. Please try again.`
          );
          this.resetForms();
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

  detectCardType(cardNumber: string = ''): string | null {
    cardNumber = cardNumber.replace(/\D/g, '');
    if (/^4/.test(cardNumber)) return 'visa';
    if (/^5[1-5]/.test(cardNumber) || /^2[2-7]/.test(cardNumber))
      return 'mastercard';
    if (/^3[47]/.test(cardNumber)) return 'amex';
    if (/^6(?:011|5)/.test(cardNumber)) return 'discover';
    return null;
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

  private cvvValidator(control: AbstractControl) {
    const cvv = control.value;
    if (!cvv) return null;
    const cardType = this.detectCardType(
      this.ccForm?.get('cardNumber')?.value || ''
    );
    const pattern = cardType === 'amex' ? /^\d{4}$/ : /^\d{3}$/;
    return pattern.test(cvv) ? null : { invalidCvv: true };
  }

  private nameOnCardOrAccountValidator(control: AbstractControl) {
    if (!control.value) return null;
    const pattern = /^[A-Za-z\s'-]{2,50}$/;
    return pattern.test(control.value) ? null : { invalidName: true };
  }

  private luhnValidator(control: AbstractControl) {
    const cardNumber = control.value;
    if (!cardNumber) return null;

    const sanitized = cardNumber.replace(/\D/g, '');

    if (sanitized.length < 13) {
      return { invalidCard: true };
    }

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

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
