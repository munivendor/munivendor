import {
  Component,
  EventEmitter,
  Input,
  OnInit,
  Output,
  ViewEncapsulation,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';

import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatIconModule } from '@angular/material/icon';

import { StateService } from '../../../Request/services/state.service';
import { LoggingService } from '../../../exceptionhandling/logging.service';
import { SnackbarNotificationService } from '../../../shared/service/snackbar-notification.service';
import { RequestService } from '../../../Request/services/request.service';
import { OrganizationDocument } from '../../model/organization-document.model';

@Component({
  selector: 'app-prohibited-activities-iran',
  standalone: true,
  encapsulation: ViewEncapsulation.None,
  templateUrl: './prohibited-activities-iran.component.html',
  styleUrls: ['./prohibited-activities-iran.component.css'],
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatSelectModule,
    MatInputModule,
    MatProgressSpinnerModule,
    MatIconModule,
  ],
})
export class ProhibitedActivitiesIranComponent implements OnInit {
  iranForm!: FormGroup;

  organizationId: number | null = null;
  isUploading = false;
  selectedFileName: string | null = null;

  chapter25Options = [
    {
      value: 'yes',
      label: 'Yes, I can certify. We DO NOT conduct business in Iran.',
    },
    {
      value: 'no',
      label: 'No, I cannot certify. We DO conduct business in Iran.',
    },
  ];

  @Input() uploadedDocuments: OrganizationDocument[] = [];
  @Output() documentUploaded = new EventEmitter<void>();

  constructor(
    private fb: FormBuilder,
    private stateService: StateService,
    private loggingService: LoggingService,
    private snackbar: SnackbarNotificationService,
    private requestService: RequestService,
  ) {}

  ngOnInit(): void {
    this.organizationId = this.stateService.getOrganizationId();
    this.buildForm();

    this.iranForm
      .get('chapter25Identification')
      ?.valueChanges.subscribe((value) => {
        if (value === 'no') {
          this.iranForm
            .get('iranDescription')
            ?.setValidators([Validators.required]);
        } else {
          this.iranForm.get('iranDescription')?.clearValidators();
          this.iranForm.get('iranDescription')?.reset(null);
          this.selectedFileName = null;
        }
        this.iranForm.get('iranDescription')?.updateValueAndValidity();
      });
  }

  private buildForm(): void {
    this.iranForm = this.fb.group({
      chapter25Identification: [null, Validators.required],
      iranDescription: [null],
    });
  }

  get showConditionalFields(): boolean {
    return this.iranForm.get('chapter25Identification')?.value === 'no';
  }

  onFileSelected(event: any): void {
    const file: File = event.target.files[0];
    if (file) this.processFile(file);
  }

  private processFile(file: File): void {
    const allowedTypes = ['image/jpeg', 'image/png', 'application/pdf'];
    const maxSize = 50 * 1024 * 1024;

    if (!allowedTypes.includes(file.type)) {
      this.snackbar.showSnackbarError(
        'Invalid file type. Only JPG, PNG, and PDF are allowed.',
      );
      return;
    }

    if (file.size > maxSize) {
      this.snackbar.showSnackbarError('File exceeds the 50MB size limit.');
      return;
    }

    if (!this.organizationId) return;

    this.selectedFileName = file.name;
    const municipalityDocument = {
      documentName: 'Iran Business Activity Documentation',
    };

    this.isUploading = true;

    this.requestService
      .SaveOrganizationDocument(this.organizationId, municipalityDocument, file)
      .subscribe({
        next: () => {
          this.isUploading = false;
          this.snackbar.showSnackbarSuccess('Document uploaded successfully.');
          this.documentUploaded.emit();
        },
        error: (err) => {
          this.isUploading = false;
          this.selectedFileName = null;
          this.snackbar.showSnackbarError('Upload failed. Please try again.');
          this.loggingService.logException(err, 3, {
            organizationId: this.organizationId,
            methodName: 'processFile',
          });
        },
      });
  }

  clearFile(): void {
    this.selectedFileName = null;
  }

  isFieldInvalid(field: string): boolean {
    const control = this.iranForm.get(field);
    return !!(control && control.invalid && (control.dirty || control.touched));
  }

  onSubmit(): void {
    if (this.iranForm.invalid) {
      this.iranForm.markAllAsTouched();
      return;
    }
    // Handle form submission, e.g. save the chapter25Identification and iranDescription values to the backend
  }

  getUploadedDoc(documentName: string): OrganizationDocument | undefined {
    return this.uploadedDocuments.find((d) => d.documentName === documentName);
  }
}
