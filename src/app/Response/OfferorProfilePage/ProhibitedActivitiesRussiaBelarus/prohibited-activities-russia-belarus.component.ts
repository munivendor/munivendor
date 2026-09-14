import {
  Component,
  EventEmitter,
  Input,
  OnInit,
  Output,
  ViewEncapsulation,
  OnChanges,
  SimpleChanges,
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
import { MatTooltipModule } from '@angular/material/tooltip';

import { StateService } from '../../../Request/services/state.service';
import { LoggingService } from '../../../exceptionhandling/logging.service';
import { SnackbarNotificationService } from '../../../shared/service/snackbar-notification.service';
import { RequestService } from '../../../Request/services/request.service';
import { OrganizationDocument } from '../../model/organization-document.model';
import { OfferorProfileService } from '../../services/offeror-profile.service';
import { DocumentType } from '../../model/document-type.model';
import { forkJoin, Observable } from 'rxjs';

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
    MatTooltipModule,
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
  private deletionJustOccurred = false;

  deletingDocumentIds = new Set<number>();
  downloadingDocumentIds = new Set<number>();

  @Input() profileDetails: {
    offerorProfileId: number;
    formTypeId: number;
    prohibitedDetails: string;
    ofacIdentification?: boolean | null;
    ofacIdentificationAdditional?: boolean | null;
  }[] = [];
  @Output() detailsSaved = new EventEmitter<void>();
  @Output() detailsDeleted = new EventEmitter<void>();

  readonly OFAC_DOCUMENT_CODE_NAME = [
    'Disclosure_of_Prohibited_Activites_in_Russia_or_Belarus_Supporting',
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
        'Yes - the work or activity in which this organization is engaged in Russia and/or Belarus IS consistent with federal law, regulation, license, or exemption.',
    },
    {
      value: 'no',
      label:
        'No - the work or activity in which this organization is engaged in Russia and/or Belarus IS NOT consistent with federal law, regulation, license, or exemption.',
    },
  ];

  @Input() uploadedDocuments: OrganizationDocument[] = [];
  @Input() documentTypes: DocumentType[] = [];
  @Output() documentUploaded = new EventEmitter<void>();
  @Output() documentDeleted = new EventEmitter<void>();

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

    // Note: the conditional fields below are displayed with a "(Required)"
    // label whenever the user answers 'yes' to OFAC identification, but they
    // are intentionally NOT enforced with Validators.required — the section
    // must still be saveable even if no child dropdown, description, or
    // document has been provided yet.
    this.prohibitedForm
      .get('ofacIdentification')
      ?.valueChanges.subscribe((value) => {
        if (value !== 'yes') {
          this.selectedFileName = null;
        }
      });

    this.applyProfileDetails();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['profileDetails']) {
      this.applyProfileDetails();
    }
  }

  private buildForm(): void {
    this.prohibitedForm = this.fb.group({
      ofacIdentification: [null, Validators.required],
      ofacAdditional: [null],
      prohibitedDetails: [null],
    });
  }

  get showConditionalFields(): boolean {
    return this.prohibitedForm.get('ofacIdentification')?.value === 'yes';
  }

  get showDescriptionField(): boolean {
    return this.prohibitedForm.get('ofacAdditional')?.value === 'yes';
  }

  private applyProfileDetails(): void {
    if (!this.prohibitedForm) return;
    if (this.deletionJustOccurred) {
      this.deletionJustOccurred = false;
      return;
    }
    // Before: mapId = documentTypeId for Russia/Belarus details is 8 (per backend)
    // Fix: mapId = formTypeId
    const matches = this.profileDetails.filter((d) => d.formTypeId === 8);
    const match = matches.length
      ? matches.reduce((a, b) =>
          a.offerorProfileId > b.offerorProfileId ? a : b,
        )
      : null;

    if (!match) return;

    this.savedOfferorProfileId = match.offerorProfileId;

    // Restore booleans from the saved record
    const ofacId =
      match.ofacIdentification === true
        ? 'yes'
        : match.ofacIdentification === false
          ? 'no'
          : null;
    const ofacAdd =
      match.ofacIdentificationAdditional === true
        ? 'yes'
        : match.ofacIdentificationAdditional === false
          ? 'no'
          : null;

    this.prohibitedForm.patchValue({
      ofacIdentification: ofacId,
      ofacAdditional: ofacAdd,
    });

    if (match.prohibitedDetails) {
      setTimeout(() => {
        this.prohibitedForm.patchValue({
          prohibitedDetails: match.prohibitedDetails,
        });
      }, 0);
    }
  }

  onFileSelected(event: any): void {
    const file: File = event.target.files[0];
    if (file) this.processFile(file);
    event.target.value = '';
  }

  clearFile(): void {
    this.selectedFileName = null;
  }

  isFieldInvalid(field: string): boolean {
    const control = this.prohibitedForm.get(field);
    return !!(control && control.invalid && (control.dirty || control.touched));
  }

  deleteOfferorProfileDocument(doc: OrganizationDocument): void {
    if (
      !doc.documentId ||
      !this.organizationId ||
      this.deletingDocumentIds.has(doc.documentId)
    )
      return;
    this.deletingDocumentIds.add(doc.documentId);

    this.requestService
      .DeleteOrganizationDocument(this.organizationId, doc.documentId)
      .subscribe({
        next: () => {
          this.deletingDocumentIds.delete(doc.documentId);
          this.snackbar.showSnackbarSuccess('Document deleted successfully.');
          this.documentDeleted.emit();
        },
        error: (err) => {
          this.deletingDocumentIds.delete(doc.documentId);
          this.snackbar.showSnackbarError('Delete failed. Please try again.');
          this.loggingService.logException(err, 3, {
            organizationId: this.organizationId,
            documentId: doc.documentId,
            methodName: 'deleteOfferorProfileDocument',
          });
        },
      });
  }

  downloadDocument(doc: OrganizationDocument): void {
    if (
      !doc.documentId ||
      !this.organizationId ||
      this.downloadingDocumentIds.has(doc.documentId)
    )
      return;
    this.downloadingDocumentIds.add(doc.documentId);

    this.requestService
      .GetAgencySpecificDocumentContent(doc.documentId, this.organizationId)
      .subscribe({
        next: (response) => {
          this.downloadingDocumentIds.delete(doc.documentId);

          const contentDisposition = response.headers.get(
            'Content-Disposition',
          );
          let fileName = doc.fileName ?? 'download';
          if (contentDisposition) {
            const match = contentDisposition.match(
              /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/,
            );
            if (match?.[1]) fileName = match[1].replace(/['"]/g, '');
          }

          const blob = new Blob([response.body!], {
            type: response.body!.type,
          });
          const url = URL.createObjectURL(blob);
          const anchor = document.createElement('a');
          anchor.href = url;
          anchor.download = fileName;
          anchor.click();
          URL.revokeObjectURL(url);
        },
        error: (err) => {
          this.downloadingDocumentIds.delete(doc.documentId);
          this.snackbar.showSnackbarError('Download failed. Please try again.');
          this.loggingService.logException(err, 3, {
            organizationId: this.organizationId,
            documentId: doc.documentId,
            methodName: 'downloadDocument',
          });
        },
      });
  }

  isDeleting(doc: OrganizationDocument): boolean {
    return this.deletingDocumentIds.has(doc.documentId);
  }

  isDownloading(doc: OrganizationDocument): boolean {
    return this.downloadingDocumentIds.has(doc.documentId);
  }

  onSubmit(): void {
    if (this.prohibitedForm.invalid) {
      this.prohibitedForm.markAllAsTouched();
      return;
    }

    const { ofacIdentification, ofacAdditional, prohibitedDetails } =
      this.prohibitedForm.value;

    const ofacIdentificationBool = ofacIdentification === 'yes';
    const ofacAdditionalBool =
      ofacAdditional === 'yes' ? true : ofacAdditional === 'no' ? false : null;

    const descriptionToSave =
      ofacIdentificationBool && ofacAdditional === 'yes'
        ? prohibitedDetails
        : null;

    const saveOrUpdate$ = this.savedOfferorProfileId
      ? this.offerorProfileService.UpdateOfferorProfileDetails(
          this.organizationId!,
          this.savedOfferorProfileId,
          8,
          descriptionToSave,
          ofacIdentificationBool,
          ofacAdditionalBool,
          null,
        )
      : this.offerorProfileService.SaveOfferorProfileDetails(
          this.organizationId!,
          8,
          descriptionToSave,
          ofacIdentificationBool,
          ofacAdditionalBool,
          null,
        );

    // Conditionally delete doc if user answered 'no'
    const uploadedDoc = this.getUploadedDoc(this.OFAC_DOCUMENT_CODE_NAME[0]);
    const deleteDoc$ =
      !ofacIdentificationBool && uploadedDoc && this.organizationId
        ? this.requestService.DeleteOrganizationDocument(
            this.organizationId,
            uploadedDoc.documentId,
          )
        : null;

    const requests$: Observable<any>[] = [
      saveOrUpdate$,
      ...(deleteDoc$ ? [deleteDoc$] : []),
    ];

    forkJoin(requests$).subscribe({
      next: ([saveRes]) => {
        this.savedOfferorProfileId = saveRes.offerorProfileId;
        if (deleteDoc$) this.documentDeleted.emit();

        // Clear dependent fields if user answered 'no' to OFAC identification
        if (!ofacIdentificationBool) {
          this.prohibitedForm.get('ofacAdditional')?.reset();
          this.prohibitedForm.get('prohibitedDetails')?.reset();
        } else if (ofacAdditional !== 'yes') {
          this.prohibitedForm.get('prohibitedDetails')?.reset();
        }

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
    const maxSize = 20 * 1024 * 1024;

    if (!allowedTypes.includes(file.type)) {
      this.snackbar.showSnackbarError(
        'Invalid file type. Only JPG, PNG, and PDF are allowed.',
      );
      return;
    }

    if (file.size > maxSize) {
      this.snackbar.showSnackbarError('File exceeds the 20MB size limit.');
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

    // mapId = documentTypeId
    const municipalityDocument = {
      documentName: docType.codeName,
      codeId: docType.codeId,
      mapId: docType.mapId,
    };

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
}
