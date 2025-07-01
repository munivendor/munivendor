import { Component, Input, OnInit, OnDestroy } from '@angular/core';
import { RouterModule } from '@angular/router';
import { FormGroup, FormBuilder, ReactiveFormsModule, FormArray } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { MatFormField } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { forkJoin, Subject, takeUntil } from 'rxjs';
import { RequestService } from '../Request/services/request.service';
import { StateService } from '../Request/services/state.service';
import { Router } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { CategoryNode } from '../shared/model/category-tree.model';
import { CategoryHierarchyService } from '../Request/services/category-hierarchy.service';
import { MatTableModule } from '@angular/material/table';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { DocumentService } from '../shared/service/document.service';
import { MatButtonModule } from '@angular/material/button';
@Component({
    selector: 'response-review',
    standalone: true,
    templateUrl: './response-review.component.html',
    styleUrls: ['./response-review.component.css'],
    imports: [
        ReactiveFormsModule,
        RouterModule,
        CommonModule,
        MatFormField,
        MatInputModule,
        MatTableModule,
        MatIconModule,
        MatTooltipModule,
        MatButtonModule
    ]
})

export class ResponseReviewComponent implements OnInit, OnDestroy {
    @Input() sourceIdParam?: string | null | undefined;
    @Input() responseIdParam?: string | null | undefined;
    responseIdFromStateService = this.stateService.getRequestId();
    private destroy$ = new Subject<void>();

    requestId!: number | null;
    requestFinalReviewDetailsForm!: FormGroup;
    requestFinalReviewDetails: any = {};
    docs: any;
    hierarchicalCategories: CategoryNode[] = [];

    requiredDocumentsDatasource: any[] = [];
    agencyDocumentsColumns: string[] = [
        'formName',
        'notarizationRequired',
        'download',
        'status'
    ];

    offerorDocumentsDatasource: any[] = [];
    offerorDocumentsColumns: string[] = [
        'formName',
        'download',
    ];

    constructor(
        private fb: FormBuilder,
        private requestService: RequestService,
        private stateService: StateService,
        private router: Router,
        private snackBar: MatSnackBar,
        private categoryHierarchyService: CategoryHierarchyService,
        private documentService: DocumentService
    ) { }

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

    private getCategoryHierarchy() {
        this.categoryHierarchyService.GetCategoryHierarchy()
            .pipe(takeUntil(this.destroy$))
            .subscribe({
                next: (categories) => {
                    this.hierarchicalCategories = this.prepareCategoriesForTreeRendering(categories);
                },
                error: err => console.error('Error fetching categories:', err)
            });
    }

    ngOnInit() {
        this.getCategoryHierarchy();
        this.initializeRequestDocuments();
        if (this.responseIdParam || this.responseIdFromStateService)
        {
            const requestId = this.responseIdParam ? this.responseIdParam : this.responseIdFromStateService
            this.initializeResponseDocuments(Number(requestId));
        }
        

        if (this.sourceIdParam) {
            this.getRequestObjDetails(Number(this.sourceIdParam));
        }
        this.stateService.currentRequestHasBeenSaved$
            .pipe(takeUntil(this.destroy$))
            .subscribe((hasBeenSaved) => {
                this.requestId = this.stateService.getRequestId();
                if (hasBeenSaved && this.requestId) {
                    if (this.sourceIdParam) {
                        this.getRequestObjDetails(Number(this.sourceIdParam));
                    } else if (this.requestId) {
                        this.getRequestObjDetails(this.requestId);
                    }
                }
            });

        this.requestFinalReviewDetailsForm = this.fb.group({
            requestName: [''],
            category: [''],
            requestType: [''],
            publishDate: [''],
            publishTime: [''],
            openDate: [''],
            openTime: [''],
            contractStart: [''],
            contractEnd: [''],
            decisionMakers: this.fb.array([]),
            requestDocuments: this.fb.array([])
        });
    }

    initializeRequestDocuments(): void {
        this.requestService.GetRequestRequiredDocumentsById(Number(this.sourceIdParam)).subscribe({
            next: (response) => {
                // Map the API response to match your template expectations
                this.requiredDocumentsDatasource = response.documents.map((doc: { requestDocumentId: any; documentName: any; requiresNotarization: any; }) => ({
                    id: doc.requestDocumentId, // or doc.documentId, depending on your needs
                    notarizationRequired: doc.requiresNotarization,
                    documentStatus: this.getDocumentStatus(doc),
                    ...doc
                }));
                console.log('Request documents initialized successfully.', this.requiredDocumentsDatasource);
            },
            error: (error) => {
                console.error('Error initializing request documents:', error);
            }
        });
    }

    initializeResponseDocuments(requestId: number): void {
        this.requestService.GetRequestRequiredDocumentsById(requestId).subscribe({
            next: (response) => {
                this.offerorDocumentsDatasource = response.documents.map((doc: any) => ({
                    ...doc
                }));
                console.log('Offeror documents initialized successfully.', this.offerorDocumentsDatasource);
            },
            error: (error) => {
                console.error('Error initializing offeror documents:', error);
            }
        });
    }

    // Helper method to determine document status
    private getDocumentStatus(doc: any): string {
        if (doc.fileName) {
            return 'Complete';
        } else if (doc.required) {
            return 'Incomplete';
        } else {
            return 'Optional';
        }
    }

