import {
  Component,
  OnInit,
  OnDestroy,
  ViewChild,
  TemplateRef,
  Input,
} from '@angular/core';
import { finalize, Subject, takeUntil } from 'rxjs';
import { CommonModule } from '@angular/common';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { RequestConfirmationDialog } from '../RequestConfirmationDialog/request-confirmation-dialog.component';
import { RequestService } from '../services/request.service';
import { Request } from '../model/request.model';
import { MatTableModule, MatTableDataSource } from '@angular/material/table';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatSort, MatSortModule } from '@angular/material/sort';
import { FormBuilder, ReactiveFormsModule, FormControl } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatNativeDateModule } from '@angular/material/core';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatSelectModule } from '@angular/material/select';
import { MatInputModule } from '@angular/material/input';
import { MatMenuModule } from '@angular/material/menu';
import { MatIconModule } from '@angular/material/icon';
import { CustomCategoryDropdownComponent } from '../../shared/CustomCategoryDropdown/custom-category-dropdown.component';
import { StateService } from '../services/state.service';
import { CategoryNode } from '../../shared/model/category-tree.model';
import { ChangeDetectorRef } from '@angular/core';
import { LoadingService } from '../../shared/LoadingSpinner/loading.service';
import { LoggingService } from '../../exceptionhandling/logging.service';
import { SnackbarNotificationService } from '../../shared/service/snackbar-notification.service';
import { HttpClient } from '@angular/common/http';
import { TooltipDirective } from '../../shared/directive/tooltip.directive';
import { FilterStateService } from '../../shared/service/filter-state.service';

interface FlattenedCategoryNode {
  categoryId: string;
  name: string;
  parentId: string | null;
}

// Agency request status IDs
const AGENCY_STATUS = {
  DRAFT: 1,
  SCHEDULED: 2,
  LIVE: 3,
  CLOSED: 4,
  CANCELLED: 5,
  OPENED: 6,
  LIVE_WITH_ADDENDUM: 10,
} as const;

const ACTION_PERMISSIONS: {
  [statusId: number]: {
    edit?: boolean;
    delete?: boolean;
    cancel?: boolean;
    open?: boolean;
    redownload?: boolean;
    duplicate?: boolean;
    addendum?: boolean;
  };
} = {
  [AGENCY_STATUS.DRAFT]: { edit: true, delete: true, duplicate: true },
  [AGENCY_STATUS.SCHEDULED]: { edit: true, delete: true, duplicate: true },
  [AGENCY_STATUS.LIVE]: { cancel: true, duplicate: true, addendum: true },
  [AGENCY_STATUS.CLOSED]: { open: true, duplicate: true },
  [AGENCY_STATUS.CANCELLED]: { duplicate: true },
  [AGENCY_STATUS.OPENED]: { redownload: true, duplicate: true },
  [AGENCY_STATUS.LIVE_WITH_ADDENDUM]: {
    cancel: true,
    duplicate: true,
    addendum: true,
  },
};

// Maps status ID to the display string shown in the UI
function agencyStatusIdToDesc(statusId: number): string {
  switch (statusId) {
    case AGENCY_STATUS.DRAFT:
      return 'Draft';
    case AGENCY_STATUS.SCHEDULED:
      return 'Scheduled';
    case AGENCY_STATUS.LIVE:
      return 'Live';
    case AGENCY_STATUS.CLOSED:
      return 'Closed';
    case AGENCY_STATUS.CANCELLED:
      return 'Cancelled';
    case AGENCY_STATUS.OPENED:
      return 'Opened';
    case AGENCY_STATUS.LIVE_WITH_ADDENDUM:
      return 'Live';
    default:
      return '';
  }
}

@Component({
  selector: 'request-tabledetails',
  standalone: true,
  templateUrl: './request-tabledetails.component.html',
  styleUrls: ['./request-tabledetails.component.css'],
  imports: [
    CommonModule,
    MatFormFieldModule,
    MatInputModule,
    MatTableModule,
    MatSortModule,
    MatPaginatorModule,
    MatSelectModule,
    MatCheckboxModule,
    MatDatepickerModule,
    MatCardModule,
    MatNativeDateModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatAutocompleteModule,
    MatDialogModule,
    MatMenuModule,
    MatIconModule,
    CustomCategoryDropdownComponent,
    TooltipDirective,
  ],
})
export class AgencyTableDetailsComponent implements OnInit, OnDestroy {
  hasLoadedData = false;
  private destroy$ = new Subject<void>();
  @Input() categoryControl!: FormControl<number | null>;

