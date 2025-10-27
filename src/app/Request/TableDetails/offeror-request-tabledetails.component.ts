import { CommonModule } from '@angular/common';
import {
  Component,
  inject,
  Input,
  OnDestroy,
  OnInit,
  ViewChild,
} from '@angular/core';
import { finalize, forkJoin, Subject, takeUntil } from 'rxjs';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatSort, MatSortModule } from '@angular/material/sort';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { RequestService } from '../services/request.service';
import { CategoryHierarchyService } from '../services/category-hierarchy.service';
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
import { MatSnackBar } from '@angular/material/snack-bar';
import { AuthService } from '../../authorization/auth.service';
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
  private _snackBar = inject(MatSnackBar);
  hierarchicalCategories: CategoryNode[] = [];
  flattenedCategories: FlattenedCategoryNode[] = [];

  readonly AVAILABLE_ACTIONS = ['respond', 'delete', 'continue'] as const;

  displayCategoryName = (categoryId: string | number | null): string => {
    if (categoryId == null) {
      return '';
    }

    const searchValue = categoryId.toString();
    const match = this.flattenedCategories.find(
      (cat) => cat.categoryId === searchValue
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
          console.log(
            `Response with ID ${request.offerorRequestId} deleted successfully.`
          );
          this._snackBar.open(`Offer successfully deleted.`, 'Close', {
            verticalPosition: 'top',
          });
          this.loadAndJoinRequestData();
        },
        error: (error) => {
          console.error('Error deleting the offer:', error);

          // Extract correlationId
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
            }
          );
          if (error.status !== 401 && this.authService.authState.value) {
            this.snackbarNotificationService.showUploadError(correlationId);
          }
        },
      });
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
  ];

  joinedRequestData: Request[] = [];
  dataSource = new MatTableDataSource<any>();

  @ViewChild(MatPaginator)
  paginator!: MatPaginator;
  @ViewChild(MatSort)
  sort!: MatSort;

  constructor(
    private requestService: RequestService,
    private categoryHierarchyService: CategoryHierarchyService,
    private fb: FormBuilder,
    public dialog: MatDialog,
    private stateService: StateService,
    private cdr: ChangeDetectorRef,
    private loadingService: LoadingService,
    private loggingService: LoggingService,
    private authService: AuthService,
    private snackbarNotificationService: SnackbarNotificationService
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

    const selectedAgencyRequestStatusIds = Object.entries(
      this.agencyRequestStatusMap
    )
      .filter(([key]) => this.filterForm.get(key)?.value)
      .map(([, value]) => value);

    const selectedOfferorRequestStatusIds = Object.entries(
      this.offerorRequestStatusMap
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
        formValues.publishDateFrom
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

      forkJoin([
        this.requestService.GetRequestsOfferorView(requestParams || {}),
        this.categoryHierarchyService.GetCategoryHierarchy(),
        this.requestService.GetRequestTypes(),
        this.requestService.GetRequestStatuses(),
      ])
        .pipe(
          takeUntil(this.destroy$),
          finalize(() => this.loadingService.hide())
        )
        .subscribe({
          next: ([requests, categories, requestTypes, requestStatuses]) => {
            const requestsData = requests?.requests || [];
            this.hasLoadedData = requestsData.length > 0;

            if (categories && categories.length > 0) {
              this.hierarchicalCategories =
                this.prepareCategoriesForTreeRendering(categories);
              this.flattenedCategories = this.flattenCategories(
                this.hierarchicalCategories
              );
            }

            requestsData.forEach((request: any) => {
              const category = this.findCategoryById(
                categories,
                request.categoryId
              );
              const requestType = requestTypes.find(
                (r) => r.requestTypeId === request.requestTypeId
              );
              const agencyRequestStatus = requestStatuses.find(
                (rs: { requestStatusId: any }) =>
                  rs.requestStatusId === request.agencyRequestStatusId
              );

              const offerorRequestStatus = requestStatuses.find(
                (rs: { requestStatusId: any }) =>
                  rs.requestStatusId === request.offerorRequestStatusId
              );

              request.publishDate = request.publishDate
                ? new Date(request.publishDate + 'Z')
                : null;

              request.closeDate = request.closeDate
                ? new Date(request.closeDate + 'Z')
                : null;

              combinedData.push({
                ...request,
                category,
                requestType,
                agencyRequestStatus,
                offerorRequestStatus,
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
                this.dataSource.sort = this.sort;
              }
            }, 0);
          },
          error: (error: any) => {
            console.error('Error loading request data:', error);

            // Extract correlationId
            const correlationId = error?.error?.correlationId;

            let operation = 'UnknownOperation';
            const errorUrl = error?.url?.toLowerCase?.() || '';

            if (
              errorUrl.includes('requestsofferorview') ||
              errorUrl.includes('requests')
            )
              operation = 'GetRequestsOfferorView';
            else if (errorUrl.includes('categoryhierarchy'))
              operation = 'GetCategoryHierarchy';
            else if (errorUrl.includes('requesttypes'))
              operation = 'GetRequestTypes';
            else if (errorUrl.includes('requeststatuses'))
              operation = 'GetRequestStatuses';

            this.loggingService.logException(
              new Error(`HTTP Error ${error.status}: ${error.statusText}`),
              3,
              {
                organizationId: organizationId,
                correlationId: correlationId,
                methodName: 'loadAndJoinRequestData',
                className: 'OfferorRequestTableDetailsComponent',
                operation: operation,
                userId: this.stateService.getUserId(),
              }
            );

            if (error.status !== 401 && this.authService.authState.value) {
              this.snackbarNotificationService.showUploadError(correlationId);
            }
            this.dataSource = new MatTableDataSource<any>([]);
            this.hasLoadedData = false;
          },
        });
    } catch (error: any) {
      this.dataSource = new MatTableDataSource<any>([]);
    }
  }

  private findCategoryById(categories: any[], targetId: number): any {
    for (const category of categories) {
      if (category.id === targetId) {
        return category;
      }

      if (category.children && category.children.length > 0) {
        const found = this.findCategoryById(category.children, targetId);
        if (found) return found;
      }
    }
    return null;
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