    ngOnDestroy(): void {
        this.destroy$.next();
        this.destroy$.complete();
    }

    getRequestObjDetails(requestId: number) {
        const request$ = this.requestService.GetRequestDetailsById(requestId);
        const requestTypes$ = this.requestService.GetRequestTypes();
        const decisionMakers$ = this.requestService.GetDecisionMakers();
        const requiredRequestDocuments$ = this.requestService.GetRequestRequiredDocumentsById(requestId);

        forkJoin([request$, requestTypes$, decisionMakers$, requiredRequestDocuments$])
            .pipe(takeUntil(this.destroy$))
            .subscribe(
                ([request, requestTypes, decisionMakers, requiredRequestDocuments]) => {
                    const category = this.findCategoryById(request.categoryId);
                    const requestType = requestTypes.find((r: { requestTypeId: number }) => r.requestTypeId === request.requestTypeId);

                    const decisionMakersMapped = request.decisionMakerSelections.map((selection: { decisionMakerId: number }) =>
                        decisionMakers.find((dm: { decisionMakerId: number }) => dm.decisionMakerId === selection.decisionMakerId)
                    ).filter((dm: any) => dm);

                    const requestDocuments = requiredRequestDocuments.documents;

                    const { date: publishDate } = this.splitDateTime(request.publishDate);
                    const { date: openDate } = this.splitDateTime(request.openDate);
                    const { date: contractStart } = this.splitDateTime(request.contractStart);
                    const { date: contractEnd } = this.splitDateTime(request.contractEnd);
                    
                    this.requestFinalReviewDetails = {
                        ...request,
                        category,
                        requestType,
                        decisionMakers: decisionMakersMapped,
                        requestDocuments,
                        openDate,
                        publishDate,
                        contractStart,
                        contractEnd,
                    };

                    this.requestFinalReviewDetailsForm.patchValue({
                        requestName: request.requestName,
                        category: category?.name || '',
                        requestType: requestType?.requestTypeDesc || '',
                        publishDate: this.formatDateTime(request.publishDate),
                        openDate: this.formatDateTime(request.openDate),
                        contractStart: contractStart,
                        contractEnd: contractEnd
                    });
                    this.populateArrayFormControls('decisionMakers', decisionMakersMapped);
                    this.populateArrayFormControls('requestDocuments', requiredRequestDocuments);
                },
                error => {
                    console.error('Error fetching data', error);
                }
            );
    }

    private formatDateTime(dateString: string): string {
        if (!dateString) return '';

        const date = new Date(dateString);
        const formattedDate = date.toLocaleDateString('en-US');
        const formattedTime = date.toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: '2-digit',
            hour12: true
        }); // HH:mm AM/PM
        return `${formattedDate} at ${formattedTime}`;
    }

    findCategoryById(categoryId: number): CategoryNode | null {
        if (!categoryId) return null;
        const categoryIdToFind = categoryId.toString();

        const search = (categories: CategoryNode[]): CategoryNode | null => {
            for (const category of categories) {
                if (
                    category.categoryId === categoryIdToFind ||
                    category.id?.toString() === categoryIdToFind
                ) {
                    return category;
                }
                if (category.children) {
                    const found = search(category.children);
                    if (found) return found;
                }
            }
            return null;
        };

        return search(this.hierarchicalCategories);
    }

    prepareCategoriesForTreeRendering(categories: CategoryNode[], level: number = 0): CategoryNode[] {
        return categories
            .filter(cat => !cat.deleted)
            .map(category => ({
                ...category,
                categoryId: category.id?.toString() ?? '',
                level,
                expandable: !!category.children?.length,
                children: category.children?.length
                    ? this.prepareCategoriesForTreeRendering(category.children, level + 1)
                    : undefined
            }));
    }

    splitDateTime(dateTimeString: string): { date: string; time: string } {
        const utcDate = new Date(dateTimeString + 'Z');
        const dateOptions: Intl.DateTimeFormatOptions = {
            month: '2-digit',
            day: '2-digit',
            year: 'numeric',
        };
        const timeOptions: Intl.DateTimeFormatOptions = {
            hour: '2-digit',
            minute: '2-digit',
            hour12: false
        };
        return {
            date: new Intl.DateTimeFormat('en-US', dateOptions).format(utcDate),
            time: utcDate.toLocaleTimeString(undefined, timeOptions), // Convert to local time
        };
    }

    populateArrayFormControls(controlName: string, items: any[]) {
        const controlArray = this.requestFinalReviewDetailsForm.get(controlName) as FormArray;
        controlArray.clear();
        items?.forEach(item => {
            controlArray.push(this.fb.control(item.name || item));
        });
    }

    onSubmit() {
        const requestIdToUse = this.stateService.getRequestId();
        if (!requestIdToUse) {
            console.error('Error: No valid requestId found.');
            return;
        }

        // Update the request status to 'Scheduled' once users finalize review
        this.requestService.UpdateRequestStatus(requestIdToUse, 2)
            .pipe(takeUntil(this.destroy$))
            .subscribe({
                next: (response) => {
                    console.log('Request status updated successfully:', response);
                    this.snackBar.open('Request successfully submitted!', '', {
                        duration: 5000,
                        verticalPosition: 'top'
                    });
                    this.router.navigate(['/requests-view']);
                },
                error: (err) => {
                    console.error('Failed to update request status:', err);
                }
            });
    }
}