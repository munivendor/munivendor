
interface InsuranceFile {
  name: string;
  isUploading: boolean;
  isError: boolean;
  vendorDocumentId?: number;
  documentName?: string;
  file?: File;
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
    W9: 112,
    INSURANCE_POLICY: 113
  };
  organizationId: number =1;

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
        return 'w9Form'; 
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

 
onInsuranceFilesChange(event: Event): void {
  const input = event.target as HTMLInputElement;
  
  if (input.files?.length) {
    const file = input.files[input.files.length - 1]; 
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

  if (!this.organizationId) {
    this.toastr.error('Organization ID is required');
    return;
  }

  
  const newFileEntry: InsuranceFile = {
    name: file.name,
    isUploading: true,
    isError: false,
    file: file
  };

  this.insuranceFiles = [...this.insuranceFiles, newFileEntry];
  // Get existing vendorDocumentId if this is an update
 // const existingFile = this.insuranceFiles.find(f => f.name === file.name);
  //const vendorDocumentId = existingFile?.vendorDocumentId || null;

  this.vendorProfileService.saveVendorDocument(
    this.organizationId,
    this.DOCUMENT_TYPES.INSURANCE_POLICY,
    null,
    file
  ).subscribe({
    next: (response) => {
      if (response.isSuccess) {
        this.insuranceFiles = this.insuranceFiles.map(f => 
          f.name === file.name ? { 
            name: file.name,
            isUploading: false,
            isError: false,
            vendorDocumentId: response.vendorDocumentId,
            documentName: file.name,
            file: f.file
          } : f
        );
        this.updateFormControl();
        this.toastr.success(`${file.name} uploaded successfully`);
      } else {
        throw new Error('Upload failed');
      }
    },
    error: (err) => {
      this.insuranceFiles = this.insuranceFiles.map(f => 
        f.name === file.name ? { 
          ...f, 
          isUploading: false, 
          isError: true 
        } : f
      );
      this.toastr.error(`Failed to upload ${file.name}`);
      this.updateFormControl();
    }
  });
}

removeInsuranceFile(index: number): void {
  const fileToRemove = this.insuranceFiles[index];
  if (!fileToRemove || fileToRemove.isUploading || !this.organizationId) {
    return;
  }

  // If no vendorDocumentId, just remove from local state
  if (!fileToRemove.vendorDocumentId) {
    this.insuranceFiles = this.insuranceFiles.filter((_, i) => i !== index);
    this.updateFormControl();
    return;
  }

  // For deletion, we can use saveVendorDocument with null file
  // or implement a separate delete method in the service
  this.vendorProfileService.saveVendorDocument(
    this.organizationId,
    this.DOCUMENT_TYPES.INSURANCE_POLICY,
    fileToRemove.vendorDocumentId,
    null as any // This might need adjustment based on your API
  ).subscribe({
    next: (response) => {
      if (response.isSuccess) {
        this.insuranceFiles = this.insuranceFiles.filter((_, i) => i !== index);
        this.updateFormControl();
        this.toastr.success(`${fileToRemove.name} removed`);
      } else {
        throw new Error('Deletion failed');
      }
    },
    error: (err) => {
      this.toastr.error(`Failed to remove ${fileToRemove.name}`);
    }
  });
}
  
onDrop(event: DragEvent): void {
  event.preventDefault();
  event.stopPropagation();
  this.isDragging = false;
  
  if (event.dataTransfer?.files) {
    // Convert dropped files to InsuranceFile objects
    const newInsuranceFiles = Array.from(event.dataTransfer.files).map(file => ({
      name: file.name,
      isUploading: false,
      isError: false,
      file: file
    }));
    
    // Append to existing files
    this.insuranceFiles = [...this.insuranceFiles, ...newInsuranceFiles];
    this.updateFormControl();
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