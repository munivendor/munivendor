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
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';

import { StateService } from '../../../Request/services/state.service';
import { LoggingService } from '../../../exceptionhandling/logging.service';
import { SnackbarNotificationService } from '../../../shared/service/snackbar-notification.service';
import { RequestService } from '../../../Request/services/request.service';
import { OrganizationDocument } from '../../model/organization-document.model';

@Component({
  selector: 'app-prohibited-activities-russia-belarus',
  standalone: true,
  encapsulation: ViewEncapsulation.None,
  templateUrl: './prohibited-activities-russia-belarus.component.html',
  styleUrls: ['./prohibited-activities-russia-belarus.component.css'],
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatSelectModule,
    MatProgressSpinnerModule,
    MatIconModule,
    MatInputModule,
  ],
})
export class ProhibitedActivitiesRussiaBelarusComponent implements OnInit {
  prohibitedForm!: FormGroup;

  organizationId: number | null = null;
  isUploading = false;
  selectedFileName: string | null = null;

  ofacIdentificationOptions = [
    {
      value: 'no',
      label:
        'No. Our organization IS NOT identified on the OFAC Specially Designated Nationals and Blocked Persons list on account of activity related to Russia and/or Belarus.',
    },
    {
      value: 'yes',
      label:
        'Yes. Our organization IS identified on the OFAC Specially Designated Nationals and Blocked Persons list on account of activity related to Russia and/or Belarus.',
    },
  ];

  ofacAdditionalOptions = [
    {
      value: 'yes',
      label:
        'Yes-the work or activity in which this organization is engaged in Russia and/or Belarus IS consistent with federal law, regulation, license, or exemption.',
    },
    {
      value: 'no',
      label:
        'No-the work or activity in which this organization is engaged in Russia and/or Belarus IS NOT consistent with federal law, regulation, license, or exemption.',
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

    this.prohibitedForm
      .get('ofacIdentification')
      ?.valueChanges.subscribe((value) => {
        if (value === 'yes') {
          this.prohibitedForm
            .get('ofacAdditional')
            ?.setValidators([Validators.required]);
        } else {
          this.prohibitedForm.get('ofacAdditional')?.clearValidators();
          this.prohibitedForm.get('ofacAdditional')?.reset(null);
          this.prohibitedForm.get('ofacDescription')?.clearValidators();
          this.prohibitedForm.get('ofacDescription')?.reset(null);
          this.selectedFileName = null;
        }
        this.prohibitedForm.get('ofacAdditional')?.updateValueAndValidity();
        this.prohibitedForm.get('ofacDescription')?.updateValueAndValidity();
      });

    this.prohibitedForm
      .get('ofacAdditional')
      ?.valueChanges.subscribe((value) => {
        if (value === 'yes') {
          this.prohibitedForm
            .get('ofacDescription')
            ?.setValidators([Validators.required]);
        } else {
          this.prohibitedForm.get('ofacDescription')?.clearValidators();
          this.prohibitedForm.get('ofacDescription')?.reset(null);
        }
        this.prohibitedForm.get('ofacDescription')?.updateValueAndValidity();
      });
  }

  private buildForm(): void {
    this.prohibitedForm = this.fb.group({
      ofacIdentification: [null, Validators.required],
      ofacAdditional: [null],
      ofacDescription: [null],
    });
  }

  get showConditionalFields(): boolean {
    return this.prohibitedForm.get('ofacIdentification')?.value === 'yes';
  }

  get showDescriptionField(): boolean {
    return this.prohibitedForm.get('ofacAdditional')?.value === 'yes';
  }

  onFileSelected(event: any): void {
    const file: File = event.target.files[0];
    if (file) this.processFile(file);
  }

  private processFile(file: File): void {
    const allowedTypes = ['image/jpeg', 'image/png', 'application/pdf'];
    const maxSize = 50 * 1024 * 1024; // 50MB

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
      documentName: 'OFAC Russia Belarus Documentation',
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
    const control = this.prohibitedForm.get(field);
    return !!(control && control.invalid && (control.dirty || control.touched));
  }

  onSubmit(): void {
    if (this.prohibitedForm.invalid) {
      this.prohibitedForm.markAllAsTouched();
      return;
    }
    // Handle form submission, e.g. save the ofacIdentification, ofacAdditional, and ofacDescription values to the backend
  }

  getUploadedDoc(documentName: string): OrganizationDocument | undefined {
    return this.uploadedDocuments.find((d) => d.documentName === documentName);
  }
}
