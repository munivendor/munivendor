import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';

@Component({
  selector: 'app-required-compliance-forms',
  templateUrl: './required-compliance-forms.component.html',
  styleUrls: ['./required-compliance-forms.component.scss'],
})
export class RequiredComplianceFormsComponent implements OnInit {
  complianceForm!: FormGroup;
  complianceFormTypes: string[] = [
    'Letter of Federal Affirmative Action Plan Approval',
    'Certificate of Employee Information Report',
    'Employee Information Report Form AA-302',
  ];
  fileErrors: { [key: string]: string } = {};

  constructor(private fb: FormBuilder) {}

  ngOnInit(): void {
    this.complianceForm = this.fb.group({
      complianceFormType: ['', Validators.required],
    });
  }

  onFileUpload(event: any, field: string): void {
    const file = event.target.files[0];
    if (file && file.size > 52428800) {
      // Validate file size (50 MB max)
      this.fileErrors[field] = 'File size exceeds 50 MB.';
    } else if (!['application/pdf', 'image/jpeg', 'image/png'].includes(file?.type)) {
      // Validate file type
      this.fileErrors[field] = 'Accepted file types are PDF, JPG, and PNG.';
    } else {
      this.fileErrors[field] = ''; // Clear error if file is valid
    }
  }

  onSubmit(): void {
    if (this.complianceForm.valid) {
      console.log('Form Submitted:', this.complianceForm.value);
    }
  }
}
