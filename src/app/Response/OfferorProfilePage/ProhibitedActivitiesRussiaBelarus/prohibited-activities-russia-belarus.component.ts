import {
  Component,
  EventEmitter,
  Input,
  OnInit,
  Output,
  ViewEncapsulation,
  OnChanges,
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
import { MatButtonModule } from '@angular/material/button';

import { StateService } from '../../../Request/services/state.service';
import { LoggingService } from '../../../exceptionhandling/logging.service';
import { SnackbarNotificationService } from '../../../shared/service/snackbar-notification.service';
import { RequestService } from '../../../Request/services/request.service';
import { OrganizationDocument } from '../../model/organization-document.model';
import { OfferorProfileService } from '../../services/offeror-profile.service';
import { DocumentType } from '../../model/document-type.model';

@Component({
  selector: 'app-prohibited-activities-russia-belarus',
  standalone: true,
  encapsulation: ViewEncapsulation.None,
  templateUrl: './prohibited-activities-russia-belarus.component.html',
  styleUrls: [
    '../../../shared/shared-profile-card.css',
    './prohibited-activities-russia-belarus.component.css',
  ],
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatSelectModule,
    MatProgressSpinnerModule,
    MatIconModule,
    MatInputModule,
    MatButtonModule,
  ],
})
export class ProhibitedActivitiesRussiaBelarusComponent
  implements OnInit, OnChanges
{
  prohibitedForm!: FormGroup;

  organizationId: number | null = null;
  isUploading = false;
  selectedFileName: string | null = null;
  savedDetails: string | null = null;
  savedOfferorProfileId: number | null = null;

  @Input() profileDetails: {
    offerorProfileId: number;
    formTypeId: number;
    details: string;
  }[] = [];
  @Output() detailsSaved = new EventEmitter<void>();

  readonly OFAC_DOCUMENT_CODE_NAME = [
    'Disclosure_of_Prohibited_Activites_in_Russia_or_Belarus',
  ];

  getDocumentType(codeName: string): DocumentType | undefined {
    return this.documentTypes.find((dt) => dt.codeName === codeName);
  }

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

  ngOnChanges(): void {
    this.applyProfileDetails();
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

  private applyProfileDetails(): void {
    const match = this.profileDetails.find((d) => d.formTypeId === 1);
    const hasUploadedDoc = this.uploadedDocuments.some(
      (d) => d.documentName === this.OFAC_DOCUMENT_CODE_NAME[0],
    );

    if (match?.details) {
      this.savedOfferorProfileId = match.offerorProfileId;
      // Step 1 — patch dropdowns first so conditional fields render
      this.prohibitedForm?.patchValue({
        ofacIdentification: 'yes',
        ofacAdditional: 'yes',
      });

      // Step 2 — patch textarea on next tick after DOM has rendered
      setTimeout(() => {
        this.prohibitedForm?.patchValue({
          ofacDescription: match.details,
        });
      }, 0);
    } else if (hasUploadedDoc) {
      this.prohibitedForm?.patchValue({
        ofacIdentification: 'yes',
      });
    }
  }

  onFileSelected(event: any): void {
    const file: File = event.target.files[0];
    if (file) this.processFile(file);
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

    const { ofacDescription } = this.prohibitedForm.value;

    if (!ofacDescription || !this.organizationId) return;

    const formTypeId = 1;
    const request$ = this.savedOfferorProfileId
      ? this.offerorProfileService.UpdateOfferorProfileDetails(
          this.organizationId,
          this.savedOfferorProfileId,
          formTypeId,
          ofacDescription,
        )
      : this.offerorProfileService.SaveOfferorProfileDetails(
          this.organizationId,
          formTypeId,
          ofacDescription,
        );

    request$.subscribe({
      next: (res) => {
        this.savedOfferorProfileId = res.offerorProfileId;
        this.snackbar.showSnackbarSuccess('Changes saved successfully.');
        this.detailsSaved.emit();
      },
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

    const docType = this.getDocumentType(this.OFAC_DOCUMENT_CODE_NAME[0]);
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
}
