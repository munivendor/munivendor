import {
  Component,
  Input,
  OnInit,
  ViewChild,
  ElementRef,
  Output,
  EventEmitter,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTableModule } from '@angular/material/table';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
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
import { MatSnackBar } from '@angular/material/snack-bar';
import { TooltipDirective } from '../shared/directive/tooltip.directive';
import { Router } from '@angular/router';
// import { DocumentInstance } from '../Request/model/documentinstance.model';
// import { BidProposalFormDialogComponent } from '../BidProposalForm/bid-proposal-form.component';
import { LoggingService } from '../exceptionhandling/logging.service';
import { AuthService } from '../authorization/auth.service';
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
    RouterModule,
    ReactiveFormsModule,
    TooltipDirective,
  ],
  templateUrl: './response-documents.component.html',
  styleUrls: ['./response-documents.component.css'],
})
export class ResponseDocumentsComponent implements OnInit {
  @Output() autoFillStatusChange = new EventEmitter<boolean>();
  @Input() responseIdParam?: string | null | undefined;
  @ViewChild('fileInput') fileInput!: ElementRef<HTMLInputElement>;
  authorizingOfficialTooltip: any;

  agencyDocumentsColumns: string[] = [
    'formName',
    'fileActions',
    'documentInstanceStatus',
  ];

  notarizationRequiredColumns: string[] = [
    'formName',
    'fileActions',
    'documentInstanceStatus',
  ];

  offerorDocumentsColumns: string[] = ['formName', 'download', 'delete'];

  requiredDocumentsDatasource: any[] = [];
  notarizationRequiredDocumentsDatasource: any[] = [];
  offerorDocumentsDatasource: any[] = [];
  offerorDocuments: any[] = [];
  offerorOptionalDocuments: any[] = [];
  requestId?: number;
  responseDocumentsFormGroup!: FormGroup;
  responseIdFromStateService = this.stateService.getRequestId();
  private destroy$ = new Subject<void>();
  private currentRow: any;
  currentSource: 'notarizationNotRequired' | 'notarizationRequired' | null =
    null;

