import { Component, OnInit } from '@angular/core';
import { FormArray, FormBuilder, FormGroup, Validators } from '@angular/forms';

@Component({
  selector: 'app-stockholder-information',
  templateUrl: './stockholder-information.component.html',
  styleUrls: ['./stockholder-information.component.scss'],
})
export class StockholderInformationComponent implements OnInit {
  stockholderForm!: FormGroup;
  yesNoOptions = [
    { value: 'yes', label: 'Yes' },
    { value: 'no', label: 'No' },
  ];

  constructor(private fb: FormBuilder) {}

  ngOnInit(): void {
    this.stockholderForm = this.fb.group({
      hasStockholders: ['', Validators.required],
      stockholders: this.fb.array([]),
    });
  }

  get stockholders(): FormArray {
    return this.stockholderForm.get('stockholders') as FormArray;
  }

  addStockholder(): void {
    const stockholderGroup = this.fb.group({
      type: ['', Validators.required],
      firstName: [''],
      lastName: [''],
      organizationName: [''],
      isPubliclyTraded: [''],
      address: [''],
    });

    this.stockholders.push(stockholderGroup);
  }

  removeStockholder(index: number): void {
    this.stockholders.removeAt(index);
  }

  onSubmit(): void {
    if (this.stockholderForm.valid) {
      console.log('Form Submitted', this.stockholderForm.value);
    }
  }
}
