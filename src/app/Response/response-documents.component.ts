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
import { takeUntil, Subject, forkJoin, Observable } from 'rxjs';
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
import { request } from 'http';
// import { DocumentInstance } from '../Request/model/documentinstance.model';
// import { BidProposalFormDialogComponent } from '../BidProposalForm/bid-proposal-form.component';
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
  // @Input() sourceIdParam?: string | null | undefined;
  @Input() responseIdParam?: string | null | undefined;
  @ViewChild('fileInput') fileInput!: ElementRef<HTMLInputElement>;

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
    private snackBar: MatSnackBar,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.initializeFormGroup();
    this.initializeDocuments();

    const requestId = this.responseIdParam
      ? Number(this.responseIdParam)
      : this.responseIdFromStateService;
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

              this.snackBar.open('Document uploaded successfully!', '', {
                duration: 5000,
                verticalPosition: 'top',
              });
            }
          },
          error: (error) => {
            console.error('Upload failed:', error);
            this.snackBar.open('Failed to upload document.', '', {
              duration: 5000,
              verticalPosition: 'top',
            });
          },
        });
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
    agencyOrganizationId?: number; //
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

    let download$: Observable<Blob>;

    if (isIncompleteOrNull) {
      if (derived) {
        if (!organizationDocumentId || !agencyOrganizationId) {
          console.error('organizationDocumentId is required but missing.');
          return;
        }
        download$ = this.requestService.GetAgencySpecificDocumentContent(
          organizationDocumentId,
          agencyOrganizationId
        );
      } else {
        download$ = this.documentService.GetStateDocumentContent(documentId);
      }
    } else {
      download$ = this.documentService.GetDocumentInstance(
        Number(requestId),
        requestDocumentId
      );
    }

    download$.subscribe({
      next: (blob) => {
        const blobUrl = URL.createObjectURL(blob);
        window.open(blobUrl, '_blank');
      },
      error: (err) => {
        console.error('Failed to fetch document:', err);
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
      next: (blob) => {
        const blobUrl = URL.createObjectURL(blob);
        window.open(blobUrl, '_blank');
      },
      error: (err: any) => {
        console.error('Failed to fetch document:', err);
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
