import {
  Component,
  Input,
  OnInit,
  ViewChild,
  ElementRef,
  Output,
  EventEmitter,
  AfterViewInit,
  OnDestroy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTableModule, MatTableDataSource } from '@angular/material/table';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import {
  MatSlideToggleModule,
  MatSlideToggleChange,
} from '@angular/material/slide-toggle';
import { RouterModule } from '@angular/router';
import { RequestService } from '../Request/services/request.service';
import { takeUntil, Subject } from 'rxjs';
import { FileUploadDialogComponent } from '../file-upload-dialog/file-upload-dialog.component';
import { MatDialog } from '@angular/material/dialog';
import {
  FormGroup,
  FormArray,
  FormBuilder,
  ReactiveFormsModule,
} from '@angular/forms';
import { StateService } from '../Request/services/state.service';
import {
  DocumentService,
  DocumentResponseType,
} from '../shared/service/document.service';
import { TooltipDirective } from '../shared/directive/tooltip.directive';
import { Router } from '@angular/router';
import { LoggingService } from '../exceptionhandling/logging.service';
import { LoadingService } from '../shared/LoadingSpinner/loading.service';
import { SnackbarNotificationService } from '../shared/service/snackbar-notification.service';
import { FeatureFlagService } from '../shared/service/feature-flag.service';
import { MatSort, MatSortModule } from '@angular/material/sort';
import { SplitCamelCasePipe } from '../shared/pipes/split-camel-case.pipe';

type ResponseMethod = 'manual' | 'autofill' | null;
type DocumentSource = 'notarizationNotRequired' | 'notarizationRequired';

// Documents that don't support MV Autofill AI (e.g. no autofillable
// template exists), so the Response Method select and the Autofill button
// must stay disabled for them regardless of the document's other state.
const AUTOFILL_DISABLED_DOCUMENT_NAMES = [
  'Americans with Disabilities Act of 1990',
  'Non Collusion Affidavit',
  'Stockholder Disclosure Certification',
  'Mandatory Affirmative Action Language for Goods and Services - Professional Services Contracts',
  'Ownership Disclosure Statement',
  'W-9',
  'Business Registration Certificate',
  'Bid Document Checklist',
  'C. 271 Political Contribution Disclosure Form',
  'Consent of Surety',
  'Equipment Certification',
  'Public Works Contractor Registration',
  'Request for Prevailing Wage Determination',
];

// Backend feature flag (Microsoft.FeatureManagement) that kill-switches MV
// Autofill AI everywhere in the response documents workflow. Flip this on in
// prod if autofill misbehaves after a staging-only rollout, without needing a
// redeploy.
const DISABLE_AUTOFILL_FEATURE_FLAG = 'DisableAutoFill';

