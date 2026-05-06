import {
  Component,
  EventEmitter,
  Input,
  OnInit,
  Output,
  ViewEncapsulation,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';

import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatIconModule } from '@angular/material/icon';

import { StateService } from '../../../Request/services/state.service';
import { LoggingService } from '../../../exceptionhandling/logging.service';
import { SnackbarNotificationService } from '../../../shared/service/snackbar-notification.service';
import { RequestService } from '../../../Request/services/request.service';
import { OrganizationDocument } from '../../model/organization-document.model';
import { DocumentType } from '../../model/document-type.model';

export interface RequiredFileConfig {
  key: string;
  label: string;
  required: boolean;
  description?: string;
  documentName: string;
}

@Component({
  selector: 'app-required-files',
  standalone: true,
  encapsulation: ViewEncapsulation.None,
  templateUrl: './required-files.component.html',
  styleUrls: ['./required-files.component.css'],
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatProgressSpinnerModule,
    MatIconModule,
  ],
})
export class RequiredFilesComponent implements OnInit {
  organizationId: number | null = null;

  private readonly OWNED_CODE_NAMES = [
    'Business_Registration_Certification',
    'W-9',
    'Insurance_Policy',
  ];

  requiredFiles: RequiredFileConfig[] = [
    {
      key: 'businessRegistration',
      label: 'Business Registration Certificate',
      required: true,
      description:
        'Pursuant to N.J.S.A. 52:32-44, local government organizations are prohibited from entering into a contract with an entity unless the bidder/proposer/contractor, and each subcontractor that is required by law to be named in a bid/proposal/contract has a valid Business Registration Certificate on file with the Division of Revenue and Enterprise Services within the Department of the Treasury.',
      documentName: 'Business_Registration_Certification',
    },
    {
      key: 'w9',
      label: 'W-9',
      required: false,
      documentName: 'W-9',
    },
    {
      key: 'insurancePolicies',
      label: 'Insurance Policy',
      required: false,
      documentName: 'Insurance_Policy',
    },
  ];

  fileStates: Record<
    string,
    { selectedFileName: string | null; isUploading: boolean }
  > = {};

  insuranceUploading = false;
  deletingDocumentIds = new Set<number>();
  downloadingDocumentIds = new Set<number>();

  @Input() uploadedDocuments: OrganizationDocument[] = [];
  @Input() documentTypes: DocumentType[] = [];
  @Output() documentUploaded = new EventEmitter<void>();
  @Output() documentDeleted = new EventEmitter<void>();

  constructor(
    private stateService: StateService,
    private loggingService: LoggingService,
    private snackbar: SnackbarNotificationService,
    private requestService: RequestService,
  ) {}

  ngOnInit(): void {
    this.organizationId = this.stateService.getOrganizationId();
    this.requiredFiles.forEach((f) => {
      this.fileStates[f.key] = { selectedFileName: null, isUploading: false };
    });
  }

  onFileSelected(event: any, fileConfig: RequiredFileConfig): void {
    const file: File = event.target.files[0];
    if (file) this.processFile(file, fileConfig);
    event.target.value = '';
  }

  onInsuranceFilesSelected(event: any): void {
    const files: FileList = event.target.files;
    if (!files?.length) return;
    Array.from(files).forEach((file) => this.processInsuranceFile(file));
    event.target.value = '';
  }

