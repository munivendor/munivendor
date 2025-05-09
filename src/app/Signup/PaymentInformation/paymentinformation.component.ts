import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, AbstractControl } from '@angular/forms';
import { MaterialModule } from '../../Municipality/shared/material.module';
import { MatDialog } from '@angular/material/dialog';
import { ReactiveFormsModule } from '@angular/forms';
import { PaymentInfoService } from './services/payment-info.service'
import { CustomerProfileData } from './model/CustomerProfileData';
import { MatIconModule } from '@angular/material/icon';
import { MatTabsModule } from '@angular/material/tabs';
import { MatTabChangeEvent } from '@angular/material/tabs';
import { Subject, takeUntil } from 'rxjs';
import { Router } from '@angular/router';
import { State } from '../../shared/model/state.model';
import { MunicipalityService } from '../../Municipality/Details/services/municipality.service';
import { UserService } from '../../shared/service/user.service';
import { AuthService } from '../../authorization/auth.service';
import { User } from '../../shared/model/user.model';
import { ConfirmationDialogComponent } from './confirmation-dialog.component';

@Component({
  selector: 'app-payment-form',
  templateUrl: './paymentinformation.component.html',
  styleUrls: ['./paymentinformation.component.css'],
  standalone: true,
  imports: [MaterialModule, ReactiveFormsModule, MatIconModule, MatTabsModule],
  providers: [PaymentInfoService]
})

export class PaymentInfoComponent implements OnInit, OnDestroy {
  paymentInformationForm!: FormGroup;
  accountTypes = ['Checking', 'Savings'];
  selectedPaymentType: string = 'ACH';
  cardType: string | null = null;
  organizationTypeId: number | undefined;
  user: User | undefined;
  private destroy$ = new Subject<void>();

  states: State[] = [];

  constructor(
    private fb: FormBuilder,
    public dialog: MatDialog,
    private paymentInfoService: PaymentInfoService,
    private router: Router,
    private municipalityService: MunicipalityService,
    private userService: UserService,
    private authService: AuthService
  ) { }

  ngOnInit(): void {
    this.paymentInformationForm = this.fb.group({
      paymentType: ['', Validators.required],
      address: this.createAddressGroup(),
      ACH: this.createAchGroup(),
      CC: this.createCreditCardGroup(),
      invoice: this.createInvoiceGroup(),
    });

    this.municipalityService.getStates()
      .pipe(takeUntil(this.destroy$))
      .subscribe(states => {
        this.states = states;
      });

    this.authService.user$.pipe(
      takeUntil(this.destroy$)
    ).subscribe(user => {
      if (user) {
        const userId = user
        if (userId) {

          this.getUserDetails(userId);
        } else {
          console.error('No user ID available in authentication state');
        }
      }
    });
  }

  getUserDetails(userId: number): void {
    this.userService.getUser(userId).subscribe(
      (user: User) => {
        this.organizationTypeId = user.organizationTypeId;
        this.user = user;
      },
      (error) => {
        console.error('Error fetching user data:', error);
      }
    );
  }

  private createAddressGroup(): FormGroup {
    return this.fb.group({
      streetAddress1: ['', [Validators.required, Validators.maxLength(60)]],
      streetAddress2: ['', Validators.maxLength(60)],
      city: ['', [Validators.required, Validators.pattern(/^[a-zA-Z\s\-]{1,40}$/)]],
      state: ['', [Validators.required]],
      zip: ['', [Validators.required, Validators.pattern(/^\d{5}(-\d{4})?$/)]]
    }, { updateOn: 'blur' });
  }

  private createAchGroup(): FormGroup {
    return this.fb.group({
      routingNumber: ['', [Validators.required, Validators.pattern(/^\d{9}$/)]],
      confirmRoutingNumber: ['', [Validators.required, Validators.pattern(/^\d{9}$/)]],
      accountNumber: ['', [Validators.required, Validators.pattern(/^\d{6,17}$/)]],
      confirmAccountNumber: ['', [Validators.required, Validators.pattern(/^\d{6,17}$/)]],
      accountType: ['', Validators.required]
    });
  }

  private createCreditCardGroup(): FormGroup {
    return this.fb.group({
      cardNumber: ['', [Validators.required, Validators.pattern('^[0-9]{13,19}$')]],
      nameOnCard: ['', [Validators.required, this.nameOnCardValidator]],
      expirationDate: ['', Validators.required],
      cvv: ['', [Validators.required,
      this.cvvValidator.bind(this)
      ]]
    });
  }

  private createInvoiceGroup(): FormGroup {
    return this.fb.group({
      municipalityName: ['', Validators.required],
      billingContact: ['', Validators.required],
      desiredDateOfInvoice: ['', Validators.required]
    }, { updateOn: 'blur' });
  }