  hierarchicalCategories: CategoryNode[] = [];
  flattenedCategories: FlattenedCategoryNode[] = [];

  canPerformAction(
    request: any,
    action: 'edit' | 'delete' | 'cancel' | 'open' | 'redownload' | 'duplicate',
  ): boolean {
    const statusId = request.agencyRequestStatus?.requestStatusId;
    return !!ACTION_PERMISSIONS[statusId]?.[action];
  }

  canDownloadPDF(request: any): boolean {
    const statusId = request.agencyRequestStatus?.requestStatusId;
    return statusId !== AGENCY_STATUS.DRAFT;
  }

  filterForm = this.fb.group({
    requestName: [''],
    category: new FormControl<string | number | null>(null),
    requestId: [''],
    publishDateFrom: [null],
    publishDateTo: [null],
    closeDateFrom: [null],
    closeDateTo: [null],
    draft: [false],
    scheduled: [false],
    live: [false],
    closed: [false],
    cancelled: [false],
    opened: [false],
    inProgress: [false],
    submitted: [false],
    none: [false],
    competitiveContracting: [false],
    rfq: [false],
    rfp: [false],
    bidPublicWorks: [false],
    bidGoodsServices: [false],
    nonFairOpenProfessionalServices: [false],
    extraordinaryUnspecifiableServices: [false],
    quotationsUnderThreshold: [false],
  });

  displayedColumns: string[] = [
    'requestName',
    'requestId',
    'requestType',
    'category',
    'publishDate',
    'closeDateAndTime',
    'requestStatus',
    'numberOfOffers',
    'actions',
    'downloadPDF',
  ];

  joinedRequestData: Request[] = [];
  dataSource = new MatTableDataSource<any>();
  organizationId: number = this.stateService.getOrganizationId() ?? 0;

  @ViewChild(MatPaginator)
  paginator!: MatPaginator;
  @ViewChild(MatSort)
  sort!: MatSort;
  @ViewChild('offersDialog') offersDialog!: TemplateRef<any>;

  constructor(
    public dialog: MatDialog,
    private requestService: RequestService,
    private fb: FormBuilder,
    private stateService: StateService,
    private cdr: ChangeDetectorRef,
    private loadingService: LoadingService,
    private loggingService: LoggingService,
    private snackbarNotificationService: SnackbarNotificationService,
    private http: HttpClient,
    private filterStateService: FilterStateService,
  ) {}

  readonly requestTypeMap = {
    competitiveContracting: 1,
    rfq: 2,
    rfp: 3,
    bidPublicWorks: 4,
    bidGoodsServices: 5,
    nonFairOpenProfessionalServices: 6,
    extraordinaryUnspecifiableServices: 7,
    quotationsUnderThreshold: 8,
  };

  // 'live' checkbox sends both IDs 3 and 10 to the backend
  readonly requestStatusMap: { [key: string]: number | number[] } = {
    draft: AGENCY_STATUS.DRAFT,
    scheduled: AGENCY_STATUS.SCHEDULED,
    live: [AGENCY_STATUS.LIVE, AGENCY_STATUS.LIVE_WITH_ADDENDUM],
    closed: AGENCY_STATUS.CLOSED,
    cancelled: AGENCY_STATUS.CANCELLED,
    opened: AGENCY_STATUS.OPENED,
  };

  readonly AVAILABLE_ACTIONS = [
    'edit',
    'delete',
    'cancel',
    'open',
    'redownload',
    'duplicate',
    'addendum',
  ] as const;

  displayCategoryName = (
    categoryId: string | number | null,
    categoryFullPath?: string,
  ): string => {
    if (categoryFullPath) {
      return categoryFullPath;
    }

    if (categoryId == null) {
      return '';
    }

    const searchValue = categoryId.toString();
    const match = this.flattenedCategories.find(
      (cat) => cat.categoryId === searchValue,
    );
    if (match) {
      return this.buildBreadcrumbPath(match);
    }

    return typeof categoryId === 'string' ? categoryId : '';
  };

