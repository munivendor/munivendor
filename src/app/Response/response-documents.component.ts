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
import { DocumentService } from '../shared/service/document.service';
import { TooltipDirective } from '../shared/directive/tooltip.directive';
import { Router } from '@angular/router';
import { LoggingService } from '../exceptionhandling/logging.service';
import { LoadingService } from '../shared/LoadingSpinner/loading.service';
import { SnackbarNotificationService } from '../shared/service/snackbar-notification.service';
import { MatSort, MatSortModule } from '@angular/material/sort';
import { SplitCamelCasePipe } from '../shared/pipes/split-camel-case.pipe';

type ResponseMethod = 'manual' | 'autofill' | null;
type DocumentSource = 'notarizationNotRequired' | 'notarizationRequired';

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

  agencyDocumentsColumns: string[] = [
    'formName',
    'responseMethod',
    'manualUpload',
    'mvAutofillAi',
    'action',
    'documentInstanceStatus',
  ];

  notarizationRequiredColumns: string[] = [
    'formName',
    'mvAutofillAi',
    'completeUpload',
    'action',
    'documentInstanceStatus',
  ];

  offerorDocumentsColumns: string[] = [
    'formName',
    'source',
    'download',
    'delete',
  ];

  requiredDocumentsDatasource = new MatTableDataSource<any>([]);
  notarizationRequiredDocumentsDatasource = new MatTableDataSource<any>([]);
  offerorDocumentsDatasource = new MatTableDataSource<any>([]);
  offerorOptionalDocuments: any[] = [];

  offerorDocuments: any[] = [];
  requestId?: number;
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
  ) {}

  ngOnInit(): void {
    this.initializeFormGroup();
    this.loadingService.show();
    this.initializeDocuments();

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
          return (item.documentInstanceStatus ?? '').toLowerCase();
        default:
          return '';
      }
    };
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
              responseMethod: (doc.responseMethod ?? null) as ResponseMethod,
              manualUploadedOn: doc.manualUploadedOn ?? null,
              lastUpdated: doc.lastUpdated ?? null,
              hasIncompleteFields: doc.hasIncompleteFields ?? false,
              documentInstanceStatus:
                doc.documentInstanceStatus ?? 'Incomplete',
              approvalStatus: doc.approved ? 'approve' : 'unapprove',
              approvalLastUpdated: doc.approvalLastUpdated ?? null,
            }));

          this.notarizationRequiredDocumentsDatasource.data =
            requiresNotarizationDocs.map((doc: any) => ({
              ...doc,
              formName: doc.documentName,
              // lastUpdated: doc.lastUpdated ?? null,
              hasIncompleteFields: doc.hasIncompleteFields ?? false,
              completeUploadedOn: doc.completeUploadedOn ?? null,
              documentInstanceStatus:
                doc.documentInstanceStatus ?? 'Incomplete',

              lastUpdated: doc.lastUpdated ?? null,
              approvalStatus: doc.approved ? 'approve' : 'unapprove',
              approvalLastUpdated: doc.approvalLastUpdated ?? null,
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

  // ---------------------------------------------------------------------------
  // Response Method
  // ---------------------------------------------------------------------------

  onResponseMethodChange(row: any, method: ResponseMethod): void {
    if (row.approvalStatus === 'approve') {
      return; // method is locked once the form has been approved
    }
    row.responseMethod = method;
  }

  // ---------------------------------------------------------------------------
  // Button / toggle enablement helpers
  // ---------------------------------------------------------------------------

  /** Standard table: manual upload button is blue/enabled only after Manual is chosen. */
  isManualUploadEnabled(row: any): boolean {
    return row.responseMethod === 'manual' && row.approvalStatus !== 'approve';
  }

  /** Standard table: autofill button is blue/enabled only after MV Autofill AI is chosen. */
  isStandardAutofillEnabled(row: any): boolean {
    return (
      row.responseMethod === 'autofill' && row.approvalStatus !== 'approve'
    );
  }

  /** Notarization table: autofill is optional, available until the form is approved. */
  isNotarizationAutofillEnabled(row: any): boolean {
    return row.approvalStatus !== 'approve';
  }

  /** Notarization table: the notarized upload is available until the form is approved. */
  isNotarizedUploadEnabled(row: any): boolean {
    return row.approvalStatus !== 'approve';
  }

  /**
   * Standard table: approval unlocks only once the chosen path has been
   * completed. An already-approved row stays enabled so the offeror can
   * unapprove it and go back to edit / re-upload.
   */
  isStandardApprovalEnabled(row: any): boolean {
    if (row.approvalStatus === 'approve') {
      return true;
    }
    if (row.responseMethod === 'manual') {
      return !!row.manualUploadedOn;
    }
    if (row.responseMethod === 'autofill') {
      return !!row.lastUpdated;
    }
    return false;
  }

  /**
   * Notarization table: approval unlocks only once the notarized document is
   * uploaded. An already-approved row stays enabled so it can be unapproved
   * and re-uploaded.
   */
  isNotarizationApprovalEnabled(row: any): boolean {
    return row.approvalStatus === 'approve' || !!row.completeUploadedOn;
  }

  // ---------------------------------------------------------------------------
  // Upload
  // ---------------------------------------------------------------------------

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
          next: (response) => {
            this.loadingService.hide();
            if (response.isSuccess && this.currentRow?.requestDocumentId) {
              const now = new Date().toISOString();

              // Record the upload timestamp in the correct column. NOTE:
              // the Status stays Incomplete here — it only becomes Complete
              // once the offeror approves the form.
              if (this.currentSource === 'notarizationRequired') {
                this.currentRow.completeUploadedOn = now;
              } else {
                this.currentRow.manualUploadedOn = now;
              }
              this.currentRow.documentSourceId = 2; // user / manual upload
              this.currentRow.derived = false;

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

  // ---------------------------------------------------------------------------
  // MV Autofill AI
  // ---------------------------------------------------------------------------

  onAutofillClick(row: any, source: DocumentSource): void {
    const offerId = this.responseIdParam
      ? Number(this.responseIdParam)
      : this.responseIdFromStateService;

    // IMPORTANT: the API's `sourceRequestDocumentId` param expects this row's
    // OWN requestDocumentId — not row.sourceRequestDocumentId, which refers
    // to a different row entirely.
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
        next: (response: any) => {
          this.loadingService.hide();

          row.lastUpdated = new Date().toISOString();

          // Show the yellow warning triangle when the autofill engine reports
          // empty fields. Adjust the property names below to match whatever
          // your AutofillDocument endpoint actually returns.
          row.hasIncompleteFields =
            response?.hasIncompleteFields ??
            (Array.isArray(response?.incompleteFields)
              ? response.incompleteFields.length > 0
              : false);

          this.snackbarNotificationService.showSnackbarSuccess(
            'Document autofilled successfully.',
          );
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

  // ---------------------------------------------------------------------------
  // Approval  (drives the Status column)
  // ---------------------------------------------------------------------------

  onApprovalToggleChange(
    row: any,
    event: MatSlideToggleChange,
    source: DocumentSource,
  ): void {
    const approved = event.checked;
    const requestDocumentId = row.requestDocumentId;

    if (!requestDocumentId) {
      console.error('Request Document ID is not available.');
      event.source.checked = !approved; // revert
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
            event.source.checked = !approved; // revert toggle
            this.snackbarNotificationService.showSnackbarError(
              'Unable to update approval status. Please try again.',
            );
            return;
          }

          row.approvalStatus = approved ? 'approve' : 'unapprove';
          // Approving completes the form; unapproving sends it back to Incomplete.
          row.documentInstanceStatus = approved ? 'Complete' : 'Incomplete';
          if (approved) {
            row.approvalLastUpdated = new Date().toISOString();
          }
        },
        error: (error) => {
          this.loadingService.hide();
          event.source.checked = !approved; // revert toggle

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

  // ---------------------------------------------------------------------------
  // Reset form to its original, unfilled version
  // ---------------------------------------------------------------------------

  onResetForm(row: any, source: DocumentSource): void {
    // NOTE: This is currently a UI-ONLY reset. The backend still holds any
    // uploaded / autofilled document instance, so the cleared state below will
    // NOT survive a page refresh — initializeDocuments() will repopulate the
    // row from the API.
    //
    // TODO: Call the reset/delete endpoint here and move the local reset below
    // into its success callback, e.g.:
    //
    //   this.documentService
    //     .ResetDocumentInstance(row.requestDocumentId)
    //     .pipe(takeUntil(this.destroy$))
    //     .subscribe({ next: () => { /* local reset */ }, error: (e) => { ... } });

    row.responseMethod = null;
    row.manualUploadedOn = null;
    row.completeUploadedOn = null;
    row.lastUpdated = null;
    row.hasIncompleteFields = false;
    row.approvalStatus = 'unapprove';
    row.approvalLastUpdated = null;
    row.documentInstanceStatus = 'Incomplete';
    row.documentSourceId = null;
    row.derived = false;

    this.snackbarNotificationService.showSnackbarSuccess(
      'Form reset to its original version.',
    );
  }

  onDownloadRequiredAgencyDocuments(row: {
    requestDocumentId: number;
    documentId: number;
    documentInstanceStatus?: string | null;
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
      documentInstanceStatus,
      derived,
      organizationDocumentId,
      agencyOrganizationId,
    } = row;

    if (!requestDocumentId) {
      console.error('Request Document ID is not available.');
      return;
    }

    const isIncompleteOrNull =
      !documentInstanceStatus || documentInstanceStatus === 'Incomplete';

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
      } else {
        this.documentService.GetStateDocumentContent(documentId).subscribe({
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
            const correlationId = error?.error?.correlationId;

            this.loggingService.logException(
              new Error(`HTTP Error ${error.status}: ${error.statusText}`),
              3,
              {
                requestId: requestId,
                organizationId: this.stateService.getOrganizationId(),
                documentId: documentId,
                correlationId: correlationId,
                methodName: 'onDownloadRequiredAgencyDocuments',
                className: 'ResponseDocumentsComponent',
                operation: 'GetStateDocumentContent',
                userId: this.stateService.getUserId(),
              },
            );
          },
        });
      }
    } else {
      this.documentService.GetDocumentInstance(requestDocumentId).subscribe({
        next: (response) => {
          const blob = response.body;
          if (!blob) return;

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
              organizationId: this.stateService.getOrganizationId(),
              requestDocumentId: requestDocumentId,
              correlationId: correlationId,
              methodName: 'onDownloadRequiredAgencyDocuments',
              className: 'ResponseDocumentsComponent',
              operation: 'GetDocumentInstance',
              userId: this.stateService.getUserId(),
            },
          );
        },
      });
    }
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
          if (response.isSuccess) {
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
          }
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
  // documentSourceId
  // 1 = AUTOFILL
  // 2 = user upload = manual upload
  // 3 - offeror profile upload

  getUploadIconColor(row: any): string {
    if (row.documentSourceId === 3) {
      return '#3f51b5'; // blue = uploaded from Offeror Profile
    }
    if (row.documentSourceId === 2) {
      return 'green'; // green = user uploaded
    }
    return 'gray'; // gray = not yet uploaded
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