  private processFile(file: File, fileConfig: RequiredFileConfig): void {
    const allowedTypes = ['image/jpeg', 'image/png', 'application/pdf'];
    const maxSize = 10 * 1024 * 1024;

    if (!allowedTypes.includes(file.type)) {
      this.snackbar.showSnackbarError(
        'Invalid file type. Only JPG, PNG, and PDF are allowed.',
      );
      return;
    }

    if (file.size > maxSize) {
      this.snackbar.showSnackbarError('File exceeds the 10MB size limit.');
      return;
    }

    if (!this.organizationId) return;

    const docType = this.getDocumentType(fileConfig.documentName);
    if (!docType) {
      this.snackbar.showSnackbarError(
        'Document type not recognized. Please try again.',
      );
      return;
    }

    this.fileStates[fileConfig.key].isUploading = true;

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
          this.fileStates[fileConfig.key].isUploading = false;
          this.snackbar.showSnackbarSuccess('Document uploaded successfully.');
          this.documentUploaded.emit();
        },
        error: (err) => {
          this.fileStates[fileConfig.key].isUploading = false;
          this.snackbar.showSnackbarError('Upload failed. Please try again.');
          this.loggingService.logException(err, 3, {
            organizationId: this.organizationId,
            documentKey: fileConfig.key,
            methodName: 'processFile',
          });
        },
      });
  }

  private processInsuranceFile(file: File): void {
    const allowedTypes = ['image/jpeg', 'image/png', 'application/pdf'];
    const maxSize = 10 * 1024 * 1024;

    if (!allowedTypes.includes(file.type)) {
      this.snackbar.showSnackbarError(
        'Invalid file type. Only JPG, PNG, and PDF are allowed.',
      );
      return;
    }

    if (file.size > maxSize) {
      this.snackbar.showSnackbarError('File exceeds the 10MB size limit.');
      return;
    }

    if (!this.organizationId) return;

    const docType = this.getDocumentType('Insurance_Policy');
    if (!docType) {
      this.snackbar.showSnackbarError(
        'Document type not recognized. Please try again.',
      );
      return;
    }

    this.insuranceUploading = true;

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
          this.insuranceUploading = false;
          this.snackbar.showSnackbarSuccess('Document uploaded successfully.');
          this.documentUploaded.emit();
        },
        error: (err) => {
          this.insuranceUploading = false;
          this.snackbar.showSnackbarError('Upload failed. Please try again.');
          this.loggingService.logException(err, 3, {
            organizationId: this.organizationId,
            methodName: 'processInsuranceFile',
          });
        },
      });
  }

  downloadDocument(doc: OrganizationDocument): void {
    if (
      !doc.organizationDocumentId ||
      !this.organizationId ||
      this.downloadingDocumentIds.has(doc.organizationDocumentId)
    )
      return;
    this.downloadingDocumentIds.add(doc.organizationDocumentId);

    this.requestService
      .GetAgencySpecificDocumentContent(
        doc.organizationDocumentId,
        this.organizationId,
      )
      .subscribe({
        next: (response) => {
          this.downloadingDocumentIds.delete(doc.organizationDocumentId);

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
          this.downloadingDocumentIds.delete(doc.organizationDocumentId);
          this.snackbar.showSnackbarError('Download failed. Please try again.');
          this.loggingService.logException(err, 3, {
            organizationId: this.organizationId,
            organizationDocumentId: doc.organizationDocumentId,
            methodName: 'downloadDocument',
          });
        },
      });
  }

  isDownloading(doc: OrganizationDocument): boolean {
    return this.downloadingDocumentIds.has(doc.organizationDocumentId);
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

  isDeleting(doc: OrganizationDocument): boolean {
    return this.deletingDocumentIds.has(doc.documentId);
  }

  isUploading(key: string): boolean {
    return this.fileStates[key]?.isUploading ?? false;
  }

  get sectionDocumentTypes(): DocumentType[] {
    return this.documentTypes.filter((dt) =>
      this.OWNED_CODE_NAMES.includes(dt.codeName),
    );
  }

  getDocumentType(codeName: string): DocumentType | undefined {
    return this.documentTypes.find((dt) => dt.codeName === codeName);
  }

  getUploadedDoc(codeName: string): OrganizationDocument | undefined {
    return this.uploadedDocuments.find((d) => d.documentName === codeName);
  }

  getUploadedDocs(codeName: string): OrganizationDocument[] {
    return this.uploadedDocuments.filter((d) => d.documentName === codeName);
  }
}
