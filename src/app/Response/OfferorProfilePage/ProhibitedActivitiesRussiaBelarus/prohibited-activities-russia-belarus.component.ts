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
    details: string;
  }[] = [];
  @Output() detailsSaved = new EventEmitter<void>();
  @Output() detailsDeleted = new EventEmitter<void>();

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

    this.applyProfileDetails();
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
    if (!this.prohibitedForm) return;
    if (this.deletionJustOccurred) {
      this.deletionJustOccurred = false;
      return;
    }
    // // Before: mapId = documentTypeId for Russia/Belarus details is 8 (per backend)
    // Fix: mapId = formTypeId (mapId=7 for Iran), not documentTypeId
    const matches = this.profileDetails.filter((d) => d.formTypeId === 8);
    const match = matches.length
      ? matches.reduce((a, b) =>
          a.offerorProfileId > b.offerorProfileId ? a : b,
        )
      : null;

    const hasUploadedDoc = this.uploadedDocuments.some(
      (d) => d.documentName === this.OFAC_DOCUMENT_CODE_NAME[0],
    );

    if (match?.details) {
      this.savedOfferorProfileId = match.offerorProfileId;
      this.prohibitedForm.patchValue({
        ofacIdentification: 'yes',
        ofacAdditional: 'yes',
      });

      setTimeout(() => {
        this.prohibitedForm.patchValue({
          ofacDescription: match.details,
        });
      }, 0);
    } else if (hasUploadedDoc) {
      this.prohibitedForm.patchValue({
        ofacIdentification: 'yes',
      });
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

    const { ofacIdentification, ofacAdditional, ofacDescription } =
      this.prohibitedForm.value;

    // User says NOT associated — delete file (if exists) and details (if exists)
    if (ofacIdentification === 'no') {
      const uploadedDoc = this.getUploadedDoc(this.OFAC_DOCUMENT_CODE_NAME[0]);
      const deleteDoc$ =
        uploadedDoc && this.organizationId
          ? this.requestService.DeleteOrganizationDocument(
              this.organizationId,
              uploadedDoc.documentId,
            )
          : null;
      const deleteDetails$ = this.savedOfferorProfileId
        ? this.offerorProfileService.DeleteOfferorProfileDetails(
            this.organizationId!,
            8,
          )
        : null;

      if (!deleteDoc$ && !deleteDetails$) {
        this.snackbar.showSnackbarSuccess('Changes saved successfully.');
        return;
      }

      const deletes: Observable<void>[] = [
        ...(deleteDoc$ ? [deleteDoc$] : []),
        ...(deleteDetails$ ? [deleteDetails$] : []),
      ];

      forkJoin(deletes).subscribe({
        next: () => {
          this.savedOfferorProfileId = null;
          this.selectedFileName = null;
          this.deletionJustOccurred = true;
          this.prohibitedForm.reset({ ofacIdentification: 'no' });
          this.snackbar.showSnackbarSuccess('Changes saved successfully.');
          if (deleteDoc$) this.documentDeleted.emit();
          if (deleteDetails$) this.detailsDeleted.emit();
        },
        error: (err) => {
          this.snackbar.showSnackbarError(
            'Failed to save changes. Please try again.',
          );
          this.loggingService.logException(err, 3, {
            organizationId: this.organizationId,
            methodName: 'onSubmit - delete',
          });
        },
      });
      return;
    }

    // User is associated but activity is NOT consistent — delete textarea details only
    if (ofacIdentification === 'yes' && ofacAdditional === 'no') {
      if (!this.savedOfferorProfileId) {
        this.snackbar.showSnackbarSuccess('Changes saved successfully.');
        return;
      }

      this.offerorProfileService
        .DeleteOfferorProfileDetails(this.organizationId!, 8)
        .subscribe({
          next: () => {
            this.savedOfferorProfileId = null;
            this.detailsDeleted.emit();
            this.snackbar.showSnackbarSuccess('Changes saved successfully.');
          },
          error: (err) => {
            this.snackbar.showSnackbarError(
              'Failed to save changes. Please try again.',
            );
            this.loggingService.logException(err, 3, {
              organizationId: this.organizationId,
              methodName: 'onSubmit - deleteDetails',
            });
          },
        });
      return;
    }

    // User is associated and activity IS consistent — save textarea details
    if (!ofacDescription || !this.organizationId) return;

    const request$ = this.savedOfferorProfileId
      ? this.offerorProfileService.UpdateOfferorProfileDetails(
          this.organizationId,
          this.savedOfferorProfileId,
          8,
          ofacDescription,
        )
      : this.offerorProfileService.SaveOfferorProfileDetails(
          this.organizationId,
          8,
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
