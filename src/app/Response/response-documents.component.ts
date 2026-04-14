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
    MatSortModule,
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
  currentSource: 'notarizationNotRequired' | 'notarizationRequired' | null =
    null;

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
      body: 'Incomplete means that you have not yet uploaded your manually completed form.',
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
              documentInstanceStatus:
                doc.documentInstanceStatus ?? 'Incomplete',
            }));

          this.notarizationRequiredDocumentsDatasource.data =
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
    source: 'notarizationNotRequired' | 'notarizationRequired',
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
              const dataToUpdate =
                this.currentSource === 'notarizationNotRequired'
                  ? this.requiredDocumentsDatasource.data
                  : this.notarizationRequiredDocumentsDatasource.data;

              const rowToUpdate = dataToUpdate.find(
                (doc: any) =>
                  doc.requestDocumentId === this.currentRow.requestDocumentId,
              );
              if (rowToUpdate) {
                rowToUpdate.documentInstanceStatus = 'Complete';
              }

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
              let fileName = 'document';
              if (contentDisposition) {
                const match = contentDisposition.match(/filename="?([^"]+)"?/);
                if (match && match[1]) {
                  fileName = match[1];
                }
              }

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
            let fileName = 'download';
            if (contentDisposition) {
              const match = contentDisposition.match(/filename="?([^"]+)"?/);
              if (match && match[1]) {
                fileName = match[1];
              }
            }
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
          let fileName = 'document';

          if (contentDisposition) {
            const standardMatch =
              contentDisposition.match(/filename="([^"]+)"/);
            if (standardMatch && standardMatch[1]) {
              fileName = standardMatch[1];
            } else {
              const noQuotesMatch =
                contentDisposition.match(/filename=([^;]+)/);
              if (noQuotesMatch && noQuotesMatch[1]) {
                fileName = noQuotesMatch[1].trim();
              }
            }
          }

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
        const contentDisposition = response.headers.get('content-disposition');
        let fileName = 'download';

        if (contentDisposition) {
          const fileNameMatch = contentDisposition.match(
            /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/,
          );
          if (fileNameMatch && fileNameMatch[1]) {
            fileName = fileNameMatch[1].replace(/['"]/g, '');
          }
        }

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
              operation: 'deleteRequestDocument',
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
