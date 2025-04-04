
interface InsuranceFile {
  name: string;
  isUploading?: boolean;
  isError?: boolean;
  vendorDocumentId?: number;
  documentName?: string;
  // Add other properties you need from the server response
}

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
import { VendorDocument } from '../model/vendordocument.model';

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
  uploadedFileNames: { [key: string]: string } = {};
  insuranceFiles: InsuranceFile[] = []; 

  readonly DOCUMENT_TYPES = {
    FEDERAL_APPROVAL: 108,
    EMPLOYEE_INFO_CERTIFICATE: 107,
    AA302_FORM: 109,
    BUSINESS_RGISTRATION_CERTIFICATE: 111,
    W9: 112
  };
  organizationId: number | undefined;

  vendorDocumentMap = new Map<number, number>();
  isDragging: boolean =false;

  constructor(
    private fb: FormBuilder,
    private vendorProfileService: VendorProfileService,
    private toastr: ToastrService
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
    this.loadExistingVendorDocuments();
  }

  loadComplianceFormTypes(): void {
    this.vendorProfileService.getComplianceFormTypes().subscribe({
      next: (response) => {
        if (response) {
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

  loadExistingVendorDocuments(): void {
    const organizationId = this.organizationId || 1;

    this.vendorProfileService.getVendorDocuments(organizationId).subscribe({
      next: (documents: VendorDocument[] | null) => {
        if (documents && documents.length > 0) {
          documents.forEach(doc => {
            if (doc.vendorDocumentId && doc.documentCategoryId) {
              this.vendorDocumentMap.set(doc.documentId, doc.vendorDocumentId);

              // Check if this is an EEO document
              if (this.isEEODocument(doc.documentId)) {
                this.complianceForm.get('eeoLanguage')?.setValue(doc.documentId);
              }

              if (doc.documentName) {
                const controlName = this.getControlNameForDocumentId(doc.documentId);
                if (controlName) {
                  this.uploadedFileNames[controlName] = doc.documentName;
                }
              }
            }
          });
        } else {
          console.warn('No documents found');
        }
      },
      error: (err) => {
        console.error('Error loading vendor documents:', err);
      }
    });
  }
  private isEEODocument(documentId: number): boolean {
    return Object.values(this.DOCUMENT_TYPES).includes(documentId);
  }

  private getControlNameForDocumentId(documentId: number): string | null {
    switch (documentId) {
      case this.DOCUMENT_TYPES.FEDERAL_APPROVAL:
        return 'federalApprovalLetter';
      case this.DOCUMENT_TYPES.EMPLOYEE_INFO_CERTIFICATE:
        return 'employeeInfoCertificate';
      case this.DOCUMENT_TYPES.AA302_FORM:
        return 'aa302Form';
      case this.DOCUMENT_TYPES.BUSINESS_RGISTRATION_CERTIFICATE:
        return 'businessRegistration';
      case this.DOCUMENT_TYPES.W9:
        return 'w9Form'; // Fixed typo (was 'w9form')
      default:
        return null;
    }
  }

  isSelectedDocument(documentId: number): boolean {
    const selectedValue = this.complianceForm.get('eeoLanguage')?.value;
    return selectedValue === documentId;
  }

  onFileChange(event: Event, controlName: string, documentId?: number) {
    const input = event.target as HTMLInputElement;

    if (input.files?.length) {
      const file = input.files[0];
      this.uploadedFileNames[controlName] = file.name;

      if (documentId) {
        const organizationId = this.organizationId || 1;
        // Get existing vendorDocumentId for this document type
        const vendorDocumentId = this.vendorDocumentMap.get(documentId) || null;

        this.vendorProfileService.saveVendorDocument(
          organizationId,
          documentId,
          vendorDocumentId,
          file
        ).subscribe({
          next: (response) => {
            if (response.vendorDocumentId) {
              this.vendorDocumentMap.set(documentId, response.vendorDocumentId);
              this.toastr.success('File uploaded successfully');
            }
          },
          error: (err) => {
            console.error('Upload failed', err);
            this.toastr.error('File upload failed');
            input.value = '';
            delete this.uploadedFileNames[controlName];
          }
        });
      }
    } else {
      delete this.uploadedFileNames[controlName];
    }
  }

  getFileName(controlName: string): string {
    return this.uploadedFileNames[controlName] || 'No file chosen';
  }

  private updateFormControl(): void {
    this.complianceForm.get('insurancePolicies')?.setValue(
      this.insuranceFiles.length > 0 ? this.insuranceFiles : null
    );
  }

  // In your component
onInsuranceFilesChange(event: Event): void {
  const input = event.target as HTMLInputElement;
  if (input.files?.length) {
    const file = input.files[input.files.length - 1]; // Get most recent file
    this.uploadFile(file);
    input.value = '';
  }
}

private uploadFile(file: File): void {
  const maxSize = 50 * 1024 * 1024;
  if (file.size > maxSize) {
    this.toastr.warning(`${file.name} exceeds 50MB limit`);
    return;
  }

  // Create and add the new file entry
  const newFileEntry = {
    name: file.name,
    isUploading: true,
    isError: false
  };
  this.insuranceFiles = [...this.insuranceFiles, newFileEntry];

  this.vendorProfileService.uploadVendorDocument(
    this.organizationId || 1,
    this.DOCUMENT_TYPES.INSURANCE_POLICY,
    file
  ).subscribe({
    next: (response) => {
      this.insuranceFiles = this.insuranceFiles.map(f => 
        f.name === file.name ? { ...response, isUploading: false } : f
      );
      this.updateFormControl();
    },
    error: (err) => {
      this.insuranceFiles = this.insuranceFiles.map(f => 
        f.name === file.name ? { ...f, isUploading: false, isError: true } : f
      );
      this.toastr.error(`Failed to upload ${file.name}`);
      this.updateFormControl();
    }
  });
}

removeInsuranceFile(index: number): void {
  const fileToRemove = this.insuranceFiles[index];
  if (fileToRemove.isUploading) return;

  this.vendorProfileService.deleteVendorDocument(
    this.organizationId || 1,
    fileToRemove.vendorDocumentId
  ).subscribe({
    next: () => {
      this.insuranceFiles.splice(index, 1);
      this.updateFormControl();
    },
    error: (err) => {
      this.toastr.error(`Failed to remove ${fileToRemove.documentName || fileToRemove.name}`);
    }
  });
}
  
  onDrop(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging = false;
    
    if (event.dataTransfer?.files) {
      // Append dropped files to existing ones
      this.insuranceFiles = [...this.insuranceFiles, ...Array.from(event.dataTransfer.files)];
      this.complianceForm.get('insurancePolicies')?.setValue(this.insuranceFiles);
    }
  }
  

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging = true;
  }

  onDragLeave(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging = false;
  }


  onSubmit() {
    if (this.complianceForm.valid) {
      console.log('Form submitted:', this.complianceForm.value);
      // Handle form submission
    }
  }
}