@Component({
  selector: 'response-documents',
  standalone: true,
  imports: [
    CommonModule,
    MatTableModule,
    MatCardModule,
    MatIconModule,
    MatButtonModule,
    MatTooltipModule,
    MatFormFieldModule,
    MatSelectModule,
    MatSlideToggleModule,
    RouterModule,
    ReactiveFormsModule,
    TooltipDirective,
    MatSortModule,
    SplitCamelCasePipe,
  ],
  templateUrl: './response-documents.component.html',
  styleUrls: ['./response-documents.component.css'],
})
export class ResponseDocumentsComponent
  implements OnInit, AfterViewInit, OnDestroy
{
  @Output() autoFillStatusChange = new EventEmitter<boolean>();
  @Input() responseIdParam?: string | null | undefined;
  @ViewChild('fileInput') fileInput!: ElementRef<HTMLInputElement>;
  @ViewChild('requiredSort') requiredSort!: MatSort;
  @ViewChild('notarizationSort') notarizationSort!: MatSort;
  @ViewChild('offerorSort') offerorSort!: MatSort;
  authorizingOfficialTooltip: any;

  // Tooltip shown next to the yellow warning triangle when MV Autofill AI
  // detects that a form still has empty fields.
  incompleteFieldsTooltip = {
    header: 'Incomplete Fields in Form',
    body: "The MV Autofill AI has detected that this form still has empty fields. MuniVendor's Autofill AI Engine automatically copies content from your Offeror Profile and deposits that content into the corresponding fields in these forms. Please complete your Offeror Profile, and then when you continue with this offer/response, click on the MV Autofill AI button again.",
    width: '500px',
    showCloseButton: false,
    showActionButton: false,
  };

  private readonly agencyDocumentsColumnsBase: string[] = [
    'formName',
    'responseMethod',
    'manualUpload',
    'mvAutofillAi',
    'action',
    'documentInstanceStatus',
  ];

  private readonly notarizationRequiredColumnsBase: string[] = [
    'formName',
    'mvAutofillAi',
    'completeUpload',
    'action',
    'documentInstanceStatus',
  ];

  // While DisableAutoFill is on, the Response Method and MV Autofill AI
  // columns are dropped from both tables entirely and the workflow falls
  // back to manual upload only.
  get agencyDocumentsColumns(): string[] {
    return this.autofillDisabled
      ? this.agencyDocumentsColumnsBase.filter(
          (col) => col !== 'responseMethod' && col !== 'mvAutofillAi',
        )
      : this.agencyDocumentsColumnsBase;
  }

  get notarizationRequiredColumns(): string[] {
    return this.autofillDisabled
      ? this.notarizationRequiredColumnsBase.filter(
          (col) => col !== 'mvAutofillAi',
        )
      : this.notarizationRequiredColumnsBase;
  }

  offerorDocumentsColumns: string[] = [
    'formName',
    'source',
    'download',
    'delete',
  ];

  responseMethodOptions: { value: ResponseMethod; label: string }[] = [
    { value: 'manual', label: 'Manual' },
    { value: 'autofill', label: 'Autofill' },
  ];

  requiredDocumentsDatasource = new MatTableDataSource<any>([]);
  notarizationRequiredDocumentsDatasource = new MatTableDataSource<any>([]);
  offerorDocumentsDatasource = new MatTableDataSource<any>([]);
  offerorOptionalDocuments: any[] = [];

  offerorDocuments: any[] = [];
  requestId?: number;
  // Set from the DisableAutoFill feature flag before documents are loaded.
  // While true, Autofill is hidden/disabled everywhere and Manual Upload is
  // always available.
  autofillDisabled = false;
  responseDocumentsFormGroup!: FormGroup;
  responseIdFromStateService = this.stateService.getRequestId();
  private destroy$ = new Subject<void>();
  private currentRow: any;
  currentSource: DocumentSource | null = null;

  constructor(
    private requestService: RequestService,
    public dialog: MatDialog,
    private fb: FormBuilder,
    private stateService: StateService,
    private documentService: DocumentService,
    private router: Router,
    private loggingService: LoggingService,
    private loadingService: LoadingService,
    private snackbarNotificationService: SnackbarNotificationService,
    private featureFlagService: FeatureFlagService,
  ) {}

  ngOnInit(): void {
    this.initializeFormGroup();
    this.loadingService.show();

    // Resolve the feature flag before loading documents so the initial
    // responseMethod values (and the columns rendered) already reflect
    // whether autofill is disabled, instead of flipping after first paint.
    this.featureFlagService
      .isEnabled(DISABLE_AUTOFILL_FEATURE_FLAG)
      .subscribe((disabled) => {
        this.autofillDisabled = disabled;
        this.initializeDocuments();
        if (!disabled) {
          this.loadResponseMethodOptions();
        }
      });

    this.authorizingOfficialTooltip = {
      header: 'Incomplete',
      body: 'Incomplete means that you have not yet completed and approved this form.',
      showCloseButton: false,
      showActionButton: false,
      width: 'auto',
      transformStyle: 'translate(-103%, -48%)',
    };
  }

  ngAfterViewInit(): void {
    this.requiredDocumentsDatasource.sort = this.requiredSort;
    this.notarizationRequiredDocumentsDatasource.sort = this.notarizationSort;
    this.offerorDocumentsDatasource.sort = this.offerorSort;

    this.configureSortingAccessor(this.requiredDocumentsDatasource);
    this.configureSortingAccessor(this.notarizationRequiredDocumentsDatasource);
    this.configureSortingAccessor(this.offerorDocumentsDatasource);
  }

  private configureSortingAccessor(datasource: MatTableDataSource<any>): void {
    datasource.sortingDataAccessor = (item: any, sortHeaderId: string) => {
      switch (sortHeaderId) {
        case 'formName':
          return (item.documentName ?? item.formName ?? '').toLowerCase();
        case 'documentInstanceStatus':
          return this.getDocumentInstanceStatus(item).toLowerCase();
        default:
          return '';
      }
    };
  }

  getDocumentInstanceStatus(row: any): string {
    return row.approvalStatus === 'approve' && row.activeDocumentExists
      ? 'Complete'
      : 'Incomplete';
  }

  getApprovalDateLabel(row: any): string {
    return row.approvalStatus === 'approve' ? 'Approved On:' : 'Unapproved On:';
  }

  getApprovalDateValue(row: any): string | null {
    return row.approvalStatus === 'approve'
      ? row.lastApprovalDate
      : row.lastUnApprovalDate;
  }

  initializeDocuments(): void {
    const requestId = this.responseIdParam
      ? Number(this.responseIdParam)
      : this.responseIdFromStateService;

    this.requestService
      .GetRequestRequiredDocumentsById(Number(requestId))
      .subscribe({
        next: (response) => {
          const documents = response.documents || [];

          const requiredDocs = documents.filter(
            (doc: any) => doc.sourceRequestDocumentId !== null,
          );
          const offerorDocs = documents.filter(
            (doc: any) => doc.sourceRequestDocumentId === null,
          );

          const requiresNotarizationDocs = requiredDocs.filter(
            (doc: any) => doc.requiresNotarization,
          );
          const notRequiredNotarizationDocs = requiredDocs.filter(
            (doc: any) => !doc.requiresNotarization,
          );

          this.requiredDocumentsDatasource.data =
            notRequiredNotarizationDocs.map((doc: any) => ({
              ...doc,
              formName: doc.documentName,
              responseMethod: (doc.derived ||
              this.autofillDisabled ||
              this.isAutofillUnsupportedDocument(doc)
                ? 'manual'
                : this.mapDocumentSourceToResponseMethod(
                    doc.documentSource,
                  )) as ResponseMethod,
              manualUploadedOn:
                doc.documentSource === 'UserUpload'
                  ? this.toUtcIsoString(
                      doc.documentInstanceUserUploadLastUpdated,
                    )
                  : null,
              lastUpdated:
                doc.documentSource === 'Autofill'
                  ? this.toUtcIsoString(doc.documentInstanceAutoFillLastUpdated)
                  : null,
              hasIncompleteFields: doc.hasIncompleteFields ?? false,
              approvalStatus: doc.approved ? 'approve' : 'unapprove',
              lastApprovalDate: doc.lastApprovalDate
                ? this.toUtcIsoString(doc.lastApprovalDate)
                : null,
              lastUnApprovalDate: doc.lastUnApprovalDate
                ? this.toUtcIsoString(doc.lastUnApprovalDate)
                : null,
              activeDocumentExists: doc.activeDocumentExists ?? false,
            }));

          this.notarizationRequiredDocumentsDatasource.data =
            requiresNotarizationDocs.map((doc: any) => ({
              ...doc,
              formName: doc.documentName,
              hasIncompleteFields: doc.hasIncompleteFields ?? false,
              completeUploadedOn: this.toUtcIsoString(
                doc.documentInstanceUserUploadLastUpdated,
              ),
              lastUpdated: this.toUtcIsoString(
                doc.documentInstanceAutoFillLastUpdated,
              ),
              approvalStatus: doc.approved ? 'approve' : 'unapprove',
              lastApprovalDate: doc.lastApprovalDate
                ? this.toUtcIsoString(doc.lastApprovalDate)
                : null,
              lastUnApprovalDate: doc.lastUnApprovalDate
                ? this.toUtcIsoString(doc.lastUnApprovalDate)
                : null,
              activeDocumentExists: doc.activeDocumentExists ?? false,
            }));

          this.offerorDocuments = offerorDocs.map((doc: any) => ({ ...doc }));
          this.initializeFormArrayFromApiDocuments();
          this.updateCombinedDatasource();
          this.loadingService.hide();
        },
        error: (error) => {
          this.loadingService.hide();

          const correlationId = error?.error?.correlationId;
          this.loggingService.logException(
            new Error(`HTTP Error ${error.status}: ${error.statusText}`),
            3,
            {
              requestId: requestId,
              organizationId: this.stateService.getOrganizationId(),
              correlationId: correlationId,
              methodName: 'initializeDocuments',
              className: 'ResponseDocumentsComponent',
              operation: 'GetRequestRequiredDocumentsById',
              userId: this.stateService.getUserId(),
            },
          );

          if (error.status === 422) {
            return;
          }
        },
      });
  }

  initializeFormGroup(): void {
    this.responseDocumentsFormGroup = this.fb.group({
      optionalOfferorDocuments: this.fb.array([]),
      responseDocuments: this.fb.array([]),
    });
  }

  private initializeFormArrayFromApiDocuments(): void {
    while (this.optionalOfferorDocuments.length !== 0) {
      this.optionalOfferorDocuments.removeAt(0);
    }

    this.offerorDocuments.forEach((doc) => {
      const formGroup = this.fb.group({
        documentId: [doc.documentId || doc.requestDocumentId],
        requestDocumentId: [doc.requestDocumentId ?? null],
        documentName: [doc.documentName],
        documentSource: [doc.documentSource],
        documentRequired: [doc.documentRequired],
        selected: [doc.selected],
        requiresNotarization: [
          { value: doc.requiresNotarization || false, disabled: false },
        ],
      });
      this.optionalOfferorDocuments.push(formGroup);
    });
  }

  private loadResponseMethodOptions(): void {
    this.documentService.GetDocumentResponseTypes().subscribe({
      next: (types: DocumentResponseType[]) => {
        const options = (types || [])
          .map((type) => ({
            value: this.mapCodeNameToResponseMethod(type.codeName),
            label: type.codeName,
          }))
          .filter(
            (
              option,
            ): option is { value: 'manual' | 'autofill'; label: string } =>
              option.value !== null,
          );

        if (options.length > 0) {
          this.responseMethodOptions = options;
        }
      },
      error: (error) => {
        const correlationId = error?.error?.correlationId;
        this.loggingService.logException(
          new Error(`HTTP Error ${error.status}: ${error.statusText}`),
          3,
          {
            organizationId: this.stateService.getOrganizationId(),
            correlationId: correlationId,
            methodName: 'loadResponseMethodOptions',
            className: 'ResponseDocumentsComponent',
            operation: 'GetDocumentResponseTypes',
            userId: this.stateService.getUserId(),
          },
        );
      },
    });
  }

  private toUtcIsoString(dateString: string | null | undefined): string | null {
    if (!dateString) {
      return null;
    }
    return /[zZ]|[+-]\d{2}:\d{2}$/.test(dateString)
      ? dateString
      : `${dateString}Z`;
  }

  private mapDocumentSourceToResponseMethod(
    documentSource: string | null | undefined,
  ): ResponseMethod {
    switch (documentSource) {
      case 'UserUpload':
        return 'manual';
      case 'Autofill':
        return 'autofill';
      default:
        return null;
    }
  }

  private mapCodeNameToResponseMethod(codeName: string): ResponseMethod {
    switch ((codeName ?? '').trim().toLowerCase()) {
      case 'manual':
        return 'manual';
      case 'autofill':
        return 'autofill';
      default:
        return null;
    }
  }

  onResponseMethodChange(row: any, method: ResponseMethod): void {
    if (this.autofillDisabled) {
      return; // Response Method selection is disabled while autofill is off
    }
    if (row.approvalStatus === 'approve') {
      return; // method is locked once the form has been approved
    }
    if (row.derived) {
      return; // agency specific documents don't support autofill; always Manual
    }
    row.responseMethod = method;
  }

  isAutofillUnsupportedDocument(row: any): boolean {
    return AUTOFILL_DISABLED_DOCUMENT_NAMES.includes(row?.documentName);
  }

  isResponseMethodLocked(row: any): boolean {
    return (
      this.autofillDisabled ||
      row.approvalStatus === 'approve' ||
      !!row.derived ||
      this.isAutofillUnsupportedDocument(row)
    );
  }

  isManualUploadEnabled(row: any): boolean {
    if (this.autofillDisabled) {
      // Manual upload no longer depends on a Response Method selection;
      // it's the only workflow, so it's available whenever the form isn't
      // already approved.
      return row.approvalStatus !== 'approve';
    }
    return row.responseMethod === 'manual' && row.approvalStatus !== 'approve';
  }

  isStandardAutofillEnabled(row: any): boolean {
    if (this.autofillDisabled) {
      return false;
    }
    return (
      row.responseMethod === 'autofill' &&
      row.approvalStatus !== 'approve' &&
      !row.derived &&
      !this.isAutofillUnsupportedDocument(row)
    );
  }

  isNotarizationAutofillEnabled(row: any): boolean {
    if (this.autofillDisabled) {
      return false;
    }
    return (
      row.approvalStatus !== 'approve' &&
      !row.completeUploadedOn &&
      !this.isAutofillUnsupportedDocument(row)
    );
  }

  isNotarizedUploadEnabled(row: any): boolean {
    return row.approvalStatus !== 'approve';
  }

  isStandardApprovalEnabled(row: any): boolean {
    if (row.approvalStatus === 'approve') {
      return true;
    }
    return !!(
      row.activeDocumentExists ||
      row.manualUploadedOn ||
      row.lastUpdated
    );
  }

  isNotarizationApprovalEnabled(row: any): boolean {
    return row.approvalStatus === 'approve' || !!row.completeUploadedOn;
  }

  isResetEnabled(row: any): boolean {
    return row.approvalStatus !== 'approve' && !!row.activeDocumentExists;
  }

  isNotarizationResetEnabled(row: any): boolean {
    return (
      row.approvalStatus !== 'approve' &&
      !!(row.lastUpdated || row.completeUploadedOn)
    );
  }

  private clearStaleInstanceFields(row: any): void {
    row.hasIncompleteFields = false;
    row.approvalStatus = 'unapprove';
    row.lastApprovalDate = null;
  }

  onUploadClick(row: any, source: DocumentSource): void {
    this.currentRow = row;
    this.currentSource = source;
    this.fileInput.nativeElement.click();
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    const requestId = this.responseIdParam
      ? Number(this.responseIdParam)
      : this.responseIdFromStateService;

    if (file && this.currentRow) {
      const allowedTypes = ['application/pdf', 'image/jpeg', 'image/jpg'];
      const allowedExtensions = ['.pdf', '.jpg', '.jpeg'];
      const fileExtension = file.name
        .toLowerCase()
        .substring(file.name.lastIndexOf('.'));

      if (
        !allowedTypes.includes(file.type) &&
        !allowedExtensions.includes(fileExtension)
      ) {
        this.snackbarNotificationService.showSnackbarError(
          'Invalid file type. Only PDF and JPG/JPEG files are allowed.',
        );
        input.value = '';
        return;
      }

      this.loadingService.show('Uploading...');

      this.documentService
        .UploadDocumentInstance(
          Number(requestId),
          this.currentRow.requestDocumentId,
          file,
        )
        .subscribe({
          next: () => {
            this.loadingService.hide();
            if (this.currentRow?.requestDocumentId) {
              const now = new Date().toISOString();

              this.clearStaleInstanceFields(this.currentRow);

              if (this.currentSource === 'notarizationRequired') {
                this.currentRow.completeUploadedOn = now;
              } else {
                this.currentRow.manualUploadedOn = now;
                this.currentRow.lastUpdated = null;
                this.currentRow.documentInstanceAutoFillLastUpdated = null;
              }
              this.currentRow.documentSourceId = 2; // user / manual upload
              this.currentRow.documentSource = 'UserUpload';
              this.currentRow.documentInstanceUserUploadLastUpdated = now;
              this.currentRow.derived = false;
              this.currentRow.activeDocumentExists = true;

              this.snackbarNotificationService.showSnackbarSuccess(
                'Document uploaded successfully.',
              );
            }
            input.value = '';
          },
          error: (error) => {
            this.loadingService.hide();

            const correlationId = error?.error?.correlationId;
            this.loggingService.logException(
              new Error(`HTTP Error ${error.status}: ${error.statusText}`),
              3,
              {
                requestId: requestId,
                sourceRequestDocumentId: this.currentRow.requestDocumentId,
                organizationId: this.stateService.getOrganizationId(),
                correlationId: correlationId,
                methodName: 'onFileSelected',
                className: 'ResponseDocumentsComponent',
                operation: 'UploadDocumentInstance',
                userId: this.stateService.getUserId(),
                fileSize: file.size,
              },
            );
            input.value = '';
          },
        });
    } else {
      input.value = '';
    }
  }

  getStatusLabel(statusId?: number): string {
    switch (statusId) {
      case 1:
        return 'Incomplete';
      case 2:
        return 'Complete';
      default:
        return 'Unknown';
    }
  }

  get optionalOfferorDocuments(): FormArray {
    return this.responseDocumentsFormGroup.get(
      'optionalOfferorDocuments',
    ) as FormArray;
  }

  onAutofillClick(row: any, source: DocumentSource): void {
    if (this.autofillDisabled) {
      return; // defense in depth; the Autofill column is removed from the UI
    }

    const offerId = this.responseIdParam
      ? Number(this.responseIdParam)
      : this.responseIdFromStateService;

    const requestDocumentId = row.requestDocumentId;
    const documentId = row.documentId;

    if (!offerId || !requestDocumentId || !documentId) {
      console.error('Missing required parameters for autofill.');
      return;
    }

    this.loadingService.show('Autofilling...');

    this.documentService
      .AutofillDocument(Number(offerId), requestDocumentId, documentId)
      .subscribe({
        next: (httpResponse: any) => {
          this.loadingService.hide();

          this.clearStaleInstanceFields(row);

          const response = httpResponse?.body;
          // 206 Partial Content = the document was autofilled but some
          // fields could not be filled in (e.g. an incomplete Offeror
          // Profile), independent of whatever the body reports.
          // const isPartial = httpResponse?.status === 206;

          const now = new Date().toISOString();
          row.lastUpdated = now;
          row.documentSourceId = 1; // autofill

          row.documentSource = 'Autofill';
          row.documentInstanceAutoFillLastUpdated = now;
          if (source !== 'notarizationRequired') {
            row.manualUploadedOn = null;
            row.documentInstanceUserUploadLastUpdated = null;
          }
          // Show the yellow warning triangle when the autofill engine reports
          // empty fields.
          // row.hasIncompleteFields =
          //   isPartial ||
          //   (response?.hasIncompleteFields ??
          //     (Array.isArray(response?.incompleteFields)
          //       ? response.incompleteFields.length > 0
          //       : false));
          row.activeDocumentExists = true;

          // if (isPartial) {
          //   this.snackbarNotificationService.showSnackbarWarning(
          //     'Document was partially autofilled.',
          //   );
          // } else {
          this.snackbarNotificationService.showSnackbarSuccess(
            'Document autofilled successfully.',
          );
          // }
        },
        error: (error) => {
          this.loadingService.hide();

          const correlationId = error?.error?.correlationId;
          this.loggingService.logException(
            new Error(`HTTP Error ${error.status}: ${error.statusText}`),
            3,
            {
              requestId: offerId,
              requestDocumentId: requestDocumentId,
              documentId: documentId,
              organizationId: this.stateService.getOrganizationId(),
              correlationId: correlationId,
              methodName: 'onAutofillClick',
              className: 'ResponseDocumentsComponent',
              operation: 'AutofillDocument',
              userId: this.stateService.getUserId(),
            },
          );

          this.snackbarNotificationService.showSnackbarError(
            'Unable to autofill this document. Please try again.',
          );
        },
      });
  }

  onApprovalToggleChange(
    row: any,
    event: MatSlideToggleChange,
    source: DocumentSource,
  ): void {
    const approved = event.checked;
    const requestDocumentId = row.requestDocumentId;

    if (!requestDocumentId) {
      console.error('Request Document ID is not available.');
      event.source.checked = !approved;
      return;
    }

    this.loadingService.show('Saving...');

    this.documentService
      .UpdateRequestDocumentApproval(requestDocumentId, approved)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.loadingService.hide();

          if (!response.isSuccess) {
            event.source.checked = !approved;
            this.snackbarNotificationService.showSnackbarError(
              'Unable to update approval status. Please try again.',
            );
            return;
          }

          const now = new Date().toISOString();
          row.approvalStatus = approved ? 'approve' : 'unapprove';
          if (approved) {
            row.lastApprovalDate = now;
          } else {
            row.lastUnApprovalDate = now;
          }
        },
        error: (error) => {
          this.loadingService.hide();
          event.source.checked = !approved;

          const correlationId = error?.error?.correlationId;
          this.loggingService.logException(
            new Error(`HTTP Error ${error.status}: ${error.statusText}`),
            3,
            {
              requestId:
                this.responseIdParam ?? this.responseIdFromStateService,
              requestDocumentId: requestDocumentId,
              organizationId: this.stateService.getOrganizationId(),
              correlationId: correlationId,
              methodName: 'onApprovalToggleChange',
              className: 'ResponseDocumentsComponent',
              operation: 'UpdateRequestDocumentApproval',
              userId: this.stateService.getUserId(),
            },
          );

          this.snackbarNotificationService.showSnackbarError(
            'Unable to update approval status. Please try again.',
          );
        },
      });
  }

  onResetForm(row: any, source: DocumentSource): void {
    const resetEnabled =
      source === 'notarizationRequired'
        ? this.isNotarizationResetEnabled(row)
        : this.isResetEnabled(row);
    if (!resetEnabled) {
      return; // guard: approved forms, or forms with nothing to reset, can't be reset
    }

    const requestDocumentId = row.requestDocumentId;

    this.loadingService.show('Resetting...');

    this.documentService
      .ResetDocumentInstance(requestDocumentId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.loadingService.hide();
          row.responseMethod =
            this.autofillDisabled || this.isAutofillUnsupportedDocument(row)
              ? 'manual'
              : null;
          row.manualUploadedOn = null;
          row.completeUploadedOn = null;
          row.lastUpdated = null;
          row.hasIncompleteFields = false;
          row.approvalStatus = 'unapprove';
          row.documentSourceId = null;
          row.documentSource = null;
          row.documentInstanceAutoFillLastUpdated = null;
          row.documentInstanceUserUploadLastUpdated = null;
          row.derived = false;
          row.activeDocumentExists = false;

          this.snackbarNotificationService.showSnackbarSuccess(
            'Form reset to its original version.',
          );
        },
        error: (error) => {
          console.log('error', error);
          this.loadingService.hide();

          const correlationId = error?.error?.correlationId;
          this.loggingService.logException(
            new Error(`HTTP Error ${error.status}: ${error.statusText}`),
            3,
            {
              requestId:
                this.responseIdParam ?? this.responseIdFromStateService,
              requestDocumentId: requestDocumentId,
              organizationId: this.stateService.getOrganizationId(),
              correlationId: correlationId,
              methodName: 'onResetForm',
              className: 'ResponseDocumentsComponent',
              operation: 'ResetDocumentInstance',
              userId: this.stateService.getUserId(),
            },
          );

          this.snackbarNotificationService.showSnackbarError(
            'Unable to reset this form. Please try again.',
          );
        },
      });
  }

  onDownloadRequiredAgencyDocuments(row: {
    requestDocumentId: number;
    documentId: number;
    approvalStatus?: string | null;
    activeDocumentExists?: boolean | null;
    derived: boolean;
    organizationId: number;
    organizationDocumentId?: number;
    agencyOrganizationId?: number;
    sourceRequestDocumentId: number;
  }): void {
    const requestId = this.responseIdParam
      ? Number(this.responseIdParam)
      : this.responseIdFromStateService;

    const {
      requestDocumentId,
      documentId,
      derived,
      organizationDocumentId,
      agencyOrganizationId,
    } = row;

    if (!requestDocumentId) {
      console.error('Request Document ID is not available.');
      return;
    }

    const isIncompleteOrNull =
      this.getDocumentInstanceStatus(row) === 'Incomplete';

    this.loadingService.show('Downloading...');

    if (isIncompleteOrNull) {
      if (derived) {
        if (!organizationDocumentId || !agencyOrganizationId) {
          console.error('organizationDocumentId is required but missing.');
          this.loadingService.hide();
          return;
        }

        this.requestService
          .GetAgencySpecificDocumentContent(
            organizationDocumentId,
            agencyOrganizationId,
          )
          .subscribe({
            next: (response) => {
              const blob = response.body;
              if (!blob) {
                this.loadingService.hide();
                return;
              }

              const contentDisposition = response.headers.get(
                'Content-Disposition',
              );
              const fileName = this.parseContentDispositionFileName(
                contentDisposition,
                'download',
              );

              const a = document.createElement('a');
              const blobUrl = URL.createObjectURL(blob);
              a.href = blobUrl;
              a.download = fileName;
              document.body.appendChild(a);
              a.click();
              document.body.removeChild(a);
              URL.revokeObjectURL(blobUrl);
              this.loadingService.hide();
            },
            error: (error) => {
              this.loadingService.hide();
              const correlationId = error?.error?.correlationId;

              this.loggingService.logException(
                new Error(`HTTP Error ${error.status}: ${error.statusText}`),
                3,
                {
                  requestId: requestId,
                  agencyOrganizationId: agencyOrganizationId,
                  organizationId: this.stateService.getOrganizationId(),
                  organizationDocumentId: organizationDocumentId,
                  correlationId: correlationId,
                  methodName: 'onDownloadRequiredAgencyDocuments',
                  className: 'ResponseDocumentsComponent',
                  operation: 'GetAgencySpecificDocumentContent',
                  userId: this.stateService.getUserId(),
                },
              );
            },
          });
        return;
      }
    }

    this.documentService
      .GetLatestUploadedDocument(row.organizationId, requestDocumentId)
      .subscribe({
        next: (response) => {
          console.log('response', response);
          const blob = response.body;
          if (!blob) {
            this.loadingService.hide();
            return;
          }

          const contentDisposition = response.headers.get(
            'Content-Disposition',
          );
          const fileName = this.parseContentDispositionFileName(
            contentDisposition,
            'download',
          );

          const a = document.createElement('a');
          const blobUrl = URL.createObjectURL(blob);
          a.href = blobUrl;
          a.download = fileName;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(blobUrl);
          this.loadingService.hide();
        },
        error: (error) => {
          console.log('error', error);
          this.loadingService.hide();
          const correlationId = error?.error?.correlationId;

          this.loggingService.logException(
            new Error(`HTTP Error ${error.status}: ${error.statusText}`),
            3,
            {
              requestId: requestId,
              organizationId: row.organizationId,
              requestDocumentId: requestDocumentId,
              correlationId: correlationId,
              methodName: 'onDownloadRequiredAgencyDocuments',
              className: 'ResponseDocumentsComponent',
              operation: 'GetLatestUploadedDocument',
              userId: this.stateService.getUserId(),
            },
          );
        },
      });
  }

  openFileUploadDialog(responseId: number): void {
    const dialogRef = this.dialog.open(FileUploadDialogComponent, {
      width: '400px',
      height: 'auto',
      data: {
        requestId: responseId,
        optionalOfferorDocuments: this.optionalOfferorDocuments,
      },
    });

    dialogRef
      .afterClosed()
      .pipe(takeUntil(this.destroy$))
      .subscribe((newDocument) => {
        if (newDocument) {
          const existingDoc = this.optionalOfferorDocuments.controls.find(
            (control) =>
              control.get('documentId')?.value === newDocument.documentId,
          );

          if (existingDoc) {
            return;
          }

          const formGroup = this.fb.group({
            documentId: [newDocument.documentId],
            requestDocumentId: [newDocument.requestDocumentId ?? null],
            documentName: [newDocument.documentName],
            documentSource: [newDocument.documentSource ?? 'UserUpload'],
          });
          this.optionalOfferorDocuments.push(formGroup);
          this.updateCombinedDatasource();
        }
      });
  }

  updateCombinedDatasource(): void {
    this.offerorDocumentsDatasource.data =
      this.optionalOfferorDocuments.controls.map((control) => control.value);

    this.offerorOptionalDocuments = [...this.offerorDocumentsDatasource.data];
  }

  onDownloadOfferorDocument(row: { requestDocumentId: number }): void {
    const requestDocumentId = row.requestDocumentId;
    if (!requestDocumentId) {
      console.error('Request Document ID is not available.');
      return;
    }

    this.loadingService.show('Downloading...');

    this.requestService.GetOfferorDocumentContent(requestDocumentId).subscribe({
      next: (response) => {
        const contentDisposition = response.headers.get('Content-Disposition');
        const fileName = this.parseContentDispositionFileName(
          contentDisposition,
          'download',
        );

        const blob = response.body;
        if (blob) {
          const blobUrl = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = blobUrl;
          link.download = fileName;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          URL.revokeObjectURL(blobUrl);
        }

        this.loadingService.hide();
      },
      error: (error: any) => {
        this.loadingService.hide();

        const correlationId = error?.error?.correlationId;
        this.loggingService.logException(
          new Error(`HTTP Error ${error.status}: ${error.statusText}`),
          3,
          {
            requestId: this.requestId,
            organizationId: this.stateService.getOrganizationId(),
            requestDocumentId: requestDocumentId,
            correlationId: correlationId,
            methodName: 'onDownloadOfferorDocument',
            className: 'ResponseDocumentsComponent',
            operation: 'GetOfferorDocumentContent',
            userId: this.stateService.getUserId(),
          },
        );
      },
    });
  }

  private parseContentDispositionFileName(
    contentDisposition: string | null,
    fallback: string = 'document',
  ): string {
    if (!contentDisposition) return fallback;

    // Prefer RFC 5987 filename* (UTF-8 encoded)
    const rfcMatch = contentDisposition.match(/filename\*=UTF-8''([^;]+)/i);
    if (rfcMatch?.[1]) {
      return decodeURIComponent(rfcMatch[1].trim());
    }

    // Quoted filename
    const quotedMatch = contentDisposition.match(/filename="([^"]+)"/);
    if (quotedMatch?.[1]) return quotedMatch[1];

    // Unquoted filename
    const unquotedMatch = contentDisposition.match(/filename=([^;]+)/);
    if (unquotedMatch?.[1]) return unquotedMatch[1].trim();

    return fallback;
  }

  deleteForm(requestDocumentId: number, documentId: number): void {
    const requestId = +(
      this.responseIdParam ??
      this.responseIdFromStateService ??
      0
    );
    const requestDocId = +requestDocumentId;

    this.requestService
      .DeleteRequestDocument(requestId, requestDocId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          // if (response.isSuccess) {
          const optionalIndex =
            this.optionalOfferorDocuments.controls.findIndex(
              (control) => control.get('documentId')?.value === documentId,
            );

          if (optionalIndex > -1) {
            this.optionalOfferorDocuments.removeAt(optionalIndex);
            this.updateCombinedDatasource();
          }
          this.snackbarNotificationService.showSnackbarSuccess(
            'Document deleted successfully.',
          );
          // }
        },
        error: (error) => {
          const correlationId = error?.error?.correlationId;

          this.loggingService.logException(
            new Error(`HTTP Error ${error.status}: ${error.statusText}`),
            3,
            {
              requestId: this.requestId,
              organizationId: this.stateService.getOrganizationId(),
              requestDocumentId: requestDocumentId,
              correlationId: correlationId,
              methodName: 'deleteForm',
              className: 'ResponseDocumentsComponent',
              operation: 'DeleteRequestDocument',
              userId: this.stateService.getUserId(),
            },
          );
        },
      });
  }

  goToOfferorProfilePage() {
    this.router.navigate(['/offeror-profile-page']);
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
