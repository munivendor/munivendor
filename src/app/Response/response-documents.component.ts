import { Component, Input, OnInit, ViewChild, ElementRef, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTableModule } from '@angular/material/table';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { RouterModule } from '@angular/router';
import { RequestService } from '../Request/services/request.service';
import { takeUntil, Subject, forkJoin } from 'rxjs';
import { FileUploadDialogComponent } from '../file-upload-dialog/file-upload-dialog.component';
import { MatDialog } from '@angular/material/dialog';
import { FormGroup, FormArray, FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { StateService } from '../Request/services/state.service';
import { DocumentService } from '../shared/service/document.service';
import { MatSnackBar } from '@angular/material/snack-bar';
import { TooltipDirective } from '../shared/directive/tooltip.directive';
import { Router } from '@angular/router';
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
        TooltipDirective
    ],
    templateUrl: './response-documents.component.html',
    styleUrls: ['./response-documents.component.css'],
})
export class ResponseDocumentsComponent implements OnInit {
    @Output() autoFillStatusChange = new EventEmitter<boolean>();
    @Input() sourceIdParam?: string | null | undefined;
    @Input() responseIdParam?: string | null | undefined;
    @ViewChild('fileInput') fileInput!: ElementRef<HTMLInputElement>;

    agencyDocumentsColumns: string[] = [
        'formName',
        'notarizationRequired',
        'download',
        'upload',
        'status'
    ];

    offerorDocumentsColumns: string[] = [
        'formName',
        'download',
        'delete'
    ];

    requiredDocumentsDatasource: any[] = [];
    offerorDocumentsDatasource: any[] = [];
    offerorDocuments: any[] = [];
    offerorOptionalDocuments: any[] = [];
    requestId?: number;
    responseDocumentsFormGroup!: FormGroup;
    responseIdFromStateService = this.stateService.getRequestId();
    private destroy$ = new Subject<void>();
    private currentRow: any;

    constructor(
        private requestService: RequestService,
        public dialog: MatDialog,
        private fb: FormBuilder,
        private stateService: StateService,
        private documentService: DocumentService,
        private snackBar: MatSnackBar,
        private router: Router,
    ) { }

    ngOnInit(): void {
        this.initializeFormGroup();
        this.initializeRequestDocuments();

        const requestId = this.responseIdParam
            ? Number(this.responseIdParam)
            : this.responseIdFromStateService;

        if (requestId) {
            this.initializeResponseDocuments(requestId);
        }
    }

    initializeFormGroup(): void {
        const optionalOfferorDocuments = this.fb.array([]);

        this.responseDocumentsFormGroup = this.fb.group({
            optionalOfferorDocuments: optionalOfferorDocuments,
            responseDocuments: this.fb.array([])
        });
    }

    initializeResponseDocuments(requestId: number): void {
        this.requestService.GetRequestRequiredDocumentsById(requestId).subscribe({
            next: (response) => {
                this.offerorDocuments = response.documents.map((doc: any) => ({
                    ...doc
                }));
                this.initializeFormArrayFromApiDocuments();
                this.updateCombinedDatasource();

                console.log('Offeror documents initialized successfully.', this.offerorDocumentsDatasource);
            },
            error: (error) => {
                console.error('Error initializing offeror documents:', error);
            }
        });
    }

    private initializeFormArrayFromApiDocuments(): void {
        while (this.optionalOfferorDocuments.length !== 0) {
            this.optionalOfferorDocuments.removeAt(0);
        }

        this.offerorDocuments.forEach(doc => {
            const formGroup = this.fb.group({
                documentId: [doc.documentId || doc.requestDocumentId],
                requestDocumentId: [doc.requestDocumentId ?? null],
                documentName: [doc.documentName],
                documentRequired: [doc.documentRequired],
                selected: [doc.selected],
                requiresNotarization: [{ value: doc.requiresNotarization || false, disabled: false }],
            });
            this.optionalOfferorDocuments.push(formGroup);
        });
    }

    initializeRequestDocuments(): void {
        const requestId = Number(this.sourceIdParam);

        forkJoin({
            requiredDocs: this.requestService.GetRequestRequiredDocumentsById(requestId),
            documentInstances: this.documentService.GetAllDocumentInstances(requestId),
        }).subscribe({
            next: ({ requiredDocs, documentInstances }) => {
                const statusMap = new Map<number, number>();
                documentInstances.documentInstances.forEach((instance: { requestDocumentId: number | null; documentInstanceStatusId: number; }) => {
                    if (instance.requestDocumentId != null) {
                        statusMap.set(instance.requestDocumentId, instance.documentInstanceStatusId);
                    }
                });

                this.requiredDocumentsDatasource = requiredDocs.documents.map((doc: { documentName: any; requiresNotarization: any; requestDocumentId: number; }) => ({
                    formName: doc.documentName,
                    notarizationRequired: doc.requiresNotarization,
                    status: this.getStatusLabel(statusMap.get(doc.requestDocumentId)),
                    ...doc
                }));

                console.log('Merged document data:', this.requiredDocumentsDatasource);
            },
            error: (err) => {
                console.error('Error loading documents:', err);
            }
        });
    }

