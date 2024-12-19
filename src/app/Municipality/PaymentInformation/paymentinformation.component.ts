import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';

import { ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card'; 
  
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select'; 
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatRadioModule } from '@angular/material/radio';

import { MatNativeDateModule } from '@angular/material/core'; 
import { MatDatepickerModule } from '@angular/material/datepicker';


@Component({
  selector: 'app-payment-info',
  templateUrl: './paymentinformation.component.html',
  styleUrls: ['./paymentinformation.component.css'],
  standalone: true,
  imports: [ ReactiveFormsModule, MatButtonModule, MatCardModule, MatFormFieldModule, MatInputModule, MatSelectModule, MatToolbarModule, MatRadioModule, MatNativeDateModule, MatDatepickerModule  ]
})
export class PaymentInfoComponent {
  paymentInformationForm: FormGroup;
  accountTypes = ['Checking', 'Savings'];

  constructor(private fb: FormBuilder) {
    this.paymentInformationForm = this.fb.group({
      paymentType: ['ACH', Validators.required],
      ach: this.fb.group({
        routingNumber: ['', [Validators.required, Validators.pattern(/^\d{9}$/)]],
        confirmRoutingNumber: ['', Validators.required],
        accountNumber: ['', Validators.required],
        confirmAccountNumber: ['', Validators.required],
        accountType: ['', Validators.required],
        streetAddress1: ['', Validators.required],
        streetAddress2: [''],
        city: ['', Validators.required],
        state: ['', Validators.required],
        zip: ['', [Validators.required, Validators.pattern(/^\d{5}$/)]]
      }),
      creditCard: this.fb.group({
        cardNumber: ['', [Validators.required, Validators.pattern(/^\d{15,16}$/)]],
        nameOnCard: ['', Validators.required],
        expirationDate: ['', Validators.required],
        cvv: ['', [Validators.required, Validators.pattern(/^\d{3,4}$/)]],
        streetAddress1: ['', Validators.required],
        streetAddress2: [''],
        city: ['', Validators.required],
        state: ['', Validators.required],
        zip: ['', [Validators.required, Validators.pattern(/^\d{5}$/)]]
      }),
      invoice: this.fb.group({
        municipalityName: ['', Validators.required],
        billingContact: ['', Validators.required],
        desiredDateOfInvoice: ['', Validators.required],
        streetAddress1: ['', Validators.required],
        streetAddress2: [''],
        city: ['', Validators.required],
        state: ['', Validators.required],
        zip: ['', [Validators.required, Validators.pattern(/^\d{5}$/)]]
      })
    });

    this.paymentInformationForm.get('creditCard.cardNumber')?.valueChanges.subscribe(value => {
      if (value.startsWith('3')) {
        this.paymentInformationForm.get('creditCard.cvv')?.setValidators([Validators.required, Validators.pattern(/^\d{4}$/)]);
      } else {
        this.paymentInformationForm.get('creditCard.cvv')?.setValidators([Validators.required, Validators.pattern(/^\d{3}$/)]);
      }
      this.paymentInformationForm.get('creditCard.cvv')?.updateValueAndValidity();
    });
  }

  onSubmit() {
    if (this.paymentInformationForm.valid) {
      console.log(this.paymentInformationForm.value);
    }
  }
}
