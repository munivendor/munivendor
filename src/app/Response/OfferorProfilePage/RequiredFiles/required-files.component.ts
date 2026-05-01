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

  @Input() uploadedDocuments: OrganizationDocument[] = [];
  @Input() documentTypes: DocumentType[] = [];
  @Output() documentUploaded = new EventEmitter<void>();

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

    this.fileStates[fileConfig.key].selectedFileName = file.name;
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
          this.fileStates[fileConfig.key].selectedFileName = null;
          this.snackbar.showSnackbarError('Upload failed. Please try again.');
          this.loggingService.logException(err, 3, {
            organizationId: this.organizationId,
            documentKey: fileConfig.key,
            methodName: 'processFile',
          });
        },
      });
  }

  clearFile(key: string): void {
    this.fileStates[key].selectedFileName = null;
  }

  isUploading(key: string): boolean {
    return this.fileStates[key]?.isUploading ?? false;
  }

  getFileName(key: string): string | null {
    return this.fileStates[key]?.selectedFileName ?? null;
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
}
