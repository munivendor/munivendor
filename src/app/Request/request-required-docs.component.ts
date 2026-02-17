import { Component, OnInit, Input, OnDestroy } from '@angular/core';
import { RouterModule } from '@angular/router';
import {
  FormGroup,
  ReactiveFormsModule,
  FormArray,
  FormBuilder,
} from '@angular/forms';
import { CommonModule } from '@angular/common';
import { MatDialog } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { FileUploadDialogComponent } from '../file-upload-dialog/file-upload-dialog.component';
import { RequestService } from './services/request.service';
import { Document } from './model/document.model';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { RequestDocument } from './model/requestdocument.model';
import { forkJoin, map, Observable, Subject, takeUntil, tap } from 'rxjs';
import { StateService } from './services/state.service';
import { SelectionModel } from '@angular/cdk/collections';
import { MatTableModule } from '@angular/material/table';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatTooltipModule } from '@angular/material/tooltip';
import { DocumentService } from '../shared/service/document.service';
import { LoggingService } from '../exceptionhandling/logging.service';
import { LoadingService } from '../shared/LoadingSpinner/loading.service';
import { MatSnackBar } from '@angular/material/snack-bar';

@Component({
  selector: 'request-required-documents',
  standalone: true,
  templateUrl: './request-required-docs.component.html',
  styleUrls: ['./request-required-docs.component.css'],
  imports: [
    ReactiveFormsModule,
    RouterModule,
    CommonModule,
    MatButtonModule,
    MatIconModule,
    MatCheckboxModule,
    MatProgressSpinnerModule,
    MatTableModule,
    MatFormFieldModule,
    MatSelectModule,
    MatTooltipModule,
  ],
})
export class RequestRequiredDocumentsComponent implements OnInit, OnDestroy {
  @Input() idParam?: string | null | undefined;
  displayedColumns: string[] = [
    'select',
    'formName',
    'notarization',
    'download',
    'delete',
  ];
  requiredStateDocumentsDatasource: FormGroup[] = [];
  optionalStateDocumentsDatasource: FormGroup[] = [];
  optionalMunicipalityDocumentsDatasource: FormGroup[] = [];
  selection = new SelectionModel<Document>(true, []);
  private destroy$ = new Subject<void>();
  requestDocumentsFormGroup!: FormGroup;
  optionalRequestDocuments: Document[] = [];
  organizationRequestDocuments: Document[] = [];
  files: File[] = [];
  municipalityDocuments: Document[] = [];
  documentId!: number;
  selectedOptionalStateDocs: Document[] = [];
  selectedOrganizationDocs: Document[] = [];
  requestId: any;
  organizationId = this.stateService.getOrganizationId();

