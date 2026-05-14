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
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';

import { StateService } from '../../../Request/services/state.service';
import { LoggingService } from '../../../exceptionhandling/logging.service';
import { SnackbarNotificationService } from '../../../shared/service/snackbar-notification.service';
import { RequestService } from '../../../Request/services/request.service';
import { OrganizationDocument } from '../../model/organization-document.model';
import { OfferorProfileService } from '../../services/offeror-profile.service';
import { DocumentType } from '../../model/document-type.model';
import { Observable, forkJoin } from 'rxjs';

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
    MatButtonModule,
    MatTooltipModule,
  ],
})
export class ProhibitedActivitiesIranComponent implements OnInit, OnChanges {
  iranForm!: FormGroup;

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
    formTypeId: number; // mapId
    details: string;
  }[] = [];
  @Output() detailsSaved = new EventEmitter<void>();

  readonly IRAN_DOCUMENT_CODE_NAME = 'Disclosure_of_Iran_Investments';

  chapter25Options = [
    {
      value: 'yes',
      label: 'Yes, I certify that we DO NOT conduct any business in Iran.',
    },
    {
      value: 'no',
      label: 'No, I cannot certify. We DO conduct business in Iran.',
    },
  ];

  @Input() uploadedDocuments: OrganizationDocument[] = [];
  @Input() documentTypes: DocumentType[] = [];
  @Output() documentUploaded = new EventEmitter<void>();
  @Output() documentDeleted = new EventEmitter<void>();
  @Output() detailsDeleted = new EventEmitter<void>();

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

    this.applyProfileDetails();
  }

  ngOnChanges(): void {
    this.applyProfileDetails();
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

  private applyProfileDetails(): void {
    if (!this.iranForm) return;
    if (this.deletionJustOccurred) {
      this.deletionJustOccurred = false;
      return;
    }
    // Before: mapId = documentTypeId for Iran details is 7 (per backend)
    // Fix: mapId = formTypeId (mapId=7 for Iran), not documentTypeId
    const matches = this.profileDetails.filter((d) => d.formTypeId === 7);
    const match = matches.length
      ? matches.reduce((a, b) =>
          a.offerorProfileId > b.offerorProfileId ? a : b,
        )
      : null;

    const hasUploadedDoc = this.uploadedDocuments.some(
      (d) => d.documentName === this.IRAN_DOCUMENT_CODE_NAME,
    );

    if (match?.details) {
      this.savedOfferorProfileId = match.offerorProfileId;
      this.iranForm.patchValue({
        chapter25Identification: 'no',
      });

      setTimeout(() => {
        this.iranForm.patchValue({
          iranDescription: match.details,
        });
      }, 0);
    } else if (hasUploadedDoc) {
      this.iranForm.patchValue({
        chapter25Identification: 'no',
      });
    }
  }

  onFileSelected(event: any): void {
    const file: File = event.target.files[0];
    if (file) this.processFile(file);
  }

  getDocumentType(codeName: string): DocumentType | undefined {
    return this.documentTypes.find((dt) => dt.codeName === codeName);
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

    const { chapter25Identification, iranDescription } = this.iranForm.value;

    // User says NOT associated — delete file (if exists) and details (if exists)
    if (chapter25Identification === 'yes') {
      const uploadedDoc = this.getUploadedDoc(this.IRAN_DOCUMENT_CODE_NAME);
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
            7,
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

          this.iranForm.reset({ chapter25Identification: 'yes' });

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

    // User IS associated — save textarea details
    if (!iranDescription || !this.organizationId) return;

    const request$ = this.savedOfferorProfileId
      ? this.offerorProfileService.UpdateOfferorProfileDetails(
          this.organizationId,
          this.savedOfferorProfileId,
          7,
          iranDescription,
        )
      : this.offerorProfileService.SaveOfferorProfileDetails(
          this.organizationId,
          7,
          iranDescription,
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

    const docType = this.getDocumentType(this.IRAN_DOCUMENT_CODE_NAME);
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
}
