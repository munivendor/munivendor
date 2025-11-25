import {
  Component,
  Input,
  OnInit,
  OnDestroy,
  Output,
  EventEmitter,
} from '@angular/core';
import { RouterModule } from '@angular/router';
import {
  FormGroup,
  FormBuilder,
  ReactiveFormsModule,
  FormArray,
} from '@angular/forms';
import { CommonModule } from '@angular/common';
import { MatFormField } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { forkJoin, Subject, takeUntil } from 'rxjs';
import { RequestService } from '../Request/services/request.service';
import { StateService } from '../Request/services/state.service';
import { CategoryNode } from '../shared/model/category-tree.model';
import { CategoryHierarchyService } from '../Request/services/category-hierarchy.service';
import { MatTableModule } from '@angular/material/table';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { DocumentService } from '../shared/service/document.service';
import { MatButtonModule } from '@angular/material/button';
import { SubmitConfirmationDialogComponent } from './SubmitConfirmationDialog/submit-confirmation-dialog.component';
import { MatDialog } from '@angular/material/dialog';
// import { TooltipDirective } from '../shared/directive/tooltip.directive';
import { OfferorProfileService } from '../shared/service/offeror-profile.service';
import { LoggingService } from '../exceptionhandling/logging.service';
import { LoadingService } from '../shared/LoadingSpinner/loading.service';

interface FlattenedCategoryNode {
  categoryId: string;
  name: string;
  parentId: string | null;
}

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
    MatButtonModule,
    // TooltipDirective,
  ],
})
export class ResponseReviewComponent implements OnInit, OnDestroy {
  @Output() documentsValidityChange = new EventEmitter<boolean>();
  allRequiredDocumentsUploaded = false;
  hasOfferorDocuments = false;

  @Input() sourceIdParam?: string | null | undefined;
  @Input() responseIdParam?: string | null | undefined;
  responseIdFromStateService = this.stateService.getRequestId();
  private destroy$ = new Subject<void>();
  flattenedCategories: FlattenedCategoryNode[] = [];

  requestId!: number | null;
  requestFinalReviewDetailsForm!: FormGroup;
  requestFinalReviewDetails: any = {};
  offerorFinalReviewDetailsForm!: FormGroup;
  organizationId = this.stateService.getOrganizationId();
  docs: any;
  hierarchicalCategories: CategoryNode[] = [];

  requiredDocumentsDatasource: any[] = [];
  agencyDocumentsColumns: string[] = [
    'formName',
    'notarizationRequired',
    'download',
    'documentInstanceStatus',
  ];

  offerorDocumentsDatasource: any[] = [];
  offerorDocumentsColumns: string[] = ['formName', 'download'];
  authorizingOfficialId: number | null = null;

  constructor(
    private fb: FormBuilder,
    private requestService: RequestService,
    private stateService: StateService,
    private categoryHierarchyService: CategoryHierarchyService,
    private documentService: DocumentService,
    public dialog: MatDialog,
    private offerorProfileService: OfferorProfileService,
    private loggingService: LoggingService,
    private loadingService: LoadingService
  ) {}

  onConfirmSubmission() {
    this.openSubmitConfirmationDialog();
  }

  openSubmitConfirmationDialog(): void {
    const requestId = this.responseIdParam
      ? Number(this.responseIdParam)
      : this.responseIdFromStateService;
    this.dialog.open(SubmitConfirmationDialogComponent, {
      width: '600px',
      disableClose: true,
      data: { responseId: requestId },
    });
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
      return;
    }