  constructor(
    private fb: FormBuilder,
    private requestService: RequestService,
    private stateService: StateService,
    private documentService: DocumentService,
    public dialog: MatDialog,
    private loggingService: LoggingService,
    private loadingService: LoadingService,
    private _snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.loadingService.show();
    this.initializeRequestDocuments();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  get requiredStateDocuments(): FormArray {
    return this.requestDocumentsFormGroup.get(
      'requiredStateDocuments'
    ) as FormArray;
  }
  get optionalStateDocuments(): FormArray {
    return this.requestDocumentsFormGroup.get(
      'optionalStateDocuments'
    ) as FormArray;
  }
  get optionalMunicipalityDocuments(): FormArray {
    return this.requestDocumentsFormGroup.get(
      'optionalMunicipalityDocuments'
    ) as FormArray;
  }

  initializeRequestDocuments(): void {
    this.requestDocumentsFormGroup = this.fb.group({
      requiredStateDocuments: this.fb.array([]),
      optionalStateDocuments: this.fb.array([]),
      optionalMunicipalityDocuments: this.fb.array([]),
    });

    if (!this.idParam) {
      this.initializeForCreation();
    } else {
      this.initializeForEditing();
    }
  }

  private initializeForCreation(forceUpdate: boolean = false): void {
    this.getAllDocumentTypes(
      Number(this.organizationId),
      undefined,
      forceUpdate
    )
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.loadingService.hide();
        },
        error: (error) => {
          this.loadingService.hide();
          this.handleDocumentLoadError(
            error,
            'initializeForCreation',
            'getAllDocumentTypes - GetRequiredDocuments/GetOptionalDocuments/GetMunicipalityDocuments'
          );
        },
      });
  }

  initializeForEditing(): void {
    this.requestService
      .GetRequestRequiredDocumentsById(Number(this.idParam))
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (requestDocuments) => {
          const documents = requestDocuments?.documents ?? [];

          if (!documents || documents.length === 0) {
            this.initializeForCreation(true);
            return;
          }

          this.getAllDocumentTypes(
            Number(this.organizationId),
            Number(this.idParam)
          )
            .pipe(takeUntil(this.destroy$))
            .subscribe({
              next: (allDocuments) => {
                try {
                  const enrichedRequestDocuments =
                    this.enrichRequestDocumentsWithOrganizationId(
                      documents,
                      allDocuments.optionalMunicipalityDocuments ?? []
                    );

                  if (enrichedRequestDocuments.length > 0) {
                    this.populateRequestDocuments(enrichedRequestDocuments);
                    this.mergeUnselectedDocuments(
                      allDocuments,
                      enrichedRequestDocuments
                    );
                  } else {
                    this.initializeForCreation(true);
                    return;
                  }

                  this.loadingService.hide();
                } catch (err) {
                  this.fallbackToCreation();
                }
              },
              error: (error) => {
                this.loadingService.hide();
                this.handleDocumentLoadError(
                  error,
                  'initializeForEditing',
                  'getAllDocumentTypes'
                );
                if (error.status >= 500) {
                  this.fallbackToCreation();
                }
              },
            });
        },
        error: (error) => {
          this.handleDocumentLoadError(
            error,
            'initializeForEditing',
            'GetRequestRequiredDocumentsById'
          );
          if (error.status >= 500) {
            this.fallbackToCreation();
          }
        },
      });
  }

  private enrichRequestDocumentsWithOrganizationId(
    requestDocs: any[],
    optionalMunicipalityDocs: any[]
  ): any[] {
    const municipalityDocs = Array.isArray(optionalMunicipalityDocs)
      ? optionalMunicipalityDocs
      : [];

    return requestDocs.map((reqDoc) => {
      const matched = municipalityDocs.find(
        (doc) => doc.documentId === reqDoc.documentId
      );

      return {
        ...reqDoc,
        organizationDocumentId: matched?.organizationDocumentId ?? null,
      };
    });
  }

  private fallbackToCreation(): void {
    this.getAllDocumentTypes(Number(this.organizationId), undefined, true)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.loadingService.hide();
        },
        error: (error) => {
          this.loadingService.hide();
          this.handleDocumentLoadError(
            error,
            'fallbackToCreation',
            'getAllDocumentTypes'
          );
        },
      });
  }

  private handleDocumentLoadError(
    error: any,
    methodContext: string,
    operation: string
  ): void {
    const correlationId = error?.error?.correlationId;
    this.loggingService.logException(
      new Error(`HTTP Error ${error.status}: ${error.statusText}`),
      3,
      {
        organizationId: this.organizationId,
        correlationId: correlationId,
        methodName: methodContext,
        className: 'RequestRequiredDocumentsComponent',
        operation: operation,
        userId: this.stateService.getUserId(),
        requestId: this.idParam,
      }
    );
  }

  getAllDocumentTypes(
    organizationId: number,
    requestId?: number,
    forceUpdate: boolean = false
  ): Observable<any> {
    return forkJoin({
      requiredStateDocuments: this.requestService.GetRequiredDocuments(),
      optionalStateDocuments: this.requestService.GetOptionalDocuments(),
      optionalMunicipalityDocuments:
        this.requestService.GetMunicipalityDocuments(organizationId),
    }).pipe(
      tap(
        ({
          requiredStateDocuments,
          optionalStateDocuments,
          optionalMunicipalityDocuments,
        }) => {
          if (!this.idParam || forceUpdate) {
            this.populateFormArray(
              this.requiredStateDocuments,
              requiredStateDocuments
            );
            this.populateFormArray(
              this.optionalStateDocuments,
              optionalStateDocuments
            );
            this.populateFormArray(
              this.optionalMunicipalityDocuments,
              optionalMunicipalityDocuments
            );
            this.requiredStateDocumentsDatasource = this.requiredStateDocuments
              .controls as FormGroup[];
            this.optionalStateDocumentsDatasource = this.optionalStateDocuments
              .controls as FormGroup[];
            this.optionalMunicipalityDocumentsDatasource = this
              .optionalMunicipalityDocuments.controls as FormGroup[];
          }
        }
      ),
      map(
        ({
          requiredStateDocuments,
          optionalStateDocuments,
          optionalMunicipalityDocuments,
        }) => ({
          requiredStateDocuments: requiredStateDocuments.documents,
          optionalStateDocuments: optionalStateDocuments.documents,
          optionalMunicipalityDocuments:
            optionalMunicipalityDocuments.documents,
        })
      )
    );
  }

  populateRequestDocuments(requestDocuments: RequestDocument[]): void {
    requestDocuments.forEach((document: any) => {
      const documentFormGroup = this.fb.group({
        documentId: [document.documentId],
        requestDocumentId: [document.requestDocumentId ?? null],
        documentName: [document.documentName],
        derived: [document.derived],
        documentRequired: [document.documentRequired],
        required: [document.required],
        selected: [document.selected],
        requiresNotarization: [document.requiresNotarization || false],
        organizationDocumentId: [document.organizationDocumentId ?? null],
      });
      if (document.derived) {
        // Derived = true -> Organization document
        this.optionalMunicipalityDocuments.push(documentFormGroup);
      } else if (document.required) {
        // Derived = false, Required = true -> Required State document
        this.requiredStateDocuments.push(documentFormGroup);
      } else {
        // Derived = false, Required = false -> Optional State document
        this.optionalStateDocuments.push(documentFormGroup);
      }
    });
  }

  mergeUnselectedDocuments(allDocuments: any, requestDocuments: any[]): void {
    const {
      requiredStateDocuments = [],
      optionalStateDocuments = [],
      optionalMunicipalityDocuments = [],
    } = allDocuments;

    const selectedIds = new Set(requestDocuments.map((doc) => doc.documentId));

    const filterOutSelected = (documents: any[]) => {
      if (!Array.isArray(documents)) {
        console.warn('Expected array but got:', documents);
        return [];
      }
      return documents.filter((doc) => !selectedIds.has(doc.documentId));
    };

    this.populateFormArray(
      this.requiredStateDocuments,
      filterOutSelected(requiredStateDocuments)
    );
    this.populateFormArray(
      this.optionalStateDocuments,
      filterOutSelected(optionalStateDocuments)
    );
    this.populateFormArray(
      this.optionalMunicipalityDocuments,
      filterOutSelected(optionalMunicipalityDocuments)
    );

    this.requiredStateDocumentsDatasource = this.requiredStateDocuments
      .controls as FormGroup[];
    this.optionalStateDocumentsDatasource = this.optionalStateDocuments
      .controls as FormGroup[];
    this.optionalMunicipalityDocumentsDatasource = this
      .optionalMunicipalityDocuments.controls as FormGroup[];
  }

  isDocumentSelected(documentId: number): boolean {
    return (
      this.requiredStateDocuments.value.some(
        (doc: any) => doc.documentId === documentId
      ) ||
      this.optionalStateDocuments.value.some(
        (doc: any) => doc.documentId === documentId
      ) ||
      this.optionalMunicipalityDocuments.value.some(
        (doc: any) => doc.documentId === documentId
      )
    );
  }

  populateFormArray(formArray: FormArray, response: any): void {
    const documents = Array.isArray(response?.documents)
      ? response.documents
      : response;

    if (!Array.isArray(documents)) {
      console.warn('Documents is not an array:', documents);
      return;
    }

    documents.forEach((document: any) => {
      if (!this.isDocumentSelected(document.documentId)) {
        formArray.push(
          this.fb.group({
            documentId: [document.documentId],
            requestDocumentId: [document.requestDocumentId ?? null],
            documentName: [document.documentName],
            documentRequired: [document.documentRequired ?? false],
            selected: [document.selected ?? false],
            requiresNotarization: [
              {
                value: document.requiresNotarization || false,
                disabled: !document.selected,
              },
            ],
            organizationDocumentId: [document.organizationDocumentId ?? null],
          })
        );
      }
    });
  }

  openFileUploadDialog(organizationId: number): void {
    const dialogRef = this.dialog.open(FileUploadDialogComponent, {
      width: '400px',
      height: 'auto',
      data: {
        organizationId,
        municipalityDocuments: this.optionalMunicipalityDocuments,
      },
    });
    dialogRef
      .afterClosed()
      .pipe(takeUntil(this.destroy$))
      .subscribe((newDocument) => {
        if (newDocument) {
          const formGroup = this.fb.group({
            documentId: [newDocument.documentId],
            requestDocumentId: [newDocument.requestDocumentId ?? null],
            organizationDocumentId: [
              newDocument.organizationDocumentId ?? null,
            ],
            documentName: [newDocument.documentName],
            documentRequired: [newDocument.documentRequired],
            selected: [newDocument.selected],
            requiresNotarization: [
              {
                value: newDocument.requiresNotarization || false,
                disabled: false,
              },
            ],
          });

          this.optionalMunicipalityDocuments.push(formGroup);

          this.optionalMunicipalityDocumentsDatasource = [
            ...this.optionalMunicipalityDocuments.controls,
          ] as FormGroup[];
        }
      });
  }

  onCheckboxChange(formArray: FormArray, index: number, isChecked: boolean) {
    const formGroup = formArray.at(index) as FormGroup;
    formGroup.get('selected')?.setValue(isChecked);

    const notarizationControl = formGroup.get('requiresNotarization');
    if (isChecked) {
      notarizationControl?.enable();
    } else {
      notarizationControl?.disable();
    }
  }

  deleteOrganizationDocument(documentId: number): void {
    this.requestService
      .DeleteOrganizationDocument(documentId)
      .pipe(takeUntil(this.destroy$))
      .subscribe(
        () => {
          const formArray = this.optionalMunicipalityDocuments;
          const indexToDelete = formArray.controls.findIndex(
            (control) => control.get('documentId')?.value === documentId
          );

          if (indexToDelete > -1) {
            formArray.removeAt(indexToDelete);
            this.optionalMunicipalityDocumentsDatasource = [
              ...formArray.controls,
            ] as FormGroup[];
          }

          this._snackBar.open('Document successfully deleted.', 'Close', {
            duration: 5000,
            verticalPosition: 'top',
          });
        },
        (error) => {
          const correlationId = error?.error?.correlationId;
          this.loggingService.logException(
            new Error(`HTTP Error ${error.status}: ${error.statusText}`),
            3,
            {
              organizationId: this.organizationId,
              correlationId: correlationId,
              documentId: documentId,
              methodName: 'deleteOrganizationDocument',
              className: 'RequestRequiredDocumentsComponent',
              operation: 'DeleteOrganizationDocument',
              userId: this.stateService.getUserId(),
              requestId: this.idParam,
            }
          );
        }
      );
  }

  onDownloadAgencySpecificDocument(row: FormGroup): void {
    const organizationDocumentId = row.get('organizationDocumentId')?.value;

    this.loadingService.show('Downloading...');

    this.requestService
      .GetAgencySpecificDocumentContent(
        organizationDocumentId,
        Number(this.organizationId)
      )
      .subscribe({
        next: (response) => {
          const blob = response.body;
          if (!blob) return;

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
              organizationId: this.organizationId,
              correlationId: correlationId,
              organizationDocumentId: organizationDocumentId,
              methodName: 'onDownloadAgencySpecificDocument',
              className: 'RequestRequiredDocumentsComponent',
              operation: 'GetAgencySpecificDocumentContent',
              userId: this.stateService.getUserId(),
              requestId: this.idParam,
            }
          );
        },
      });
  }

  onDownloadStateDocument(row: FormGroup): void {
    const documentId = row.get('documentId')?.value;
    if (!documentId) {
      console.error('Document ID is missing');
      return;
    }

    this.loadingService.show('Downloading...');

    this.documentService.GetStateDocumentContent(documentId).subscribe({
      next: (response) => {
        const blob = response.body;
        if (!blob) return;

        const contentDisposition = response.headers.get('Content-Disposition');
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
      error: (error: any) => {
        this.loadingService.hide();
        const correlationId = error?.error?.correlationId;
        this.loggingService.logException(
          new Error(`HTTP Error ${error.status}: ${error.statusText}`),
          3,
          {
            organizationId: this.organizationId,
            correlationId: correlationId,
            documentId: documentId,
            methodName: 'onDownloadStateDocument',
            className: 'RequestRequiredDocumentsComponent',
            operation: 'GetStateDocumentContent',
            userId: this.stateService.getUserId(),
            requestId: this.idParam,
          }
        );
      },
    });
  }

  saveDocuments() {
    this.requestId = this.stateService.getRequestId();
    const organizationId = this.stateService.getOrganizationId();
    if (organizationId !== null) {
      this.organizationId = organizationId;
    } else {
      console.error('Organization ID is null');
    }

    const selectedDocuments = [
      ...this.requiredStateDocuments.controls,
      ...this.optionalStateDocuments.controls,
      ...this.optionalMunicipalityDocuments.controls,
    ]
      .filter((control) => control.value.selected)
      .map((control) => control.value);

    const requestDocuments: RequestDocument[] = selectedDocuments.map((doc) => {
      const requestDoc = new RequestDocument();

      requestDoc.documentId = doc.documentId;
      requestDoc.requestDocumentId = doc.requestDocumentId ?? null;
      requestDoc.requestId = this.requestId;
      requestDoc.derived = doc.derived ?? false;
      requestDoc.requiresNotarization = doc.requiresNotarization ?? false;
      requestDoc.required = doc.required ?? true;
      requestDoc.organizationDocumentId = doc.organizationDocumentId ?? null;
      return requestDoc;
    });

    this.requestService
      .SaveRequestDocuments(this.requestId, requestDocuments)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.stateService.setRequestHasBeenSaved(true);
        },
        error: (error) => {
          const correlationId = error?.error?.correlationId;

          this.loggingService.logException(
            new Error(`HTTP Error ${error.status}: ${error.statusText}`),
            3,
            {
              organizationId: this.organizationId,
              correlationId: correlationId,
              requestDocuments: requestDocuments,
              methodName: 'saveDocuments',
              className: 'RequestOverviewComponent',
              operation: 'SaveRequestDocuments',
              userId: this.stateService.getUserId(),
              requestId: this.requestId,
            }
          );
        },
      });
  }
}
