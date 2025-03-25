import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil, debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { CommonModule } from '@angular/common';
import { VendorProfileService } from '../service/vendor-profile.service';

interface ComplianceFormType {
  id: number;
  name: string;
  description?: string;
  requirements: {
    fieldName: string;
    label: string;
    acceptedFileTypes?: string[];
    allowMultiple?: boolean;
    hint?: string;
    required?: boolean;
  }[];
}

interface UploadedFile {
  id: number;
  name: string;
  url: string;
  type: string;
  size: number;
  uploadedAt: string;
}

@Component({
  selector: 'app-required-compliance-forms',
  templateUrl: './required-compliance-forms.component.html',
  styleUrls: ['./required-compliance-forms.component.css'],
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule
  ]
})
export class RequiredComplianceFormsComponent implements OnInit, OnDestroy {
  complianceForm: FormGroup;
  complianceFormTypes: ComplianceFormType[] = [];
  selectedFormType: ComplianceFormType | null = null;
  uploadedFiles: UploadedFile[] = [];
  fileErrors: { [key: string]: string } = {};
  isLoading = false;
  isEditing = false;
  maxFileSizeMB = 50;
  private originalComplianceData: any = null;
  private destroy$ = new Subject<void>();

  constructor(
    private fb: FormBuilder,
    private vendorProfileService: VendorProfileService,
    private route: ActivatedRoute
  ) {
    this.complianceForm = this.fb.group({
      complianceFormType: ['', Validators.required],
      // Dynamic file controls will be added based on form type selection
    });
  }