    const isIncompleteOrNull =
      !documentInstanceStatus || documentInstanceStatus === 'Incomplete';
    this.loadingService.show('Downloading...');
    if (isIncompleteOrNull) {
      if (derived) {
        if (!organizationDocumentId || !agencyOrganizationId) {
          return;
        }
        this.requestService
          .GetAgencySpecificDocumentContent(
            organizationDocumentId,
            agencyOrganizationId
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
                  requestId: requestId,
                  organizationId: this.stateService.getOrganizationId(),
                  organizationDocumentId: organizationDocumentId,
                  agencyOrganizationId: agencyOrganizationId,
                  correlationId: correlationId,
                  methodName: 'onDownloadRequiredAgencyDocuments',
                  className: 'ResponseReviewComponent',
                  operation: 'GetAgencySpecificDocumentContent',
                  userId: this.stateService.getUserId(),
                }
              );
            },
          });
      } else {
        this.documentService.GetStateDocumentContent(documentId).subscribe({
          next: (response) => {
            const blob = response.body;
            if (!blob) return;

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
                documentId: documentId,
                correlationId: correlationId,
                methodName: 'onDownloadRequiredAgencyDocuments',
                className: 'ResponseReviewComponent',
                operation: 'GetStateDocumentContent',
                userId: this.stateService.getUserId(),
              }
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
              requestId: requestId,
              organizationId: this.stateService.getOrganizationId(),
              requestDocumentId: requestDocumentId,
              correlationId: correlationId,
              methodName: 'onDownloadRequiredAgencyDocuments',
              className: 'ResponseReviewComponent',
              operation: 'GetDocumentInstance',
              userId: this.stateService.getUserId(),
            }
          );
        },
      });
    }
  }

  onDownloadOfferorDocument(row: { requestDocumentId: number }): void {
    const requestDocumentId = row.requestDocumentId;
    if (!requestDocumentId) {
      return;
    }
    this.loadingService.show('Downloading...');
    this.requestService.GetOfferorDocumentContent(requestDocumentId).subscribe({
      next: (response) => {
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
            requestId: this.stateService.getRequestId(),
            organizationId: this.stateService.getOrganizationId(),
            requestDocumentId: requestDocumentId,
            correlationId: correlationId,
            methodName: 'onDownloadOfferorDocument',
            className: 'ResponseReviewComponent',
            operation: 'GetOfferorDocumentContent',
            userId: this.stateService.getUserId(),
          }
        );
      },
    });
  }

  private flattenCategories(
    categories: CategoryNode[],
    parentId: string | null = null
  ): FlattenedCategoryNode[] {
    const flattened: FlattenedCategoryNode[] = [];

    for (const category of categories) {
      flattened.push({
        categoryId: category.categoryId || category.id?.toString() || '',
        name: category.name || '',
        parentId: parentId,
      });

      if (category.children && category.children.length > 0) {
        flattened.push(
          ...this.flattenCategories(
            category.children,
            category.categoryId || category.id?.toString() || ''
          )
        );
      }
    }

    return flattened;
  }

  displayCategoryName = (value: string | number | null): string => {
    if (value == null) {
      return '';
    }

    const searchValue = value.toString();
    const match = this.flattenedCategories.find(
      (cat) => cat.categoryId === searchValue
    );
    if (match) {
      return this.buildBreadcrumbPath(match);
    }

    return typeof value === 'string' ? value : '';
  };

  private buildBreadcrumbPath(node: FlattenedCategoryNode): string {
    const path = [node.name];
    let currentParentId = node.parentId;

    while (currentParentId) {
      const parentNode = this.flattenedCategories.find(
        (cat) => cat.categoryId === currentParentId
      );
      if (parentNode) {
        path.unshift(parentNode.name);
        currentParentId = parentNode.parentId;
      } else {
        break;
      }
    }

    return path.join(' > ');
  }

  ngOnInit() {
    this.loadingService.show();
    this.categoryHierarchyService
      .GetCategoryHierarchy()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (categories) => {
          this.hierarchicalCategories =
            this.prepareCategoriesForTreeRendering(categories);
          this.flattenedCategories = this.flattenCategories(
            this.hierarchicalCategories
          );

          if (this.responseIdParam) {
            this.loadResponseRequest(Number(this.responseIdParam));
          } else if (this.responseIdFromStateService) {
            this.loadResponseRequest(this.responseIdFromStateService);
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
        },
        error: (error: any) => {
          this.loadingService.hide();
          const correlationId = error?.error?.correlationId;

          this.loggingService.logException(
            new Error(`HTTP Error ${error.status}: ${error.statusText}`),
            3,
            {
              requestId: this.requestId,
              organizationId: this.organizationId,
              correlationId: correlationId,
              methodName: 'ngOnInit',
              className: 'ResponseBasicsComponent',
              operation: 'GetCategoryHierarchy',
              userId: this.stateService.getUserId(),
            }
          );
        },
      });

    this.initializeDocuments();

    this.requestFinalReviewDetailsForm = this.fb.group({
      requestName: [''],
      category: [''],
      requestType: [''],
      publishDate: [''],
      closeDate: [''],
      contractStart: [''],
      contractEnd: [''],
      requestDocuments: this.fb.array([]),
    });

    this.offerorFinalReviewDetailsForm = this.fb.group({
      responseName: [''],
      authorizingOfficial: [''],
    });
  }

  public initializeDocuments(): void {
    const requestId = this.responseIdParam
      ? Number(this.responseIdParam)
      : Number(this.responseIdFromStateService);

    this.requestService
      .GetRequestRequiredDocumentsById(Number(requestId))
      .subscribe({
        next: (response) => {
          const documents = response.documents || [];

          const requiredDocs = documents.filter(
            (doc: any) => doc.sourceRequestDocumentId !== null
          );
          const offerorDocs = documents.filter(
            (doc: any) => doc.sourceRequestDocumentId === null
          );

          this.requiredDocumentsDatasource = requiredDocs;
          this.offerorDocumentsDatasource = offerorDocs;

          this.checkRequiredDocumentsStatus();
        },
        error: (error) => {
          const correlationId = error?.error?.correlationId;

          this.loggingService.logException(
            new Error(`HTTP Error ${error.status}: ${error.statusText}`),
            3,
            {
              requestId: requestId,
              organizationId: this.stateService.getOrganizationId(),
              correlationId: correlationId,
              methodName: 'initializeDocuments',
              className: 'ResponseReviewComponent',
              operation: 'GetRequestRequiredDocumentsById',
              userId: this.stateService.getUserId(),
            }
          );

          if (error.status === 422) {
            return;
          }
        },
      });
  }

  private checkRequiredDocumentsStatus(): void {
    this.allRequiredDocumentsUploaded = this.requiredDocumentsDatasource.every(
      (doc: any) =>
        doc.documentInstanceStatus &&
        doc.documentInstanceStatus !== 'Incomplete'
    );

    this.hasOfferorDocuments = this.offerorDocumentsDatasource.length > 0;

    const isValid =
      this.allRequiredDocumentsUploaded && this.hasOfferorDocuments;
    this.documentsValidityChange.emit(isValid);
  }

  get canSubmit(): boolean {
    return this.allRequiredDocumentsUploaded && this.hasOfferorDocuments;
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadResponseRequest(responseId: number): void {
    const request$ = this.requestService.GetRequestDetailsById(responseId);
    const authorizingOfficials$ =
      this.offerorProfileService.GetOfferorAuthorizingOfficials(
        Number(this.organizationId)
      );

    forkJoin([request$, authorizingOfficials$])
      .pipe(takeUntil(this.destroy$))
      .subscribe(
        ([response, authorizingOfficials]) => {
          // Find the matching authorizing official by ID
          const authorizingOfficial = authorizingOfficials.find(
            (official: { vendorAuthorizingOfficialId: number }) =>
              official.vendorAuthorizingOfficialId ===
              response.authorizingOfficialId
          );

          this.offerorFinalReviewDetailsForm.patchValue({
            responseName: response.requestName,
            authorizingOfficial: authorizingOfficial
              ? `${authorizingOfficial.firstName} ${authorizingOfficial.lastName}`
              : 'Not assigned',
          });

          if (response.sourceRequestId) {
            this.getRequestObjDetails(response.sourceRequestId);
          }
        },
        (error: any) => {
          const correlationId = error?.error?.correlationId;
          const errorUrl = error?.url?.toLowerCase?.() || '';

          const operationMap: Record<string, string> = {
            // request is response in this case
            requestdetails: 'GetRequestDetailsById',
            authorizingofficials: 'GetOfferorAuthorizingOfficials',
          };

          const operation =
            Object.entries(operationMap).find(([key]) =>
              errorUrl.includes(key)
            )?.[1] ?? 'UnknownOperation';

          this.loggingService.logException(
            new Error(`HTTP Error ${error.status}: ${error.statusText}`),
            3,
            {
              requestId: this.stateService.getRequestId(),
              organizationId: this.stateService.getOrganizationId(),
              correlationId: correlationId,
              methodName: 'loadResponseRequest',
              className: 'ResponseReviewComponent',
              operation: operation,
              userId: this.stateService.getUserId(),
            }
          );

          if (error.status === 422) {
            return;
          }
        }
      );
  }

  getRequestObjDetails(requestId: number) {
    const request$ = this.requestService.GetRequestDetailsById(requestId);
    const requestTypes$ = this.requestService.GetRequestTypes();

    forkJoin([request$, requestTypes$])
      .pipe(takeUntil(this.destroy$))
      .subscribe(
        ([request, requestTypes]) => {
          const categoryBreadcrumb = this.displayCategoryName(
            request.categoryId
          );

          const requestType = requestTypes.find(
            (r: { requestTypeId: number }) =>
              r.requestTypeId === request.requestTypeId
          );

          const { date: contractStart } = this.splitDateTime(
            request.contractStart
          );
          const { date: contractEnd } = this.splitDateTime(request.contractEnd);

          this.requestFinalReviewDetails = {
            ...request,
            categoryBreadcrumb,
            requestType,
            contractStart,
            contractEnd,
          };
          this.requestFinalReviewDetailsForm.patchValue({
            requestName: request.requestName,
            category: categoryBreadcrumb,
            requestType: requestType?.requestTypeDesc || '',
            publishDate: this.formatDateTime(request.publishDate),
            closeDate: this.formatDateTime(request.closeDate),
            contractStart: contractStart,
            contractEnd: contractEnd,
          });
          this.loadingService.hide();
        },
        (error) => {
          this.loadingService.hide();
          const correlationId = error?.error?.correlationId;
          const errorUrl = error?.url?.toLowerCase?.() || '';

          const operationMap: Record<string, string> = {
            requestdetails: 'GetRequestDetailsById',
            requesttypes: 'GetRequestTypes',
          };

          const operation =
            Object.entries(operationMap).find(([key]) =>
              errorUrl.includes(key)
            )?.[1] ?? 'UnknownOperation';

          this.loggingService.logException(
            new Error(`HTTP Error ${error.status}: ${error.statusText}`),
            3,
            {
              requestId: requestId,
              organizationId: this.organizationId,
              correlationId: correlationId,
              methodName: 'getRequestObjDetails',
              className: 'ResponseReviewComponent',
              operation: operation,
              userId: this.stateService.getUserId(),
            }
          );

          if (error.status === 422) {
            return;
          }
        }
      );
  }

  private formatDateTime(dateString: string): string {
    if (!dateString) return '';

    const date = new Date(
      dateString.includes('Z') ? dateString : dateString + 'Z'
    );

    if (isNaN(date.getTime())) return '';

    const formattedDate = date.toLocaleDateString('en-US');

    const hasTime = dateString.includes('T') || dateString.includes(':');

    if (hasTime) {
      const formattedTime = date.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      });
      return `${formattedDate} at ${formattedTime}`;
    }

    return formattedDate;
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

  prepareCategoriesForTreeRendering(
    categories: CategoryNode[],
    level: number = 0
  ): CategoryNode[] {
    return categories
      .filter((cat) => !cat.deleted)
      .map((category) => ({
        ...category,
        categoryId: category.id?.toString() ?? '',
        level,
        expandable: !!category.children?.length,
        children: category.children?.length
          ? this.prepareCategoriesForTreeRendering(category.children, level + 1)
          : undefined,
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
      hour12: false,
    };
    return {
      date: new Intl.DateTimeFormat('en-US', dateOptions).format(utcDate),
      time: utcDate.toLocaleTimeString(undefined, timeOptions),
    };
  }

  populateArrayFormControls(controlName: string, items: any[]) {
    const controlArray = this.requestFinalReviewDetailsForm.get(
      controlName
    ) as FormArray;
    controlArray.clear();
    items?.forEach((item) => {
      controlArray.push(this.fb.control(item.name || item));
    });
  }
}
