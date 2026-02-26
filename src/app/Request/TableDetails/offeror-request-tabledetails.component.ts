import { CommonModule } from '@angular/common';
import {
  Component,
  inject,
  Input,
  OnDestroy,
  OnInit,
  ViewChild,
} from '@angular/core';
import { finalize, Subject, takeUntil } from 'rxjs';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatSort, MatSortModule } from '@angular/material/sort';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { RequestService } from '../services/request.service';
import { MatSelectModule } from '@angular/material/select';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatCardModule } from '@angular/material/card';
import { MatNativeDateModule } from '@angular/material/core';
import { FormBuilder, FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatMenuModule } from '@angular/material/menu';
import { MatIconModule } from '@angular/material/icon';
import { ConfirmationDialog } from '../RequestConfirmationDialog/confirmation-dialog.component';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { CustomCategoryDropdownComponent } from '../../shared/CustomCategoryDropdown/custom-category-dropdown.component';
import { StateService } from '../services/state.service';
import { CategoryNode } from '../../shared/model/category-tree.model';
import { ChangeDetectorRef } from '@angular/core';
import { LoadingService } from '../../shared/LoadingSpinner/loading.service';
import { LoggingService } from '../../exceptionhandling/logging.service';
import { HttpClient } from '@angular/common/http';
import { SnackbarNotificationService } from '../../shared/service/snackbar-notification.service';

interface FlattenedCategoryNode {
  categoryId: string;
  name: string;
  parentId: string | null;
}

@Component({
  selector: 'offeror-request-tabledetails',
  standalone: true,
  templateUrl: './offeror-request-tabledetails.component.html',
  styleUrls: ['./offeror-request-tabledetails.component.css'],
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
    MatMenuModule,
    MatIconModule,
    MatDialogModule,
    CustomCategoryDropdownComponent,
  ],
})
export class OfferorTableDetailsComponent implements OnInit, OnDestroy {
  hasLoadedData = false;
  private destroy$ = new Subject<void>();
  @Input() categoryControl!: FormControl<number | null>;
  organizationId!: number | null;
  hierarchicalCategories: CategoryNode[] = [];
  flattenedCategories: FlattenedCategoryNode[] = [];

  readonly AVAILABLE_ACTIONS = ['respond', 'delete', 'continue'] as const;

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
    const agencyStatus = request.agencyRequestStatus?.requestStatusDesc ?? '';
    const offerorStatus = request.offerorRequestStatus?.requestStatusDesc ?? '';
    const actions: string[] = [];

    if (agencyStatus === 'Closed' || offerorStatus === 'Submitted') {
      return actions;
    }

