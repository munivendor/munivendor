import {
  Component,
  EventEmitter,
  Input,
  OnChanges,
  OnInit,
  Output,
  SimpleChanges,
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
import { MatTooltipModule } from '@angular/material/tooltip';
import { StateService } from '../../../Request/services/state.service';
import { LoggingService } from '../../../exceptionhandling/logging.service';
import { SnackbarNotificationService } from '../../../shared/service/snackbar-notification.service';
import { RequestService } from '../../../Request/services/request.service';
import { OrganizationDocument } from '../../model/organization-document.model';
import { DocumentType } from '../../model/document-type.model';

@Component({
  selector: 'app-required-compliance-forms',
  standalone: true,
  encapsulation: ViewEncapsulation.None,
  templateUrl: './required-compliance-forms.component.html',
  styleUrls: ['./required-compliance-forms.component.css'],
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatSelectModule,
    MatProgressSpinnerModule,
    MatIconModule,
    MatTooltipModule,
  ],
})
export class ComplianceDocumentsComponent implements OnInit, OnChanges {
  complianceForm!: FormGroup;

  organizationId: number | null = null;
  isUploading = false;
  selectedFileName: string | null = null;
  isDragOver = false;
  deletingDocumentIds = new Set<number>();
  downloadingDocumentIds = new Set<number>();

  private readonly OWNED_CODE_NAMES = [
    'Letter of Federal_Affirmative_Action_Plan_Approval',
    'Certificate_of_Employee_Information_Report',
    'Employee_Information_Report_Form_AA-302',
  ];

  documentTypeMap: Record<string, string> = {
    FederalApproval: 'Letter of Federal Affirmative Action Plan Approval',
    Certificate: 'Certificate of Employee Information Report',
    AA302: 'Employee Information Report Form AA-302',
  };

  documentDescriptionMap: Record<string, string> = {
    FederalApproval:
      "Please upload your organization's Letter of Federal Affirmative Action Plan Approval.",
    Certificate:
      "Please upload your organization's Certificate of Employee Information Report.",
    AA302:
      "Please upload your organization's Employee Information Report Form AA-302.",
  };

  @Input() uploadedDocuments: OrganizationDocument[] = [];
  @Input() documentTypes: DocumentType[] = [];
  @Output() documentUploaded = new EventEmitter<void>();
  @Output() documentDeleted = new EventEmitter<void>();

  get eeoOptions(): DocumentType[] {
    return this.documentTypes.filter((dt) =>
      this.OWNED_CODE_NAMES.includes(dt.codeName),
    );
  }

  get selectedDocumentType(): DocumentType | undefined {
    const selection = this.complianceForm?.get('eeoSelection')?.value;
    return selection
      ? this.documentTypes.find((dt) => dt.codeId === selection)
      : undefined;
  }

  getUploadedDoc(codeName: string): OrganizationDocument | undefined {
    return this.uploadedDocuments.find((d) => d.documentName === codeName);
  }

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

    this.complianceForm.get('eeoSelection')?.valueChanges.subscribe(() => {
      this.selectedFileName = null;
    });

    this.tryPreselect();
  }

  private buildForm(): void {
    this.complianceForm = this.fb.group({
      eeoSelection: [null, Validators.required],
    });
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    this.isDragOver = true;
  }

  onDragLeave(): void {
    this.isDragOver = false;
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    this.isDragOver = false;
    const file = event.dataTransfer?.files[0];
    if (file) this.processFile(file);
  }

  onFileSelected(event: any): void {
    const file: File = event.target.files[0];
    if (file) this.processFile(file);
    event.target.value = '';
  }

  private processFile(file: File): void {
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

    const docType = this.selectedDocumentType;
    if (!docType || !this.organizationId) return;

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

  clearFile(): void {
    this.selectedFileName = null;
  }

  isFieldInvalid(field: string): boolean {
    const control = this.complianceForm.get(field);
    return !!(control && control.invalid && (control.dirty || control.touched));
  }

  private preselectionDone = false;

  ngOnChanges(changes: SimpleChanges): void {
    if (this.preselectionDone) return;
    this.tryPreselect();
  }

  private tryPreselect(): void {
    // Guard: only proceed when both inputs have data AND the form exists
    if (
      !this.complianceForm ||
      !this.uploadedDocuments?.length ||
      !this.eeoOptions?.length
    )
      return;

    const matchedDoc = this.eeoOptions.find((opt) =>
      this.uploadedDocuments.some((d) => d.documentName === opt.codeName),
    );

    if (matchedDoc) {
      this.complianceForm.get('eeoSelection')?.setValue(matchedDoc.codeId, {
        emitEvent: false,
      });
    }

    this.preselectionDone = true;
  }
}
