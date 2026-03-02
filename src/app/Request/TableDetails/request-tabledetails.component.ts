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

interface FlattenedCategoryNode {
  categoryId: string;
  name: string;
  parentId: string | null;
}

const ACTION_PERMISSIONS: {
  [status: string]: {
    edit?: boolean;
    delete?: boolean;
    cancel?: boolean;
    open?: boolean;
    redownload?: boolean;
    duplicate?: boolean;
  };
} = {
  Draft: { edit: true, delete: true, duplicate: true },
  Scheduled: { edit: true, delete: true, duplicate: true },
  Live: { cancel: true, duplicate: true },
  Closed: { open: true, duplicate: true },
  Cancelled: { duplicate: true },
  Opened: { redownload: true, duplicate: true },
};

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
    const status = request.agencyRequestStatus?.requestStatusDesc;
    return !!ACTION_PERMISSIONS[status]?.[action];
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
    rfq: [false],
    rfp: [false],
    rfi: [false],
    bid: [false],
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
  ) {}

  readonly requestTypeMap = {
    rfi: 1,
    rfq: 2,
    rfp: 3,
    bid: 4,
  };

  readonly requestStatusMap = {
    draft: 1,
    scheduled: 2,
    live: 3,
    closed: 4,
    cancelled: 5,
    opened: 6,
  };

  readonly AVAILABLE_ACTIONS = [
    'edit',
    'delete',
    'cancel',
    'open',
    'redownload',
    'duplicate',
  ] as const;

  displayCategoryName = (
    categoryId: string | number | null,
    categoryFullPath?: string,
  ): string => {
    // If categoryFullPath is provided, use it directly
    if (categoryFullPath) {
      return categoryFullPath;
    }

    // Fallback to old logic for backwards compatibility
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
    const status = request.agencyRequestStatus?.requestStatusDesc;
    const actionsForStatus = ACTION_PERMISSIONS[status] || {};
    return this.AVAILABLE_ACTIONS.filter((action) => actionsForStatus[action]);
  }

  ngOnInit(): void {
    if (!this.organizationId) {
      setTimeout(() => {
        this.organizationId = this.stateService.getOrganizationId() ?? 0;
        if (this.organizationId) {
          this.loadAndJoinRequestData();
        }
      }, 100);
    } else {
      this.loadAndJoinRequestData();
    }
  }

  onSearch(): void {
    const formValues = this.filterForm.value;

    const selectedRequestType = Object.entries(this.requestTypeMap)
      .filter(([key]) => this.filterForm.get(key)?.value)
      .map(([, value]) => value);

    const selectedRequestStatus = Object.entries(this.requestStatusMap)
      .filter(([key]) => this.filterForm.get(key)?.value)
      .map(([, value]) => value);

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

      const combinedData: any[] = [];

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

            requestsData.forEach((request: any) => {
              // Map the friendly names from the API response
              const requestType = {
                requestTypeId: request.requestTypeId,
                requestTypeDesc: request.requestTypeName,
              };

              const agencyRequestStatus = {
                requestStatusId: request.agencyRequestStatusId,
                requestStatusDesc: request.agencyRequestStatusName,
              };

              const submittedOffersCount = (request.responses || []).filter(
                (r: any) => r.offerorRequestStatusId === 9,
              ).length;

              request.publishDate = request.publishDate
                ? new Date(request.publishDate + 'Z')
                : null;

              request.closeDate = request.closeDate
                ? new Date(request.closeDate + 'Z')
                : null;

              combinedData.push({
                ...request,
                requestType,
                agencyRequestStatus,
                submittedOffersCount,
              });
            });

            this.dataSource = new MatTableDataSource(combinedData);
            this.cdr.detectChanges();

            setTimeout(() => {
              if (this.paginator) {
                this.dataSource.paginator = this.paginator;
                this.paginator.firstPage();
              }
              if (this.sort) {
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
            }, 0);
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

            this.dataSource = new MatTableDataSource<any>([]);
            this.hasLoadedData = false;
          },
        });
    } catch (error: any) {
      this.dataSource = new MatTableDataSource<any>([]);
    }
  }

  // future for dynamic filtering of solicitation name
  // applyFilter(event: Event) {
  //   const filterValue = (event.target as HTMLInputElement).value;
  //   this.dataSource.filter = filterValue.trim().toLowerCase();

  //   if (this.dataSource.paginator) {
  //     this.dataSource.paginator.firstPage();
  //   }
  // }

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

  onCancelUpdateRequestStatus(request: any, action: string): void {
    const DRAFT_STATUS_ID = 1;
    const CANCELLED_STATUS_ID = 5;

    if (action === 'cancel') {
      const statusDesc = request.requestStatus.requestStatusDesc;
      let newRequestStatusId: number;
      let newRequestStatusDesc: string;

      if (statusDesc === 'Scheduled') {
        newRequestStatusId = DRAFT_STATUS_ID;
        newRequestStatusDesc = 'Draft';
      } else if (statusDesc === 'Live') {
        newRequestStatusId = CANCELLED_STATUS_ID;
        newRequestStatusDesc = 'Cancelled';
      } else {
        console.warn('Unexpected Request status:', statusDesc);
        return;
      }

      this.requestService
        .UpdateRequestStatus(request.requestId, newRequestStatusId)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => {
            this.joinedRequestData = this.joinedRequestData.map((i) => {
              if (i.requestId === request.requestId) {
                return {
                  ...i,
                  requestStatus: {
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
                newRequestStatusId: newRequestStatusId,
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

  onDuplicateRequest(request: any): void {
    this.requestService
      .DuplicateRequest(request.requestId, request.organizationId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.loadAndJoinRequestData();
        },
        error: (error) => {
          const correlationId = error?.error?.correlationId;
          this.loggingService.logException(
            new Error(`HTTP Error ${error.status}: ${error.statusText}`),
            3,
            {
              requestId: request.requestId,
              correlationId: correlationId,
              methodName: 'onDuplicateRequest',
              className: 'AgencyTableDetailsComponent',
              operation: 'DuplicateRequest',
            },
          );
        },
      });
  }
}