  constructor(
    private requestService: RequestService,
    public dialog: MatDialog,
    private fb: FormBuilder,
    private stateService: StateService,
    private documentService: DocumentService,
    private _snackBar: MatSnackBar,
    private router: Router,
    private loggingService: LoggingService,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    this.initializeFormGroup();
    this.initializeDocuments();

    this.authorizingOfficialTooltip = {
      header: 'Incomplete',
      body: 'Incomplete means that you have not yet uploaded your manually completed form.',
      showCloseButton: false,
      showActionButton: false,
      width: 'auto',
      transformStyle: 'translate(-103%, -48%)',
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

          // Split documents by presence of sourceRequestDocumentId
          const requiredDocs = documents.filter(
            (doc: any) => doc.sourceRequestDocumentId !== null
          );
          const offerorDocs = documents.filter(
            (doc: any) => doc.sourceRequestDocumentId === null
          );

          // Populate requiredDocumentsDatasource (notarized & non-notarized)
          const requiresNotarizationDocs = requiredDocs.filter(
            (doc: any) => doc.requiresNotarization
          );
          const notRequiredNotarizationDocs = requiredDocs.filter(
            (doc: any) => !doc.requiresNotarization
          );

          this.requiredDocumentsDatasource = notRequiredNotarizationDocs.map(
            (doc: any) => ({
              ...doc,
              formName: doc.documentName,
              documentInstanceStatus:
                doc.documentInstanceStatus ?? 'Incomplete',
            })
          );

          this.notarizationRequiredDocumentsDatasource =
            requiresNotarizationDocs.map((doc: any) => ({
              ...doc,
              formName: doc.documentName,
              autofillStatus: doc.documentInstanceStatus,
              documentInstanceStatus:
                doc.documentInstanceStatus ?? 'Incomplete',
            }));

          this.offerorDocuments = offerorDocs.map((doc: any) => ({ ...doc }));
          this.initializeFormArrayFromApiDocuments();
          this.updateCombinedDatasource();
        },
        error: (error) => {
          console.error('Error initializing documents:', error);

          // Extract correlationId
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
            }
          );
          if (error.status !== 401 && this.authService.authState.value) {
            this._snackBar.open(
              `Failed to load documents. (Correlation ID: ${correlationId}). If you need MuniVendor technical support, please feel free to email vendorsupport@munivenor.com, or call us Monday through Friday, 9am until 5pm EST at (732) 354-1215. In your email, please make sure to include either a screenshot of the error, or the specific Correlation ID code in this error message.`,
              'Close',
              { verticalPosition: 'top' }
            );
          }
        },
      });
  }

  initializeFormGroup(): void {
    const optionalOfferorDocuments = this.fb.array([]);

    this.responseDocumentsFormGroup = this.fb.group({
      optionalOfferorDocuments: optionalOfferorDocuments,
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
        documentRequired: [doc.documentRequired],
        selected: [doc.selected],
        requiresNotarization: [
          { value: doc.requiresNotarization || false, disabled: false },
        ],
      });
      this.optionalOfferorDocuments.push(formGroup);
    });
  }

  onUploadClick(
    row: any,
    source: 'notarizationNotRequired' | 'notarizationRequired'
  ): void {
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
      this.documentService
        .UploadDocumentInstance(
          Number(requestId),
          this.currentRow.requestDocumentId,
          file
        )
        .subscribe({
          next: (response) => {
            if (response.isSuccess && this.currentRow?.requestDocumentId) {
              let dataSourceToUpdate =
                this.currentSource === 'notarizationNotRequired'
                  ? this.requiredDocumentsDatasource
                  : this.notarizationRequiredDocumentsDatasource;

              const rowToUpdate = dataSourceToUpdate.find(
                (doc: any) =>
                  doc.requestDocumentId === this.currentRow.requestDocumentId
              );
              if (rowToUpdate) {
                rowToUpdate.documentInstanceStatus = 'Complete';
              }

              this._snackBar.open('Document uploaded successfully!', '', {
                duration: 5000,
                verticalPosition: 'top',
              });
            }

            // Clear the input value to allow same file selection again
            input.value = '';
          },
          error: (error) => {
            console.error('Upload failed:', error);

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
              }
            );
            if (error.status !== 401 && this.authService.authState.value) {
              this._snackBar.open(
                `Failed to upload document. (Correlation ID: ${correlationId}). If you need MuniVendor technical support, please feel free to email vendorsupport@munivenor.com, or call us Monday through Friday, 9am until 5pm EST at (732) 354-1215. In your email, please make sure to include either a screenshot of the error, or the specific Correlation ID code in this error message.`,
                'Close',
                { verticalPosition: 'top' }
              );
            }

            // Clear the input value even on error to allow retry with same file
            input.value = '';
          },
        });
    } else {
      // Clear the input value if no file is selected or currentRow is null
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
      'optionalOfferorDocuments'
    ) as FormArray;
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

    if (isIncompleteOrNull) {
      if (derived) {
        if (!organizationDocumentId || !agencyOrganizationId) {
          console.error('organizationDocumentId is required but missing.');
          return;
        }
        // Handle regular blob response (no headers) - force download
        this.requestService
          .GetAgencySpecificDocumentContent(
            organizationDocumentId,
            agencyOrganizationId
          )
          .subscribe({
            next: (response) => {
              const blob = response.body;
              if (!blob) return;
              // Extract filename from Content-Disposition
              const contentDisposition = response.headers.get(
                'Content-Disposition'
              );
              let fileName = 'document';
              if (contentDisposition) {
                const match = contentDisposition.match(/filename="?([^"]+)"?/);
                if (match && match[1]) {
                  fileName = match[1];
                }
              }
              // Force download with filename from headers
              const a = document.createElement('a');
              const blobUrl = URL.createObjectURL(blob);
              a.href = blobUrl;
              a.download = fileName;
              document.body.appendChild(a);
              a.click();
              document.body.removeChild(a);
              URL.revokeObjectURL(blobUrl);
            },
            error: (error) => {
              console.error('Failed to fetch document:', error);
              // Extract correlationId
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
                }
              );
              if (error.status !== 401 && this.authService.authState.value) {
                this._snackBar.open(
                  `Failed to download document. (Correlation ID: ${correlationId}). If you need MuniVendor technical support, please feel free to email vendorsupport@munivenor.com, or call us Monday through Friday, 9am until 5pm EST at (732) 354-1215. In your email, please make sure to include either a screenshot of the error, or the specific Correlation ID code in this error message.`,
                  'Close',
                  { verticalPosition: 'top' }
                );
              }
            },
          });
      } else {
        // Handle HttpResponse<Blob> with headers - force download with correct filename
        this.documentService.GetStateDocumentContent(documentId).subscribe({
          next: (response) => {
            const blob = response.body;
            if (!blob) return;

            // Extract filename from Content-Disposition
            const contentDisposition = response.headers.get(
              'Content-Disposition'
            );
            let fileName = 'download';
            if (contentDisposition) {
              const match = contentDisposition.match(/filename="?([^"]+)"?/);
              if (match && match[1]) {
                fileName = match[1];
              }
            }

            // Force download with correct filename
            const a = document.createElement('a');
            const blobUrl = URL.createObjectURL(blob);
            a.href = blobUrl;
            a.download = fileName;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(blobUrl);
          },
          error: (error) => {
            console.error('Failed to fetch document:', error);

            // Extract correlationId
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
              }
            );
            if (error.status !== 401 && this.authService.authState.value) {
              this._snackBar.open(
                `Failed to download document. (Correlation ID: ${correlationId}). If you need MuniVendor technical support, please feel free to email vendorsupport@munivenor.com, or call us Monday through Friday, 9am until 5pm EST at (732) 354-1215. In your email, please make sure to include either a screenshot of the error, or the specific Correlation ID code in this error message.`,
                'Close',
                { verticalPosition: 'top' }
              );
            }
          },
        });
      }
    } else {
      this.documentService.GetDocumentInstance(requestDocumentId).subscribe({
        next: (response) => {
          const blob = response.body;
          if (!blob) return;

          // Extract filename from Content-Disposition
          const contentDisposition = response.headers.get(
            'Content-Disposition'
          );
          let fileName = 'document';
          if (contentDisposition) {
            const match = contentDisposition.match(/filename="?([^"]+)"?/);
            if (match && match[1]) {
              fileName = match[1];
            }
          }

          // Force download with filename from headers
          const a = document.createElement('a');
          const blobUrl = URL.createObjectURL(blob);
          a.href = blobUrl;
          a.download = fileName;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(blobUrl);
        },
        error: (error) => {
          console.error('Failed to fetch document:', error);

          // Extract correlationId
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
            }
          );
          if (error.status !== 401 && this.authService.authState.value) {
            this._snackBar.open(
              `Failed to download document. (Correlation ID: ${correlationId}). If you need MuniVendor technical support, please feel free to email vendorsupport@munivenor.com, or call us Monday through Friday, 9am until 5pm EST at (732) 354-1215. In your email, please make sure to include either a screenshot of the error, or the specific Correlation ID code in this error message.`,
              'Close',
              { verticalPosition: 'top' }
            );
          }
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
              control.get('documentId')?.value === newDocument.documentId
          );

          if (existingDoc) {
            console.log('Document already exists!', newDocument.documentId);
            return;
          }

          const formGroup = this.fb.group({
            documentId: [newDocument.documentId],
            requestDocumentId: [newDocument.requestDocumentId ?? null],
            documentName: [newDocument.documentName],
          });
          this.optionalOfferorDocuments.push(formGroup);
          this.updateCombinedDatasource();
        }
      });
  }

  updateCombinedDatasource(): void {
    this.offerorDocumentsDatasource =
      this.optionalOfferorDocuments.controls.map((control) => control.value);
    this.offerorOptionalDocuments = [...this.offerorDocumentsDatasource];
  }

  onDownloadOfferorDocument(row: { requestDocumentId: number }): void {
    const requestDocumentId = row.requestDocumentId;
    if (!requestDocumentId) {
      console.error('Request Document ID is not available.');
      return;
    }

    this.requestService.GetOfferorDocumentContent(requestDocumentId).subscribe({
      next: (response) => {
        // Extract filename from Content-Disposition header
        const contentDisposition = response.headers.get('content-disposition');
        let fileName = 'download';

        if (contentDisposition) {
          const fileNameMatch = contentDisposition.match(
            /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/
          );
          if (fileNameMatch && fileNameMatch[1]) {
            fileName = fileNameMatch[1].replace(/['"]/g, '');
          }
        }

        // Create blob URL and trigger download
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
      },
      error: (error: any) => {
        console.error('Failed to fetch document:', error);

        // Extract correlationId
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
          }
        );
        if (error.status !== 401 && this.authService.authState.value) {
          this._snackBar.open(
            `Failed to download document. (Correlation ID: ${correlationId}). If you need MuniVendor technical support, please feel free to email vendorsupport@munivenor.com, or call us Monday through Friday, 9am until 5pm EST at (732) 354-1215. In your email, please make sure to include either a screenshot of the error, or the specific Correlation ID code in this error message.`,
            'Close',
            { verticalPosition: 'top' }
          );
        }
      },
    });
  }

  deleteForm(requestDocumentId: number, documentId: number): void {
    const requestId = +(
      this.responseIdParam ??
      this.responseIdFromStateService ??
      0
    );
    const requestDocId = +requestDocumentId;

    this.requestService
      .deleteRequestDocument(requestId, requestDocId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          if (response.isSuccess) {
            const optionalIndex =
              this.optionalOfferorDocuments.controls.findIndex(
                (control) => control.get('documentId')?.value === documentId
              );

            if (optionalIndex > -1) {
              this.optionalOfferorDocuments.removeAt(optionalIndex);
              this.updateCombinedDatasource();
            }
          } else {
            console.error('Failed to delete document');
          }
        },
        error: (error) => {
          console.error('Error deleting document:', error);

          // Extract correlationId
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
              operation: 'deleteRequestDocument',
              userId: this.stateService.getUserId(),
            }
          );
          if (error.status !== 401 && this.authService.authState.value) {
            this._snackBar.open(
              `Failed to delete document. (Correlation ID: ${correlationId}). If you need MuniVendor technical support, please feel free to email vendorsupport@munivenor.com, or call us Monday through Friday, 9am until 5pm EST at (732) 354-1215. In your email, please make sure to include either a screenshot of the error, or the specific Correlation ID code in this error message.`,
              'Close',
              { verticalPosition: 'top' }
            );
          }
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

  // openBidProposalDialog(): void {
  //     this.dialog.open(BidProposalFormDialogComponent, {
  //         width: '600px',
  //         disableClose: true,
  //     });
  // }
}