    if (agencyStatus === 'Live') {
      if (offerorStatus === 'None') {
        actions.push('respond');
      } else if (offerorStatus === 'In Progress') {
        actions.push('continue', 'delete');
      }
    } else if (
      ['Cancelled', 'Opened'].includes(agencyStatus) &&
      offerorStatus === 'Submitted'
    ) {
      actions.push('noneDisabled');
    }
    return actions;
  }

  openConfirmationDialog(action: string, request: any): void {
    const dialogRef = this.dialog.open(ConfirmationDialog, {
      width: '600px',
      data: { action, request },
    });

    dialogRef
      .afterClosed()
      .pipe(takeUntil(this.destroy$))
      .subscribe((result) => {
        if (result && action === 'delete') {
          this.deleteResponse(request);
        }
      });
  }

  deleteResponse(request: any): void {
    this.requestService
      .DeleteRequest(request.offerorRequestId, Number(this.organizationId))
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.snackbarNotificationService.showSnackbarSuccess(
            'Offer deleted successfully .',
          );

          this.loadAndJoinRequestData();
        },
        error: (error) => {
          const correlationId = error?.error?.correlationId;

          this.loggingService.logException(
            new Error(`HTTP Error ${error.status}: ${error.statusText}`),
            3,
            {
              offerorRequestId: request.offerorRequestId,
              agencyRequestId: request.requestId,
              organizationId: this.organizationId,
              correlationId: correlationId,
              methodName: 'deleteResponse',
              className: 'OfferorTableDetailsComponent',
              operation: 'DeleteRequest',
              userId: this.stateService.getUserId(),
            },
          );
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
              className: 'OfferorTableDetailsComponent',
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

  filterForm = this.fb.group({
    requestName: [''],
    category: new FormControl<string | number | null>(null),
    requestId: [''],
    publishDateFrom: [null],
    publishDateTo: [null],
    closeDateFrom: [null],
    closeDateTo: [null],
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
    'agencyOrganizationName',
    'requestId',
    'requestType',
    'category',
    'publishDate',
    'closeDateAndTime',
    'offerorRequestStatus',
    'agencyRequestStatus',
    'actions',
    'downloadPDF',
  ];

  joinedRequestData: Request[] = [];
  dataSource = new MatTableDataSource<any>();

  @ViewChild(MatPaginator)
  paginator!: MatPaginator;
  @ViewChild(MatSort)
  sort!: MatSort;

  constructor(
    private requestService: RequestService,
    private fb: FormBuilder,
    public dialog: MatDialog,
    private stateService: StateService,
    private cdr: ChangeDetectorRef,
    private loadingService: LoadingService,
    private loggingService: LoggingService,
    private http: HttpClient,
    private snackbarNotificationService: SnackbarNotificationService,
  ) {
    this.organizationId = this.stateService.getOrganizationId();
  }

  readonly requestTypeMap = {
    rfi: 1,
    rfq: 2,
    rfp: 3,
    bid: 4,
  };

  readonly agencyRequestStatusMap = {
    live: 3,
    closed: 4,
    cancelled: 5,
    opened: 6,
  };

  readonly offerorRequestStatusMap = {
    none: 7,
    inProgress: 8,
    submitted: 9,
  };

  ngOnInit(): void {
    this.filterForm.patchValue({
      live: true,
    });

    if (!this.organizationId) {
      setTimeout(() => {
        this.organizationId = this.stateService.getOrganizationId() ?? 0;
        if (this.organizationId) {
          this.loadAndJoinRequestData({
            agencyRequestStatusIds: [this.agencyRequestStatusMap['live']],
          });
        }
      }, 100);
    } else {
      this.loadAndJoinRequestData({
        agencyRequestStatusIds: [this.agencyRequestStatusMap['live']],
      });
    }
  }

  onSearch(): void {
    const formValues = this.filterForm.value;

    const selectedRequestType = Object.entries(this.requestTypeMap)
      .filter(([key]) => this.filterForm.get(key)?.value)
      .map(([, value]) => value);

    const selectedAgencyRequestStatusIds = Object.entries(
      this.agencyRequestStatusMap,
    )
      .filter(([key]) => this.filterForm.get(key)?.value)
      .map(([, value]) => value);

    const selectedOfferorRequestStatusIds = Object.entries(
      this.offerorRequestStatusMap,
    )
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
      params.requestTypeId = selectedRequestType;
    }

    if (selectedAgencyRequestStatusIds.length > 0) {
      params.agencyRequestStatusIds = selectedAgencyRequestStatusIds;
    }

    if (selectedOfferorRequestStatusIds.length > 0) {
      params.offerorRequestStatusIds = selectedOfferorRequestStatusIds;
    }

    this.loadAndJoinRequestData(params);
  }

  private async loadAndJoinRequestData(params?: any): Promise<void> {
    try {
      const organizationId = await this.stateService.getOrganizationId();
      if (!organizationId) {
        this.dataSource = new MatTableDataSource<any>([]);
        this.hasLoadedData = false;
        return;
      }

      const requestParams = {
        organizationId: organizationId,
        ...(params || {}),
      };

      const combinedData: any[] = [];

      this.loadingService.show();

      this.requestService
        .GetRequestsOfferorView(requestParams || {})
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
                requestTypeDesc: request.agencyRequestTypeName,
              };

              const agencyRequestStatus = {
                requestStatusId: request.agencyRequestStatusId,
                requestStatusDesc: request.agencyRequestStatusName,
              };

              const offerorRequestStatus = request.offerorRequestStatusId
                ? {
                    requestStatusId: request.offerorRequestStatusId,
                    requestStatusDesc: request.offerorRequestStatusName,
                  }
                : null;

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
                offerorRequestStatus,
              });
            });

            this.dataSource = new MatTableDataSource(combinedData);

            this.dataSource.sortingDataAccessor = (item, property) => {
              const value = item[property];
              return typeof value === 'string' ? value.toLowerCase() : value;
            };

            this.cdr.detectChanges();

            setTimeout(() => {
              if (this.paginator) {
                this.dataSource.paginator = this.paginator;
                this.paginator.firstPage();
              }
              if (this.sort) {
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
                organizationId: organizationId,
                correlationId: correlationId,
                methodName: 'loadAndJoinRequestData',
                className: 'OfferorRequestTableDetailsComponent',
                operation: 'GetRequestsOfferorView',
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

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