  ngOnInit(): void {
    this.loadComplianceFormTypes();
    
    this.route.paramMap.pipe(takeUntil(this.destroy$)).subscribe(params => {
      const id = params.get('id');
      if (id) {
        this.isEditing = true;
        this.loadComplianceData(+id);
      }
    });

    this.complianceForm.get('complianceFormType')?.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(formTypeId => {
        this.handleFormTypeChange(formTypeId);
      });

    this.setupAutoSave();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadComplianceFormTypes(): void {
    this.isLoading = true;
    this.vendorProfileService.getComplianceFormTypes().subscribe({
      next: (response) => {
        if (response.isSuccess && response.formTypes) {
          this.complianceFormTypes = response.formTypes;
        }
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error loading compliance form types:', error);
        this.isLoading = false;
      }
    });
  }

  private loadComplianceData(id: number): void {
    this.isLoading = true;
    this.vendorProfileService.getComplianceData(id).subscribe({
      next: (response) => {
        if (response.isSuccess && response.complianceData) {
          this.originalComplianceData = response.complianceData;
          this.populateForm(response.complianceData);
          this.loadUploadedFiles(id);
        }
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error loading compliance data:', error);
        this.isLoading = false;
      },
    });
  }

  private loadUploadedFiles(complianceId: number): void {
    this.vendorProfileService.getComplianceFiles(complianceId).subscribe({
      next: (response) => {
        if (response.isSuccess && response.files) {
          this.uploadedFiles = response.files;
        }
      },
      error: (error) => {
        console.error('Error loading uploaded files:', error);
      }
    });
  }

  private handleFormTypeChange(formTypeId: number): void {
    this.selectedFormType = this.complianceFormTypes.find(t => t.id === formTypeId) || null;
    this.fileErrors = {};
    
    // Remove previous file controls
    Object.keys(this.complianceForm.controls).forEach(key => {
      if (key !== 'complianceFormType') {
        this.complianceForm.removeControl(key);
      }
    });

    // Add new file controls based on requirements
    if (this.selectedFormType) {
      this.selectedFormType.requirements.forEach(req => {
        const validators = req.required ? [Validators.required] : [];
        this.complianceForm.addControl(req.fieldName, this.fb.control(null, validators));
      });
    }
  }

  private setupAutoSave(): void {
    this.complianceForm.valueChanges
      .pipe(
        debounceTime(1000),
        distinctUntilChanged(),
        takeUntil(this.destroy$)
      )
      .subscribe((formValue) => {
        if (this.complianceForm.valid && this.isEditing) {
          const validChangedFields = this.getValidChangedFields();
          if (Object.keys(validChangedFields).length > 0) {
            this.vendorProfileService.saveComplianceData(validChangedFields).subscribe({
              next: (response) => {
                console.log('Auto-saved compliance data:', response);
              },
              error: (error) => {
                console.error('Error auto-saving compliance data:', error);
              },
            });
          }
        }
      });
  }

  private populateForm(complianceData: any): void {
    this.complianceForm.patchValue({
      complianceFormType: complianceData.formTypeId,
      // Patch other values as needed
    });
  }

  onFileUpload(event: any, fieldName: string): void {
    const fileList: FileList = event.target.files;
    if (!fileList || fileList.length === 0) return;

    const requirement = this.selectedFormType?.requirements.find(r => r.fieldName === fieldName);
    if (!requirement) return;

    const files = Array.from(fileList);
    let isValid = true;

    // Validate each file
    for (const file of files) {
      // Check file size (50MB max by default)
      if (file.size > this.maxFileSizeMB * 1024 * 1024) {
        this.fileErrors[fieldName] = `File size exceeds ${this.maxFileSizeMB} MB limit.`;
        isValid = false;
        break;
      }

      // Check file type if specified
      if (requirement.acceptedFileTypes && requirement.acceptedFileTypes.length > 0) {
        const fileType = file.type.toLowerCase();
        const isValidType = requirement.acceptedFileTypes.some(type => 
          fileType.includes(type.replace('.', '').toLowerCase())
        );
        
        if (!isValidType) {
          this.fileErrors[fieldName] = `Accepted file types: ${requirement.acceptedFileTypes.join(', ')}`;
          isValid = false;
          break;
        }
      }
    }

    if (isValid) {
      this.fileErrors[fieldName] = '';
      this.complianceForm.get(fieldName)?.setValue(files);
    } else {
      this.complianceForm.get(fieldName)?.setValue(null);
      event.target.value = ''; // Clear the file input
    }
  }

  removeFile(fileId: number): void {
    this.isLoading = true;
    this.vendorProfileService.deleteComplianceFile(fileId).subscribe({
      next: () => {
        this.uploadedFiles = this.uploadedFiles.filter(f => f.id !== fileId);
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error deleting file:', error);
        this.isLoading = false;
      }
    });
  }

  onSubmit(): void {
    if (this.complianceForm.invalid) {
      this.markAllAsTouched();
      return;
    }

    this.isLoading = true;
    const formData = new FormData();
    const formValue = this.complianceForm.value;

    // Append all form values to FormData
    Object.keys(formValue).forEach(key => {
      if (key === 'complianceFormType') {
        formData.append('formTypeId', formValue[key]);
      } else if (formValue[key] instanceof FileList) {
        Array.from(formValue[key] as FileList).forEach((file: File) => {
          formData.append(key, file, file.name);
        });
      } else if (formValue[key] !== null) {
        formData.append(key, formValue[key]);
      }
    });

   /* const saveObservable = this.isEditing
      ? this.vendorProfileService.updateComplianceData(formData)
      : this.vendorProfileService.createComplianceData(formData);

    saveObservable.subscribe({
      next: (response) => {
        console.log('Compliance data saved successfully:', response);
        if (response.isSuccess && response.complianceId) {
          this.loadUploadedFiles(response.complianceId);
        }
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error saving compliance data:', error);
        this.isLoading = false;
      },
    });*/
  }

  private markAllAsTouched(): void {
    Object.values(this.complianceForm.controls).forEach(control => {
      control.markAsTouched();
    });
  }

  private getValidChangedFields(): any {
    const validChangedFields: any = {};
    const formValue = this.complianceForm.value;

    for (const key in formValue) {
      if (
        this.complianceForm.get(key)?.valid &&
        this.originalComplianceData &&
        formValue[key] !== this.originalComplianceData[key]
      ) {
        validChangedFields[key] = formValue[key];
      }
    }

    return validChangedFields;
  }

  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
}