  private buildBreadcrumbPath(node: FlattenedCategoryNode): string {
    const path = [node.name];
    let currentParentId = node.parentId;

    while (currentParentId) {
      const parentNode = this.flattenedCategories.find(
        (cat) => cat.categoryId === currentParentId,
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

  prepareCategoriesForTreeRendering(
    categories: CategoryNode[],
    level: number = 0,
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

  getAvailableActions(request: any): string[] {
    const statusId = request.agencyRequestStatus?.requestStatusId;
    const actionsForStatus = ACTION_PERMISSIONS[statusId] || {};
    return this.AVAILABLE_ACTIONS.filter((action) => actionsForStatus[action]);
  }

  ngOnInit(): void {
    const saved = this.filterStateService.load();
    this.filterForm.patchValue(saved ?? {});

    this.filterForm.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(
        ({
          requestName,
          category,
          requestId,
          publishDateFrom,
          publishDateTo,
          closeDateFrom,
          closeDateTo,
          ...checkboxes
        }) => {
          this.filterStateService.save(checkboxes);
        },
      );

    if (!this.organizationId) {
      setTimeout(() => {
        this.organizationId = this.stateService.getOrganizationId() ?? 0;
        if (this.organizationId) this.onSearch();
      }, 100);
    } else {
      this.onSearch();
    }
  }

  onSearch(): void {
    const formValues = this.filterForm.value;

    const selectedRequestType = Object.entries(this.requestTypeMap)
      .filter(([key]) => this.filterForm.get(key)?.value)
      .map(([, value]) => value);

    // Flatten since 'live' maps to [3, 10]
    const selectedRequestStatus = Object.entries(this.requestStatusMap)
      .filter(([key]) => this.filterForm.get(key)?.value)
      .flatMap(([, value]) => (Array.isArray(value) ? value : [value]));

    const params: any = {};

    if (formValues.requestName) {
      params.requestName = formValues.requestName.trim();
    }

    if (formValues.category) {
      params.categoryId = Number(formValues.category);
    }

    if (formValues.requestId) {
      params.requestId = Number(formValues.requestId);
    }

    if (formValues.publishDateFrom) {
      params.startPublishDate = new Date(
        formValues.publishDateFrom,
      ).toISOString();
    }

    if (formValues.publishDateTo) {
      params.endPublishDate = new Date(formValues.publishDateTo).toISOString();
    }

    if (formValues.closeDateFrom) {
      params.startCloseDate = new Date(formValues.closeDateFrom).toISOString();
    }

    if (formValues.closeDateTo) {
      params.endCloseDate = new Date(formValues.closeDateTo).toISOString();
    }

    if (selectedRequestType.length > 0) {
      params.requestTypeIds = selectedRequestType;
    }

    if (selectedRequestStatus.length > 0) {
      params.requestStatusIds = selectedRequestStatus;
    }

    this.loadAndJoinRequestData(params);
  }

  private async loadAndJoinRequestData(params?: any): Promise<void> {
    try {
      if (!this.organizationId) {
        this.dataSource = new MatTableDataSource<any>([]);
        this.hasLoadedData = false;
        return;
      }
      const requestParams = {
        organizationId: this.organizationId,
        ...(params || {}),
      };

      this.loadingService.show();

      this.requestService
        .GetRequestsAgencyView(requestParams)
        .pipe(
          takeUntil(this.destroy$),
          finalize(() => this.loadingService.hide()),
        )
        .subscribe({
          next: (requests) => {
            const requestsData = requests?.requests || [];
            this.hasLoadedData = requestsData.length > 0;

            const mappedData = requestsData.map((request: any) => {
              const agencyStatusId: number = request.agencyRequestStatusId;
              return {
                ...request,
                publishDate: request.publishDate
                  ? new Date(request.publishDate + 'Z')
                  : null,
                closeDate: request.closeDate
                  ? new Date(request.closeDate + 'Z')
                  : null,
                requestType: {
                  requestTypeId: request.requestTypeId,
                  requestTypeDesc: request.requestTypeName,
                },
                agencyRequestStatus: {
                  requestStatusId: agencyStatusId,
                  requestStatusDesc: agencyStatusIdToDesc(agencyStatusId),
                },
                submittedOffersCount: (request.responses || []).filter(
                  (r: any) => r.offerorRequestStatusId === 9,
                ).length,
              };
            });

            this.dataSource.data = mappedData;
            this.cdr.detectChanges();

            setTimeout(() => {
              if (this.paginator && !this.dataSource.paginator) {
                this.dataSource.paginator = this.paginator;
              }
              if (this.sort && !this.dataSource.sort) {
                this.dataSource.sortingDataAccessor = (
                  item: any,
                  property: string,
                ) => {
                  switch (property) {
                    case 'requestName':
                      return item.requestName?.toLowerCase() ?? '';
                    case 'requestId':
                      return item.requestId ?? '';
                    case 'requestType':
                      return (
                        item.requestType?.requestTypeDesc?.toLowerCase() ?? ''
                      );
                    case 'category':
                      return item.categoryFullPath?.toLowerCase() ?? '';
                    case 'publishDate':
                      return item.publishDate
                        ? new Date(item.publishDate).getTime()
                        : 0;
                    case 'closeDateAndTime':
                      return item.closeDate
                        ? new Date(item.closeDate).getTime()
                        : 0;
                    case 'requestStatus':
                      return (
                        item.agencyRequestStatus?.requestStatusDesc?.toLowerCase() ??
                        'draft'
                      );
                    case 'numberOfOffers':
                      return item.submittedOffersCount ?? 0;
                    default:
                      return '';
                  }
                };

                this.dataSource.sort = this.sort;
              }

              if (this.paginator) {
                this.paginator.firstPage();
              }
            }, 500);
          },
          error: (error: any) => {
            const correlationId = error?.error?.correlationId;

            this.loggingService.logException(
              new Error(`HTTP Error ${error.status}: ${error.statusText}`),
              3,
              {
                organizationId: this.organizationId,
                correlationId: correlationId,
                methodName: 'loadAndJoinRequestData',
                className: 'AgencyTableDetailsComponent',
                operation: 'GetRequestsAgencyView',
                userId: this.stateService.getUserId(),
              },
            );

            this.dataSource.data = [];
            this.hasLoadedData = false;
          },
        });
    } catch (error: any) {
      this.dataSource.data = [];
    }
  }

  openOffersDialog(request: any): void {
    const submittedOffers = (request.responses || []).filter(
      (r: any) => r.offerorRequestStatusId === 9,
    );

    const formattedOffers = submittedOffers.map((offer: any) => ({
      offerorName: offer.organizationName,
      submittedDate: new Date(offer.submittedDate + 'Z'),
    }));

    this.dialog.open(this.offersDialog, {
      width: '600px',
      data: {
        requestId: request.requestId,
        requestName: request.requestName,
        offers: formattedOffers,
      },
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  openConfirmationDialog(action: string, request: any): void {
    const dialogRef = this.dialog.open(RequestConfirmationDialog, {
      width: '600px',
      data: { action, request },
    });

    dialogRef.componentInstance.onCancelUpdateRequestStatus =
      this.onCancelUpdateRequestStatus.bind(this);

    dialogRef.componentInstance.statusUpdated
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (updateData: any) => {
          this.updateRequestStatusInTable(
            updateData.requestId,
            updateData.newStatusId,
            updateData.newStatusDesc,
          );
        },
      });

    dialogRef.componentInstance.cancellationRequested
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (cancelData: any) => {
          this.onCancelUpdateRequestCancelReason(
            cancelData.request,
            cancelData.reasonId,
            cancelData.reasonNote,
          );
          this.onCancelUpdateRequestStatus(
            cancelData.request,
            cancelData.action,
          );
        },
      });

    dialogRef
      .afterClosed()
      .pipe(takeUntil(this.destroy$))
      .subscribe((result) => {
        if (result && action === 'delete') {
          this.deleteRequest(request);
        }
        if (result && action === 'duplicate') {
          this.loadAndJoinRequestData();
        }
      });
  }

  private updateRequestStatusInTable(
    requestId: number,
    newStatusId: number,
    newStatusDesc: string,
  ): void {
    const currentData = this.dataSource.data;
    const updatedData = currentData.map((item: any) => {
      if (item.requestId === requestId) {
        return {
          ...item,
          agencyRequestStatus: {
            ...item.agencyRequestStatus,
            requestStatusId: newStatusId,
            requestStatusDesc: newStatusDesc,
          },
        };
      }
      return item;
    });

    this.dataSource.data = updatedData;
  }

  deleteRequest(request: any): void {
    this.requestService
      .DeleteRequest(request.requestId, request.organizationId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.loadAndJoinRequestData();
        },
        error: (error) => {
          const correlationId = error?.error?.correlationId;

          this.loggingService.logException(error, 3, {
            requestId: request?.requestId,
            organizationId: this.organizationId,
            correlationId: correlationId,
            methodName: 'deleteRequest',
            className: 'AgencyTableDetailsComponent',
            operation: 'DeleteRequest',
            userId: this.stateService.getUserId(),
          });
        },
      });
  }

  downloadSolicitation(request: any): void {
    const filename = this.generateSolicitationFilename(request);
    this.loadingService.show('Downloading...');

    this.http
      .post(
        '/api/generate-pdf/' + request.requestId,
        { html: '' },
        { responseType: 'blob' },
      )
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          const blob = new Blob([response], { type: 'application/pdf' });
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = filename;
          a.click();
          window.URL.revokeObjectURL(url);
          this.loadingService.hide();
          this.snackbarNotificationService.showSnackbarSuccess(
            'Solicitation downloaded successfully.',
          );
        },
        error: (error) => {
          this.loadingService.hide();

          const correlationId = error?.error?.correlationId;

          this.loggingService.logException(
            new Error(`HTTP Error ${error.status}: ${error.statusText}`),
            3,
            {
              requestId: request.requestId,
              organizationId: this.organizationId,
              correlationId: correlationId,
              methodName: 'downloadSolicitation',
              className: 'AgencyTableDetailsComponent',
              operation: 'GeneratePDF',
              userId: this.stateService.getUserId(),
            },
          );
        },
      });
  }

  private generateSolicitationFilename(request: any): string {
    const sanitize = (str: string): string => {
      return str
        .replace(/[^a-zA-Z0-9\s-_]/g, '')
        .replace(/\s+/g, '_')
        .trim();
    };

    const formatDate = (date: Date | string): string => {
      let utcDate: Date;

      if (typeof date === 'string') {
        utcDate = new Date(date + 'Z');
      } else {
        utcDate = date;
      }

      const month = String(utcDate.getMonth() + 1).padStart(2, '0');
      const day = String(utcDate.getDate()).padStart(2, '0');
      const year = utcDate.getFullYear();

      return `${month}-${day}-${year}`;
    };

    if (request) {
      const solicitationName = request.requestName || 'Unknown';
      const closeDate = request.closeDate
        ? formatDate(request.closeDate)
        : 'NoDate';
      return `Solicitation_${sanitize(solicitationName)}_${closeDate}.pdf`;
    }

    return 'Solicitation.pdf';
  }

  onCancelUpdateRequestStatus(request: any, action: string): void {
    const DRAFT_STATUS_ID = AGENCY_STATUS.DRAFT;
    const CANCELLED_STATUS_ID = AGENCY_STATUS.CANCELLED;

    if (action === 'cancel') {
      const statusId =
        request.agencyRequestStatus?.requestStatusId ??
        request.requestStatus?.requestStatusId;

      let newRequestStatusId: number;
      let newRequestStatusDesc: string;

      if (statusId === AGENCY_STATUS.SCHEDULED) {
        newRequestStatusId = DRAFT_STATUS_ID;
        newRequestStatusDesc = 'Draft';
      } else if (
        statusId === AGENCY_STATUS.LIVE ||
        statusId === AGENCY_STATUS.LIVE_WITH_ADDENDUM
      ) {
        newRequestStatusId = CANCELLED_STATUS_ID;
        newRequestStatusDesc = 'Cancelled';
      } else {
        console.warn('Unexpected Request status ID:', statusId);
        return;
      }

      this.requestService
        .UpdateRequestStatus(
          this.organizationId,
          request.requestId,
          newRequestStatusId,
        )
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => {
            this.joinedRequestData = this.joinedRequestData.map((i) => {
              if (i.requestId === request.requestId) {
                return {
                  ...i,
                  agencyRequestStatus: {
                    ...i.requestStatus,
                    requestStatusId: newRequestStatusId,
                    requestStatusDesc: newRequestStatusDesc,
                  },
                };
              }
              return i;
            });
            this.dataSource.data = this.joinedRequestData;
          },
          error: (error) => {
            const correlationId = error?.error?.correlationId;

            this.loggingService.logException(
              new Error(`HTTP Error ${error.status}: ${error.statusText}`),
              3,
              {
                requestId: request.requestId,
                newRequestStatusId,
                correlationId: correlationId,
                methodName: 'onCancelUpdateRequestStatus',
                className: 'AgencyTableDetailsComponent',
                operation: 'UpdateRequestStatus',
              },
            );
          },
        });
    }
  }

  onCancelUpdateRequestCancelReason(
    request: any,
    reasonId: number,
    reasonNote: string,
  ): void {
    this.requestService
      .UpdateRequestCancelReason(request.requestId, reasonId, reasonNote)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {},
        error: (error) => {
          const correlationId = error?.error?.correlationId;

          this.loggingService.logException(
            new Error(`HTTP Error ${error.status}: ${error.statusText}`),
            3,
            {
              requestId: request.requestId,
              reasonId: reasonId,
              reasonNote: reasonNote,
              correlationId: correlationId,
              methodName: 'onCancelUpdateRequestCancelReason',
              className: 'AgencyTableDetailsComponent',
              operation: 'UpdateRequestCancelReason',
            },
          );
        },
      });
  }
}
