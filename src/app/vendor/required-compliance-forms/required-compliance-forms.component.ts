import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatDividerModule } from '@angular/material/divider';
import { ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { VendorProfileService } from '../service/vendor-profile.service';

export interface ComplianceFormType {
  documentId?: number;
  documentName?: string;
}

@Component({
  selector: 'app-compliance-forms',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatSelectModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatDividerModule
  ],
  templateUrl: './required-compliance-forms.component.html',
  styleUrls: ['./required-compliance-forms.component.scss']
})
export class ComplianceFormsComponent implements OnInit {
  complianceForm: FormGroup;
  eeoOptions: ComplianceFormType[] = [];
  isLoading = true;

  readonly DOCUMENT_TYPES = {
    FEDERAL_APPROVAL: 1,
    EMPLOYEE_INFO_CERTIFICATE: 2,
    AA302_FORM: 3
  };

  constructor(
    private fb: FormBuilder,
    private vendorProfileService: VendorProfileService
  ) {
    this.complianceForm = this.fb.group({
      eeoLanguage: ['', Validators.required],
      federalApprovalLetter: [''],
      employeeInfoCertificate: [''],
      aa302Form: [''],
      businessRegistration: ['', Validators.required],
      w9Form: ['', Validators.required],
      insurancePolicies: ['']
    });
  }

  ngOnInit(): void {
    this.loadComplianceFormTypes();
  }

  loadComplianceFormTypes(): void {
    this.vendorProfileService.getComplianceFormTypes().subscribe({
      next: (response) => {
        if (response.isSuccess && response.complianceFormTypes) {
          this.eeoOptions = response.complianceFormTypes;
        }
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error loading compliance form types:', error);
        this.isLoading = false;
      }
    });
  }

  isSelectedDocument(documentId: number): boolean {
    const selectedValue = this.complianceForm.get('eeoLanguage')?.value;
    return selectedValue && selectedValue.documentId === documentId;
  }

  onSubmit() {
    if (this.complianceForm.valid) {
      console.log('Form submitted:', this.complianceForm.value);
      // Handle form submission
    }
  }
}