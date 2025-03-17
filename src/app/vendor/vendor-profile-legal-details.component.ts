import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';

@Component({
  selector: 'app-legal-details',
  templateUrl: './legal-details.component.html',
  styleUrls: ['./legal-details.component.scss']
})
export class LegalDetailsComponent implements OnInit {
  legalDetailsForm!: FormGroup;
  yesNoOptions = [
    { value: 'yes', label: 'Yes' },
    { value: 'no', label: 'No' }
  ];

  constructor(private fb: FormBuilder) {}

  ngOnInit(): void {
    this.legalDetailsForm = this.fb.group({
      contractFailure: ['', Validators.required],
      liensLawsuits: ['', Validators.required],
      contractFailureDetails: [''],
      lienLawsuitDetails: ['']
    });

    // Auto-save on value changes
    this.legalDetailsForm.valueChanges.subscribe((formValue) => {
      console.log('Auto-saving form data:', formValue);
      // Call your service here to auto-save
    });
  }
}
