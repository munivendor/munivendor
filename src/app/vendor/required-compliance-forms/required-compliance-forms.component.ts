
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
  //insuranceFiles: InsuranceFile[] = []; 
  insuranceFiles: VendorDocument []= [];
  eeoVendorDocumentId: number | null = null ;

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

              if (this.isEEODocument(doc.documentId)) {
                this.complianceForm.get('eeoLanguage')?.setValue(doc.documentId);
                this.eeoVendorDocumentId=doc.vendorDocumentId;
              }

              if (doc.fileName) {
                const controlName = this.getControlNameForDocumentId(doc.documentId);
                if (controlName) {
                  this.uploadedFileNames[controlName] = doc.fileName!;
                }
                // Add insurance policy files to insuranceFiles array
              if (doc.documentCategoryId === 4) {
                this.insuranceFiles.push({
                  fileName: doc.fileName,
                  documentId: doc.documentId,
                  vendorDocumentId: doc.vendorDocumentId,
                  documentCategoryId: doc.documentCategoryId
                });
              }

              }
            }
          });
          this.updateFormControl();
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
    return [
      this.DOCUMENT_TYPES.FEDERAL_APPROVAL,
      this.DOCUMENT_TYPES.EMPLOYEE_INFO_CERTIFICATE,
      this.DOCUMENT_TYPES.AA302_FORM
    ].includes(documentId);
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
        
        const vendorDocumentId = this.eeoVendorDocumentId;//this.vendorDocumentMap.get(documentId) || null;

        this.vendorProfileService.saveVendorDocument(
          organizationId,
          documentId,
          vendorDocumentId,
          file
        ).subscribe({
          next: (response) => {
            if (response.vendorDocumentId) {
             // this.vendorDocumentMap.set(documentId, response.vendorDocumentId);
              this.eeoVendorDocumentId = response.vendorDocumentId;
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

  oneeoDocumentFileChange(event: Event, controlName: string, documentId?: number) {
    const input = event.target as HTMLInputElement;

    if (input.files?.length) {
      const file = input.files[0];
      this.uploadedFileNames[controlName] = file.name;

      if (documentId) {
        const organizationId = this.organizationId || 1;
        
        const vendorDocumentId = this.eeoVendorDocumentId;

        this.vendorProfileService.saveVendorDocument(
          organizationId,
          documentId,
          vendorDocumentId,
          file
        ).subscribe({
          next: (response) => {
            if (response.vendorDocumentId) {
              this.eeoVendorDocumentId = response.vendorDocumentId;
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

  onRequiredDocumentFileChange(event: Event, controlName: string, documentId?: number) {
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

  const newFileEntry: VendorDocument = {
    fileName: file.name,
    documentId: this.DOCUMENT_TYPES.INSURANCE_POLICY,
  };

  this.insuranceFiles = [...this.insuranceFiles, newFileEntry];
  
  this.vendorProfileService.saveVendorDocument(
    this.organizationId,
    this.DOCUMENT_TYPES.INSURANCE_POLICY,
    null,
    file
  ).subscribe({
    next: (response) => {
     
      this.insuranceFiles[this.insuranceFiles.length - 1].vendorDocumentId = response.vendorDocumentId;
      this.updateFormControl();
      this.toastr.success(`${file.name} uploaded successfully`);
    },
    error: (err) => {
      this.toastr.error(`Failed to upload ${file.name}`);
      // Remove the failed file from array
      this.insuranceFiles.pop();
    }
  });
}

removeInsuranceFile(index: number): void {
  const fileToRemove = this.insuranceFiles[index];
  /*if (!fileToRemove || fileToRemove.isUploading || !this.organizationId) {
    return;
  }*/
    this.vendorProfileService.deleteVendorDocument(this.organizationId, fileToRemove.vendorDocumentId!).subscribe({
      next: () => {
        this.insuranceFiles = this.insuranceFiles.filter((_, i) => i !== index);
        this.updateFormControl();
        console.log('Document deleted successfully');
        // Add any success handling logic here
      },
      error: (err) => {
        console.error('Failed to delete document:', err);
        // Add error handling logic here
      },
      complete: () => {
        console.log('Delete operation completed');
        // Optional completion handling
      }
    });
}

downloadFile(documentId: number, controlName: string): void {
  const vendorDocumentId = this.vendorDocumentMap.get(documentId);
  if (!vendorDocumentId) {
    this.toastr.warning('No file available to download');
    return;
  }

  this.vendorProfileService.downloadVendorDocument(this.organizationId, vendorDocumentId).subscribe({
    next: (response) => {
      if (response instanceof Blob) {
        // Create a download link and trigger it
        const blobUrl = window.URL.createObjectURL(response);
        const link = document.createElement('a');
        link.href = blobUrl;
        link.download = this.uploadedFileNames[controlName] || 'document';
        link.click();
        window.URL.revokeObjectURL(blobUrl);
      }
    },
    error: (err) => {
      console.error('Download failed', err);
      this.toastr.error('Failed to download file');
    }
  });
}

downloadInsuranceFile(file: VendorDocument): void {
  if (!file.vendorDocumentId) {
    this.toastr.warning('No file available to download');
    return;
  }

  this.vendorProfileService.downloadVendorDocument(this.organizationId, file.vendorDocumentId).subscribe({
    next: (response) => {
      if (response instanceof Blob) {
        const blobUrl = window.URL.createObjectURL(response);
        const link = document.createElement('a');
        link.href = blobUrl;
        link.download = file.fileName || 'insurance_document';
        link.click();
        window.URL.revokeObjectURL(blobUrl);
      }
    },
    error: (err) => {
      console.error('Download failed', err);
      this.toastr.error('Failed to download file');
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
   // this.insuranceFiles = [...this.insuranceFiles, ...newInsuranceFiles];
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