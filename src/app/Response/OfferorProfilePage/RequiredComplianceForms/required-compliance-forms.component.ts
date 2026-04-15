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
  ],
})
export class ComplianceDocumentsComponent implements OnInit, OnChanges {
  complianceForm!: FormGroup;

  organizationId: number | null = null;
  isUploading = false;
  selectedFileName: string | null = null;
  isDragOver = false;

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

    // Wait until both inputs have data before attempting pre-selection
    if (this.uploadedDocuments.length && this.eeoOptions.length) {
      this.preselectIfUploaded();
      this.preselectionDone = true;
    }
  }

  private preselectIfUploaded(): void {
    // find the first EEO option that has already been uploaded
    const matchedDoc = this.eeoOptions.find((opt) =>
      this.uploadedDocuments.some((d) => d.documentName === opt.codeName),
    );

    if (matchedDoc) {
      this.complianceForm.get('eeoSelection')?.setValue(matchedDoc.codeId, {
        emitEvent: false,
      });

      // pre-populate the file name display from the uploaded doc
      const uploaded = this.uploadedDocuments.find(
        (d) => d.documentName === matchedDoc.codeName,
      );
      if (uploaded) {
        this.selectedFileName = uploaded.fileName;
      }
    }
  }
}
