import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';

import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';

@Component({
  selector: 'app-contact-information',
  templateUrl: './contact-information.component.html',
  //styleUrls: ['./contact-information.component.scss'],
  standalone: true,
  imports: [
    ReactiveFormsModule, 
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
  ],
})
export class ContactInformationComponent implements OnInit {
  contactForm!: FormGroup;
  counties: string[] = [
    'Atlantic County',
    'Bergen County',
    'Burlington County',
    'Camden County',
    'Cape May County',
    'Cumberland County',
    'Essex County',
    'Gloucester County',
    'Hudson County',
    'Hunterdon County',
    'Mercer County',
    'Middlesex County',
    'Monmouth County',
    'Morris County',
    'Ocean County',
    'Passaic County',
    'Salem County',
    'Somerset County',
    'Sussex County',
    'Union County',
    'Warren County',
  ];
  states: string[] = ['New Jersey', 'California', 'New York', 'Florida'];
  times: string[] = [
    'Morning (9:00 AM - 12:00 PM)',
    'Afternoon (12:00 PM - 3:00 PM)',
    'Evening (3:00 PM - 6:00 PM)',
  ];

  constructor(private fb: FormBuilder) {}

  ngOnInit(): void {
    this.contactForm = this.fb.group({
      firstName: ['', Validators.required],
      lastName: ['', Validators.required],
      title: [''],
      county: ['', Validators.required],
      streetAddress: [''],
      city: [''],
      state: [''],
      zipCode: [''],
      email: ['', [Validators.required, Validators.email]],
      confirmEmail: ['', [Validators.required, Validators.email]],
      phone: ['', Validators.required],
      bestTimeToCall: [''],
    });
  }

  onSubmit(): void {
    if (this.contactForm.valid) {
      console.log('Contact Information Submitted:', this.contactForm.value);
    }
  }
}