  get selectedFormGroup(): FormGroup {
    return this.paymentInformationForm.get(this.selectedPaymentType) as FormGroup;
  }

  onTabChange(event: MatTabChangeEvent): void {
    this.clearAddressErrors();
    const paymentTypes = ['ACH', 'CC', 'invoice'];
    this.selectedPaymentType = paymentTypes[event.index] || 'ACH';
  }

  clearAddressErrors() {
    const addressGroup = this.paymentInformationForm.get('address');
    if (addressGroup) {
      addressGroup.reset(addressGroup.value);
      addressGroup.markAsPristine();
      addressGroup.markAsUntouched();
    }
  }

  onSubmit(): void {
    // testing confirmation dialog without needing to trigger payment APIs
    if (this.organizationTypeId === 2) {
      this.dialog.open(ConfirmationDialogComponent, {
        width: '400px',
        data: {
          title: 'Payment Information',
          message: 'Your payment information has been submitted successfully. Please wait for the administrator to approve your request.'
        }
      });
    }
   
    if (!this.selectedFormGroup.valid) {
      this.selectedFormGroup.markAllAsTouched();
      console.error(`Form in ${this.selectedPaymentType} tab is invalid.`);
      return;
    }
  
    let customerProfileData: CustomerProfileData = { Email: this.user?.workEmail || '', UserId: this.user?.userId ?? 0, MerchantCustomerId: (this.user?.userId ?? 0).toString() };
    let municipalityId = 1;
    let paymentData = { ...this.selectedFormGroup.value };

    if (this.selectedPaymentType === 'CC') {
      const { firstName, lastName } = this.splitFullName(paymentData.nameOnCard);
      paymentData = { ...paymentData, firstName, lastName };
      delete paymentData.nameOnCard;
    }

    this.savePaymentInfo(municipalityId, customerProfileData, paymentData, this.selectedPaymentType);
  }

  private savePaymentInfo(municipalityId: number, customerProfileData: CustomerProfileData, paymentData: any, selectedPaymentType: string) {
    const saveMethods = {
      ACH: () => this.paymentInfoService.saveACHPaymentInfo(municipalityId, customerProfileData, paymentData, selectedPaymentType),
      CC: () => this.paymentInfoService.saveCreditCardPaymentInfo(municipalityId, customerProfileData, paymentData, selectedPaymentType),
      invoice: () => this.paymentInfoService.saveInvoicePaymentInfo(paymentData)
    };

    saveMethods[this.selectedPaymentType as keyof typeof saveMethods]?.()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: response => {
          // TODO: check organizationTypeId and if offeror, pass in user's selected payment plan
          if (this.organizationTypeId === 1) {
            console.log(`${this.selectedPaymentType} Payment Info Submitted and Saved`, response);
            this.router.navigate(['/dashboard-component']);
          } else {
            console.log(`${this.selectedPaymentType} Payment Info Submitted and Saved`, response);
            this.dialog.open(ConfirmationDialogComponent, {
              width: '400px',
              data: {
                title: 'Payment Information',
                message: 'Your payment information has been submitted successfully. Please wait for the administrator to approve your request.'
              }
            });
          }
        },
        error: error => { console.error(`Error saving ${this.selectedPaymentType} payment data`, error); this.router.navigate(['/dashboard-component']); }
      });
  }

  private splitFullName(fullName: string): { firstName: string; lastName: string } {
    const nameParts = fullName.trim().split(' ');
    return { firstName: nameParts[0], lastName: nameParts.slice(1).join(' ') || '' };
  }

  detectCardType(cardNumber: string = ''): string | null {
    cardNumber = cardNumber.replace(/\D/g, '');

    if (/^4/.test(cardNumber)) return 'visa';
    if (/^5[1-5]/.test(cardNumber) || /^2[2-7]/.test(cardNumber)) return 'mastercard';
    if (/^3[47]/.test(cardNumber)) return 'amex';
    if (/^6(?:011|5)/.test(cardNumber)) return 'discover';
    return null;
  }

  private cvvValidator(control: AbstractControl): { [key: string]: boolean } | null {
    const cvv = control.value;
    if (!cvv) return null;

    const cardNumber = this.paymentInformationForm?.get('CC.cardNumber')?.value || '';
    const cardType = this.detectCardType(cardNumber); // No more type error

    const cvvPattern = cardType === 'amex' ? /^\d{4}$/ : /^\d{3}$/;
    return cvvPattern.test(cvv) ? null : { invalidCvv: true };
  }

  nameOnCardValidator(control: AbstractControl): { [key: string]: boolean } | null {
    if (!control.value) return null;
    const validNamePattern = /^[A-Za-z\s'-]{2,50}$/;
    return validNamePattern.test(control.value.trim()) ? null : { invalidName: true };
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}