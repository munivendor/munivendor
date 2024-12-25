import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, AbstractControl } from '@angular/forms';
import { ConfirmationDialogComponent } from './confirmation-dialog.component';
import { MaterialModule } from '../shared/material.module';
import { MatDialog } from '@angular/material/dialog';
import { ReactiveFormsModule } from '@angular/forms';
import { ChangeDetectorRef } from '@angular/core';
import { PaymentInfoService } from './services/payment-info.service'
import { CustomerProfileData } from './model/CustomerProfileData';
import { Municipality } from '../Details/model/municipality.model';


@Component({
  selector: 'app-payment-form',
  templateUrl: './paymentinformation.component.html',
  styleUrls: ['./paymentinformation.component.css'],
  standalone: true,
  imports: [MaterialModule, ReactiveFormsModule],
  providers: [PaymentInfoService]
})
export class PaymentInfoComponent implements OnInit {
  paymentInformationForm!: FormGroup;
  accountTypes = ['Checking', 'Savings'];
  previousPaymentType!: string;

  constructor(private fb: FormBuilder, public dialog: MatDialog, private cdr: ChangeDetectorRef, private paymentInfoService: PaymentInfoService) { }
  ngOnInit(): void {
    this.paymentInformationForm = this.fb.group({
      paymentType: ['ach', Validators.required],
      ach: this.fb.group({
        routingNumber: ['', Validators.required],
        confirmRoutingNumber: ['', Validators.required],
        accountNumber: ['', Validators.required],
        confirmAccountNumber: ['', Validators.required],
        accountType: ['', Validators.required],
        streetAddress1: ['', Validators.required],
        streetAddress2: [''],
        city: ['', Validators.required],
        state: ['', Validators.required],
        zip: ['', [Validators.required, Validators.pattern('^[0-9]{5}(?:-[0-9]{4})?$')]]
      }),
      creditCard: this.fb.group({
        cardNumber: ['', [Validators.required, Validators.pattern('^[0-9]{13,19}$')]],
        nameOnCard: ['', Validators.required],
        expirationDate: ['', Validators.required],
        cvv: ['', [Validators.required, this.cvvValidator.bind(this)]],
        streetAddress1: ['', Validators.required],
        streetAddress2: [''],
        city: ['', Validators.required],
        state: ['', Validators.required],
        zip: ['', [Validators.required, Validators.pattern('^[0-9]{5}(?:-[0-9]{4})?$')]]
      }),
      invoice: this.fb.group({
        municipalityName: ['', Validators.required],
        billingContact: ['', Validators.required],
        desiredDateOfInvoice: ['', Validators.required],
        streetAddress1: ['', Validators.required],
        streetAddress2: [''],
        city: ['', Validators.required],
        state: ['', Validators.required],
        zip: ['', [Validators.required, Validators.pattern('^[0-9]{5}(?:-[0-9]{4})?$')]]
      })
    });


    // Initialize previousPaymentType
    this.previousPaymentType = this.paymentInformationForm!.get('paymentType')!.value;
  }

  get achGroup(): FormGroup {
    return this.paymentInformationForm.get('ach') as FormGroup;
  }

  get creditCardGroup(): FormGroup {
    return this.paymentInformationForm.get('creditCard') as FormGroup;
  }

  get invoiceGroup(): FormGroup {
    return this.paymentInformationForm.get('invoice') as FormGroup;
  }


