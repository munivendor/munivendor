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
import { Subject, takeUntil } from 'rxjs';
import { RouterModule } from '@angular/router';
import { State } from '../../shared/model/state.model';
import { OrganizationService } from '../../Organization/Details/services/organization.service';
import { UserService } from '../../shared/service/user.service';
import { AuthService } from '../../authorization/auth.service';
import { User } from '../../shared/model/user.model';
import { ConfirmationDialogComponent } from './confirmation-dialog.component';
import { CommonModule } from '@angular/common';
import { LoadingService } from '../../shared/LoadingSpinner/loading.service';
import { StateService } from '../../Request/services/state.service';
import { ChangeDetectorRef } from '@angular/core';
import { MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';

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

export interface StoredPaymentMethod {
  id: string;
  type: 'ACH' | 'CC';
  lastFour: string;
  cardType?: string;
  accountType?: string;
  isDefault: boolean;
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
  invoiceForm!: FormGroup;
  addressForm!: FormGroup;

  accountTypes = ['Checking', 'Savings'];
  selectedPaymentType: 'ACH' | 'CC' | 'invoice' = 'ACH';
  organizationTypeId?: number;
  user?: User;

  storedPaymentMethods: StoredPaymentMethod[] = [];
  isEditMode = false;
  editingPaymentId: string | null = null;
  showAddNewForm = false;

  isLoading = true;
  isLoadingPaymentMethods = true;

  private destroy$ = new Subject<void>();
  organizationId!: number;
  userId!: number;
  states: State[] = [];

  constructor(
    private fb: FormBuilder,
    private dialog: MatDialog,
    private paymentInfoService: PaymentInfoService,
    private organizationService: OrganizationService,
    private userService: UserService,
    private authService: AuthService,
    private loadingService: LoadingService,
    private stateService: StateService,
    private cdr: ChangeDetectorRef
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

    // Recreate all forms to restore original validators and reset state
    this.achForm = this.createAchGroup();
    this.ccForm = this.createCreditCardGroup();
    this.addressForm = this.createAddressGroup();

    // Reset visibility flags
    this.achFormVisible = true;
    this.ccFormVisible = true;

    // Reset to default tab
    this.selectedPaymentType = 'ACH';
  }

  deletePaymentMethod(method: StoredPaymentMethod): void {
    const dialogRef = this.dialog.open(YourDialog, {
      width: '400px',
      data: {
        title: 'Delete Payment Method',
        message: `Are you sure you want to delete this ${
          method.type === 'CC' ? 'credit card' : 'bank account'
        } ending in ${method.lastFour}?`,
        confirmText: 'Delete',
        cancelText: 'Cancel',
      },
    });

    dialogRef.afterClosed().subscribe((confirmed) => {
      console.log('Dialog closed with result:', confirmed);
      if (confirmed) {
        this.paymentInfoService
          .deletePaymentMethod(method.id)
          .pipe(takeUntil(this.destroy$))
          .subscribe({
            next: () => {
              this.storedPaymentMethods = this.storedPaymentMethods.filter(
                (m) => m.id !== method.id
              );
              console.log('Payment method deleted successfully');
            },
            error: (error) => {
              console.log('Error deleting payment method:', error);
            },
          });
      }
    });
  }

  achFormVisible = true;
  ccFormVisible = true;

  onTabChange(event: MatTabChangeEvent) {
    const paymentTypes = ['ACH', 'CC', 'invoice'];
    this.selectedPaymentType =
      (paymentTypes[event.index] as 'ACH' | 'CC' | 'invoice') || 'ACH';

    // Force recreation of the form that's being hidden
    if (this.selectedPaymentType === 'ACH') {
      this.recreateForm('cc');
    } else if (this.selectedPaymentType === 'CC') {
      this.recreateForm('ach');
    }

    // Always clear address form errors
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

  setDefaultPaymentMethod(method: StoredPaymentMethod): void {
    this.paymentInfoService
      .setDefaultPaymentMethod(method.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.storedPaymentMethods.forEach((m) => {
            m.isDefault = m.id === method.id;
          });
          console.log('Default payment method updated');
        },
        error: (error) => {
          console.error('Error setting default payment method:', error);
        },
      });
  }

  editPaymentMethod(method: StoredPaymentMethod): void {
    this.isEditMode = true;
    this.editingPaymentId = method.id;
    this.showAddNewForm = true;
    this.selectedPaymentType = method.type;

    this.loadingService.show();
    this.paymentInfoService
      .getPaymentMethodDetails(method.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (details) => {
          if (method.type === 'CC') {
            this.ccForm.get('cardNumber')?.clearValidators();
            this.ccForm.get('cardNumber')?.updateValueAndValidity();

            this.ccForm.patchValue({
              cardNumber: `****${method.lastFour}`,
              nameOnCard: details.nameOnCard,
              expirationDate: details.expirationDate,
              cvv: '',
            });

            this.ccForm
              .get('nameOnCard')
              ?.setValidators([Validators.required, this.nameOnCardValidator]);
            this.ccForm
              .get('expirationDate')
              ?.setValidators([Validators.required]);
            this.ccForm
              .get('cvv')
              ?.setValidators([
                Validators.required,
                this.cvvValidator.bind(this),
              ]);
          } else if (method.type === 'ACH') {
            this.achForm.get('routingNumber')?.clearValidators();
            this.achForm.get('confirmRoutingNumber')?.clearValidators();
            this.achForm.get('accountNumber')?.clearValidators();
            this.achForm.get('confirmAccountNumber')?.clearValidators();

            this.achForm.patchValue({
              routingNumber: details.maskedRoutingNumber,
              confirmRoutingNumber: details.maskedRoutingNumber,
              accountNumber: `****${method.lastFour}`,
              confirmAccountNumber: `****${method.lastFour}`,
              accountType: method.accountType,
            });

            Object.keys(this.achForm.controls).forEach((key) => {
              this.achForm.get(key)?.updateValueAndValidity();
            });
          }

          if (details.address) {
            this.addressForm.patchValue(details.address);
          }

          this.loadingService.hide();
        },
        error: (error) => {
          console.error('Error loading payment method details:', error);
          this.loadingService.hide();
        },
      });
  }

  loadStoredPaymentMethods(organizationId: number): void {
    this.isLoadingPaymentMethods = true;
    this.loadingService.show();

    this.paymentInfoService
      .getStoredPaymentMethods(organizationId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (methods) => {
          this.storedPaymentMethods = methods;
          this.isLoadingPaymentMethods = false;
          this.loadingService.hide();
        },
        error: (error) => {
          console.error('Error loading stored payment methods:', error);
          this.isLoadingPaymentMethods = false;
          this.loadingService.hide();
        },
      });
  }

  ngOnInit(): void {
    this.addressForm = this.createAddressGroup();
    this.achForm = this.createAchGroup();
    this.ccForm = this.createCreditCardGroup();
    // this.invoiceForm = this.createInvoiceGroup();

    this.organizationService
      .getStates()
      .pipe(takeUntil(this.destroy$))
      .subscribe((states) => {
        this.states = states;
      });

    this.organizationId = this.stateService.getOrganizationId() ?? 0;

    this.authService.user$.pipe(takeUntil(this.destroy$)).subscribe((user) => {
      if (user) {
        // this.user = user;
        // this.userId = user.userId;
        this.loadStoredPaymentMethods(this.organizationId);
        this.isLoading = false;
      }
    });
  }

  /** Forms **/
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
        routingNumber: [
          '',
          [Validators.required, Validators.pattern(/^\d{9}$/)],
        ],
        confirmRoutingNumber: [
          '',
          [Validators.required, Validators.pattern(/^\d{9}$/)],
        ],
        accountNumber: [
          '',
          [Validators.required, Validators.pattern(/^\d{6,17}$/)],
        ],
        confirmAccountNumber: [
          '',
          [Validators.required, Validators.pattern(/^\d{6,17}$/)],
        ],
        accountType: ['', Validators.required],
      },
      { updateOn: 'change' }
    );
  }

  private createCreditCardGroup(): FormGroup {
    return this.fb.group(
      {
        cardNumber: [
          '',
          [Validators.required, Validators.pattern('^[0-9]{13,19}$')],
        ],
        nameOnCard: ['', [Validators.required, this.nameOnCardValidator]],
        expirationDate: ['', Validators.required],
        cvv: ['', [Validators.required, this.cvvValidator.bind(this)]],
      },
      { updateOn: 'change' }
    );
  }

  /** Submit logic per form **/
  submitACH() {
    if (this.achForm.invalid || this.addressForm.invalid) {
      this.achForm.markAllAsTouched();
      this.addressForm.markAllAsTouched();
      return;
    }

    const paymentData = {
      ...this.achForm.value,
      address: this.addressForm.value,
    };
    this.savePaymentInfo('ACH', paymentData);
  }

  submitCC() {
    if (this.ccForm.invalid || this.addressForm.invalid) {
      this.ccForm.markAllAsTouched();
      this.addressForm.markAllAsTouched();
      return;
    }

    let paymentData = { ...this.ccForm.value, address: this.addressForm.value };
    const { firstName, lastName } = this.splitFullName(paymentData.nameOnCard);
    paymentData = { ...paymentData, firstName, lastName };
    delete paymentData.nameOnCard;

    this.savePaymentInfo('CC', paymentData);
  }

  private savePaymentInfo(type: 'ACH' | 'CC' | 'invoice', paymentData: any) {
    const customerProfileData: CustomerProfileData = {
      Email: this.user?.workEmail ?? '',
      UserId: this.user?.userId ?? 0,
      MerchantCustomerId: (this.user?.userId ?? 0).toString(),
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
      invoice: () =>
        this.paymentInfoService.saveInvoicePaymentInfo(paymentData),
    };

    saveMethods[type]()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.loadStoredPaymentMethods(this.organizationId);
          this.resetForms();
        },
        error: (err) => console.error(`Error saving ${type} payment info`, err),
      });
  }

  private resetForms() {
    this.achForm.reset();
    this.ccForm.reset();
    this.invoiceForm.reset();
    this.addressForm.reset();
  }

  /** Utilities **/
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

  private cvvValidator(control: AbstractControl) {
    const cvv = control.value;
    if (!cvv) return null;
    const cardType = this.detectCardType(
      this.ccForm?.get('cardNumber')?.value || ''
    );
    const pattern = cardType === 'amex' ? /^\d{4}$/ : /^\d{3}$/;
    return pattern.test(cvv) ? null : { invalidCvv: true };
  }

  private nameOnCardValidator(control: AbstractControl) {
    if (!control.value) return null;
    const pattern = /^[A-Za-z\s'-]{2,50}$/;
    return pattern.test(control.value) ? null : { invalidName: true };
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
