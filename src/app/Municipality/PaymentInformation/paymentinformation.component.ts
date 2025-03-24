import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, AbstractControl } from '@angular/forms';
import { MaterialModule } from '../shared/material.module';
import { MatDialog } from '@angular/material/dialog';
import { ReactiveFormsModule } from '@angular/forms';
import { PaymentInfoService } from './services/payment-info.service'
import { CustomerProfileData } from './model/CustomerProfileData';
import { MatIconModule } from '@angular/material/icon';
import { MatTabsModule } from '@angular/material/tabs';
import { MatTabChangeEvent } from '@angular/material/tabs';
import { Subject, takeUntil } from 'rxjs';
import { Router } from '@angular/router';

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
  private destroy$ = new Subject<void>();

  states = [
    { value: 'AL', viewValue: 'Alabama' },
    { value: 'AK', viewValue: 'Alaska' },
    { value: 'AZ', viewValue: 'Arizona' },
    { value: 'AR', viewValue: 'Arkansas' },
    { value: 'CA', viewValue: 'California' },
    { value: 'CO', viewValue: 'Colorado' },
    { value: 'CT', viewValue: 'Connecticut' },
    { value: 'DE', viewValue: 'Delaware' },
    { value: 'FL', viewValue: 'Florida' },
    { value: 'GA', viewValue: 'Georgia' },
    { value: 'HI', viewValue: 'Hawaii' },
    { value: 'ID', viewValue: 'Idaho' },
    { value: 'IL', viewValue: 'Illinois' },
    { value: 'IN', viewValue: 'Indiana' },
    { value: 'IA', viewValue: 'Iowa' },
    { value: 'KS', viewValue: 'Kansas' },
    { value: 'KY', viewValue: 'Kentucky' },
    { value: 'LA', viewValue: 'Louisiana' },
    { value: 'ME', viewValue: 'Maine' },
    { value: 'MD', viewValue: 'Maryland' },
    { value: 'MA', viewValue: 'Massachusetts' },
    { value: 'MI', viewValue: 'Michigan' },
    { value: 'MN', viewValue: 'Minnesota' },
    { value: 'MS', viewValue: 'Mississippi' },
    { value: 'MO', viewValue: 'Missouri' },
    { value: 'MT', viewValue: 'Montana' },
    { value: 'NE', viewValue: 'Nebraska' },
    { value: 'NV', viewValue: 'Nevada' },
    { value: 'NH', viewValue: 'New Hampshire' },
    { value: 'NJ', viewValue: 'New Jersey' },
    { value: 'NM', viewValue: 'New Mexico' },
    { value: 'NY', viewValue: 'New York' },
    { value: 'NC', viewValue: 'North Carolina' },
    { value: 'ND', viewValue: 'North Dakota' },
    { value: 'OH', viewValue: 'Ohio' },
    { value: 'OK', viewValue: 'Oklahoma' },
    { value: 'OR', viewValue: 'Oregon' },
    { value: 'PA', viewValue: 'Pennsylvania' },
    { value: 'RI', viewValue: 'Rhode Island' },
    { value: 'SC', viewValue: 'South Carolina' },
    { value: 'SD', viewValue: 'South Dakota' },
    { value: 'TN', viewValue: 'Tennessee' },
    { value: 'TX', viewValue: 'Texas' },
    { value: 'UT', viewValue: 'Utah' },
    { value: 'VT', viewValue: 'Vermont' },
    { value: 'VA', viewValue: 'Virginia' },
    { value: 'WA', viewValue: 'Washington' },
    { value: 'WV', viewValue: 'West Virginia' },
    { value: 'WI', viewValue: 'Wisconsin' },
    { value: 'WY', viewValue: 'Wyoming' }
  ];

  constructor(
    private fb: FormBuilder,
    public dialog: MatDialog,
    private paymentInfoService: PaymentInfoService,
    private router: Router
  ) { }

  ngOnInit(): void {
    this.paymentInformationForm = this.fb.group({
      paymentType: ['', Validators.required],
      address: this.createAddressGroup(),
      ACH: this.createAchGroup(),
      CC: this.createCreditCardGroup(),
      invoice: this.createInvoiceGroup(),
    });
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
    if (!this.selectedFormGroup.valid) {
      this.selectedFormGroup.markAllAsTouched();
      console.error(`Form in ${this.selectedPaymentType} tab is invalid.`);
      return;
    }

    let customerProfileData: CustomerProfileData = { Email: "testemail1111@gmail.com", UserId: 10, MerchantCustomerId: "10" };
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
        next: response => { console.log(`${this.selectedPaymentType} Payment Info Submitted and Saved`, response); this.router.navigate(['/dashboard-component']); },
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
    console.log("cardType", cardType)

    const cvvPattern = cardType === 'amex' ? /^\d{4}$/ : /^\d{3}$/;
    console.log("cvvPattern", cvvPattern)
    return cvvPattern.test(cvv) ? null : { invalidCvv: true };
  }

  nameOnCardValidator(control: AbstractControl): { [key: string]: boolean } | null {
    if (!control.value) return null;
    // Regex: Only letters, spaces, hyphens, and apostrophes (2-50 characters)
    const validNamePattern = /^[A-Za-z\s'-]{2,50}$/;

    return validNamePattern.test(control.value.trim()) ? null : { invalidName: true };
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}