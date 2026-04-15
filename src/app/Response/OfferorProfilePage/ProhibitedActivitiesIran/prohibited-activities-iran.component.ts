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
import { OfferorProfileService } from '../../services/offeror-profile.service';
import { DocumentType } from '../../model/document-type.model';

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

  readonly IRAN_DOCUMENT_CODE_NAME = 'Disclosure_of_Iran_Investments';

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
  @Input() documentTypes: DocumentType[] = [];
  @Output() documentUploaded = new EventEmitter<void>();

  constructor(
    private fb: FormBuilder,
    private stateService: StateService,
    private loggingService: LoggingService,
    private snackbar: SnackbarNotificationService,
    private requestService: RequestService,
    private offerorProfileService: OfferorProfileService,
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

  getDocumentType(codeName: string): DocumentType | undefined {
    return this.documentTypes.find((dt) => dt.codeName === codeName);
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

    const docType = this.getDocumentType(this.IRAN_DOCUMENT_CODE_NAME);
    if (!docType) {
      this.snackbar.showSnackbarError(
        'Document type not recognized. Please try again.',
      );
      return;
    }

    this.selectedFileName = file.name;
    this.isUploading = true;

    const municipalityDocument = {
      documentName: docType.codeName,
      codeId: docType.codeId,
      mapId: docType.mapId,
    };

    this.requestService
      .SaveOrganizationDocument(
        this.organizationId,
        municipalityDocument,
        file,
        municipalityDocument.mapId,
      )
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

    const { iranDescription } = this.iranForm.value;

    // Only POST if there's a textarea value to save
    if (!iranDescription || !this.organizationId) return;

    this.offerorProfileService
      .SaveOfferorProfileDetails(this.organizationId, 2, iranDescription)
      .subscribe({
        next: () =>
          this.snackbar.showSnackbarSuccess('Changes saved successfully.'),
        error: (err) => {
          this.snackbar.showSnackbarError(
            'Failed to save changes. Please try again.',
          );
          this.loggingService.logException(err, 3, {
            organizationId: this.organizationId,
            methodName: 'onSubmit',
          });
        },
      });
  }

  getUploadedDoc(codeName: string): OrganizationDocument | undefined {
    return this.uploadedDocuments.find((d) => d.documentName === codeName);
  }
}