  onPaymentTypeChange(): void {
    const selectedPaymentType = this.paymentInformationForm.get('paymentType')!.value;
  
    // Get the current form group based on the previous payment type
    const currentFormGroup = this.paymentInformationForm.get(this.previousPaymentType) as FormGroup;
  
    let hasFilledFields = false;
    for (const field in currentFormGroup.controls) {
      const control = currentFormGroup.get(field);
      if (control && control.value && control.value.trim() !== '') {
        hasFilledFields = true;
        break;  // Exit loop as soon as we find a filled field
      }
    }
  
    // Only show the confirmation dialog if there are any filled fields
    if (hasFilledFields) {
      // Temporarily set the payment type back to the previous value to prevent immediate switch
      this.paymentInformationForm.get('paymentType')!.setValue(this.previousPaymentType);
  
      const dialogRef = this.dialog.open(ConfirmationDialogComponent);
  
      dialogRef.afterClosed().subscribe(result => {
        if (result) {
          // User confirmed the change, update the payment type and reset form fields
          this.paymentInformationForm.get('paymentType')!.setValue(selectedPaymentType);
          this.previousPaymentType = selectedPaymentType;
          this.cdr.detectChanges();
        } else {
          // User cancelled, revert to the previous payment type
          this.paymentInformationForm.get('paymentType')!.setValue(this.previousPaymentType);
          this.cdr.detectChanges();
        }
      });
    } else {
      // If no fields are filled or the form is not dirty, simply switch to the new payment type
      this.paymentInformationForm.get('paymentType')!.setValue(selectedPaymentType);
      this.previousPaymentType = selectedPaymentType;
      this.cdr.detectChanges();
    }
  }
  



  cvvValidator(control: AbstractControl): { [key: string]: boolean } | null {
    const cardNumberControl = control.root.get('creditCard.cardNumber');
    if (!cardNumberControl) {
      return null;
    }
    const cardNumber = cardNumberControl.value;
    const cvv = control.value;
    if (cardNumber) {
      if (cardNumber.startsWith('3') && cvv.length !== 4) {
        return { 'invalidCVV': true };
      } else if ((cardNumber.startsWith('4') || cardNumber.startsWith('5') || cardNumber.startsWith('6')) && cvv.length !== 3) {
        return { 'invalidCVV': true };
      }
    }
    return null;
  }


  loadPaymentInfo(paymentType: string): void {
    switch (paymentType) {
      case 'ACH': this.paymentInfoService.getACHPaymentInfo().subscribe(data => { this.paymentInformationForm.get('ach')!.patchValue(data); });
        break;
      case 'CreditCard': this.paymentInfoService.getCreditCardPaymentInfo().subscribe(data => { this.paymentInformationForm.get('creditCard')!.patchValue(data); });
        break;
      case 'Invoice': this.paymentInfoService.getInvoicePaymentInfo().subscribe(data => { this.paymentInformationForm.get('invoice')!.patchValue(data); });
        break;
      default:
        console.error('Invalid payment type selected');
    }
  }
  onSubmit(): void {
    const selectedPaymentType = this.paymentInformationForm.get('paymentType')!.value;
    const selectedFormGroup = this.paymentInformationForm.get(selectedPaymentType) as FormGroup;

    // Validate only the selected tab's form group
    if (selectedFormGroup && selectedFormGroup.valid) {
      const paymentData = selectedFormGroup.value;

      switch (selectedPaymentType) {
        case 'ACH':
          this.paymentInfoService.saveACHPaymentInfo(paymentData).subscribe(
            response => {
              console.log('ACH Payment Info Submitted and Saved', response);
            },
            error => {
              console.error('Error saving ACH payment data', error);
            }
          );
          break;

        case 'CreditCard':
          let customerProfileData: CustomerProfileData = {
            Email: "testemail@gmail.com",
            Description: "test profile",
            MerchantCustomerId: "testprofileid"
          };
          let municipalityId: number = 1;

          this.paymentInfoService.saveCreditCardPaymentInfo(municipalityId, customerProfileData, paymentData).subscribe(
            response => {
              console.log('Credit Card Payment Info Submitted and Saved', response);
            },
            error => {
              console.error('Error saving Credit Card payment data', error);
            }
          );
          break;

        case 'Invoice':
          this.paymentInfoService.saveInvoicePaymentInfo(paymentData).subscribe(
            response => {
              console.log('Invoice Payment Info Submitted and Saved', response);
            },
            error => {
              console.error('Error saving Invoice payment data', error);
            }
          );
          break;

        default:
          console.error('Invalid payment type selected');
      }
    } else {
      // Mark the selected form group as touched to display validation errors
      selectedFormGroup?.markAllAsTouched();
      console.error(`Form in ${selectedPaymentType} tab is invalid.`);
    }
  }
}