    onUploadClick(row: any): void {
        this.currentRow = row;
        this.fileInput.nativeElement.click();
    }

    onFileSelected(event: Event): void {
        const input = event.target as HTMLInputElement;
        const file = input.files?.[0];
        const requestId = this.responseIdParam ? Number(this.responseIdParam) : this.responseIdFromStateService;

        if (file && this.currentRow) {

            this.documentService.UploadDocumentInstance(
                Number(requestId),
                this.currentRow.requestDocumentId,
                file
            ).subscribe({
                next: (response) => {
                    if (response.isSuccess && this.currentRow?.requestDocumentId) {
                        const rowToUpdate = this.requiredDocumentsDatasource.find(
                            (doc: any) => doc.requestDocumentId === this.currentRow.requestDocumentId
                        );

                        if (rowToUpdate) {
                            rowToUpdate.documentInstanceStatusId = 2;
                            rowToUpdate.status = 'Complete';
                        }

                        this.snackBar.open('Document uploaded successfully!', '', {
                            duration: 5000,
                            verticalPosition: 'top'
                        });
                    }
                },
                error: (error) => {
                    console.error('Upload failed:', error);
                    this.snackBar.open('Failed to upload document.', '', {
                        duration: 5000,
                        verticalPosition: 'top'
                    });
                },
            });
        }
    }

    getStatusLabel(statusId?: number): string {
        switch (statusId) {
            case 1: return 'Incomplete';
            case 2: return 'Complete';
            default: return 'Unknown';
        }
    }

    get optionalOfferorDocuments(): FormArray {
        return this.responseDocumentsFormGroup.get('optionalOfferorDocuments') as FormArray;
    }

    onDownloadRequiredAgencyDocuments(row: { requestDocumentId: any; }): void {
        const requestDocumentId = row.requestDocumentId;
        const requestId = this.responseIdParam ? Number(this.responseIdParam) : this.responseIdFromStateService;
        if (!requestDocumentId) {
            console.error('Request Document ID is not available.');
            return;
        }

        this.documentService.GetDocumentInstance(Number(requestId), requestDocumentId).subscribe({
            next: (blob) => {
                const blobUrl = URL.createObjectURL(blob);
                window.open(blobUrl, '_blank');
            },
            error: (err: any) => {
                console.error('Failed to fetch document:', err);
            }
        });
    }

    openFileUploadDialog(responseId: number): void {
        const dialogRef = this.dialog.open(FileUploadDialogComponent, {
            width: '400px',
            height: 'auto',
            data: {
                requestId: responseId,
                optionalOfferorDocuments: this.optionalOfferorDocuments
            }
        });

        dialogRef.afterClosed()
            .pipe(takeUntil(this.destroy$))
            .subscribe((newDocument) => {
                if (newDocument) {
                    const existingDoc = this.optionalOfferorDocuments.controls.find(
                        control => control.get('documentId')?.value === newDocument.documentId
                    );

                    if (existingDoc) {
                        console.log('Document already exists!', newDocument.documentId);
                        return;
                    }

                    const formGroup = this.fb.group({
                        documentId: [newDocument.documentId],
                        requestDocumentId: [newDocument.requestDocumentId ?? null],
                        documentName: [newDocument.documentName],
                        documentRequired: [newDocument.documentRequired],
                        selected: [newDocument.selected],
                        requiresNotarization: [{ value: newDocument.requiresNotarization || false, disabled: false }],
                    });

                    this.optionalOfferorDocuments.push(formGroup);
                    this.updateCombinedDatasource();
                }
            });
    }

    updateCombinedDatasource(): void {
        this.offerorDocumentsDatasource = this.optionalOfferorDocuments.controls.map(control => control.value);
        this.offerorOptionalDocuments = [...this.offerorDocumentsDatasource];
    }

    onDownloadOfferorDocument(row: { requestDocumentId: number; }): void {
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
            }
        });
    }

    deleteForm(documentId: number): void {
        const requestId = +(this.responseIdParam ?? this.responseIdFromStateService ?? 0);
        const docId = +documentId;

        this.requestService.deleteRequestDocument(requestId, docId)
            .pipe(takeUntil(this.destroy$))
            .subscribe({
                next: (response) => {
                    if (response.isSuccess) {
                        const optionalIndex = this.optionalOfferorDocuments.controls.findIndex(
                            control => control.get('documentId')?.value === documentId
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
                }
            });
    }

    goToOfferorProfilePage() {
        this.router.navigate(['/offeror-profile']);
    }

    ngOnDestroy(): void {
        this.destroy$.next();
        this.destroy$.complete();
    }

    // openBidProposalDialog(): void {
    //     this.dialog.open(BidProposalFormDialogComponent, {
    //         width: '600px',
    //         disableClose: true, // forces the user to take action
    //     });
    // }
}