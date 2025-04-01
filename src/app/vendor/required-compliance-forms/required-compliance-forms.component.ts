import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatSelectChange, MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatDividerModule } from '@angular/material/divider';
import { ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { VendorProfileService } from '../service/vendor-profile.service';
import { ComplianceFormType } from '../model/complianceformtype.model';
import { MatIconModule } from '@angular/material/icon';
import { ToastrService } from 'ngx-toastr';



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
    MatDividerModule,
    MatIconModule
  ],
  templateUrl: './required-compliance-forms.component.html',
  styleUrls: ['./required-compliance-forms.component.css']
})
export class ComplianceFormsComponent implements OnInit {
  complianceForm: FormGroup;
  eeoOptions: ComplianceFormType[] = [];
  isLoading = true;

  readonly DOCUMENT_TYPES = {
    FEDERAL_APPROVAL: 108,
    EMPLOYEE_INFO_CERTIFICATE: 107,
    AA302_FORM: 109
  };
  organizationId: number | undefined;

  constructor(
    private fb: FormBuilder,
    private vendorProfileService: VendorProfileService
  ) {
    this.complianceForm = this.fb.group({
      eeoLanguage: [null, Validators.required],
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
        if ( response) {
          this.eeoOptions = response.complianceFormType;
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
    return selectedValue === documentId;
  }



  /*onFileChange(event: Event, controlName: string) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.complianceForm.get(controlName)?.setValue(input.files[0]);
    }
  }*/

    onFileChange(event: Event, controlName: string, documentId?: number) {
      const input = event.target as HTMLInputElement;
      
      if (input.files && input.files.length > 0) {
          const file = input.files[0];
          // Store the entire file object in the form control
          //this.complianceForm.get(controlName)?.setValue(file);
          
          if (documentId) {
              const organizationId = this.organizationId || 1;
              
              this.vendorProfileService.saveVendorDocument(organizationId, documentId, null, file)
                  .subscribe({
                      next: (response) => {
                          console.log('Document saved successfully', response);
                      },
                      error: (err) => {
                          console.error('Error saving document', err);
                          input.value = ''; // Reset file input
                          this.complianceForm.get(controlName)?.setValue(null);
                      }
                  });
          }
      } else {
          // Handle case when files are cleared
          this.complianceForm.get(controlName)?.setValue(null);
      }
  }

  onSubmit() {
    if (this.complianceForm.valid) {
      console.log('Form submitted:', this.complianceForm.value);
      // Handle form submission
    }
  }
}