import {
  Component,
  OnInit,
  OnDestroy,
  ViewChild,
  TemplateRef,
  Input,
} from '@angular/core';
import { catchError, forkJoin, of, Subject, takeUntil } from 'rxjs';
import { CommonModule } from '@angular/common';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { ConfirmationDialog } from '../RequestConfirmationDialog/confirmation-dialog.component';
import { RequestService } from '../services/request.service';
import { Request } from '../model/request.model';
import { CategoryHierarchyService } from '../services/category-hierarchy.service';
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

const ACTION_PERMISSIONS: {
  [status: string]: {
    edit?: boolean;
    delete?: boolean;
    cancel?: boolean;
    open?: boolean;
    noneDisabled?: boolean;
    redownload?: boolean;
  };
} = {
  Draft: { edit: true, delete: true },
  Scheduled: { edit: true, delete: true },
  Live: { cancel: true },
  Closed: { open: true },
  Canceled: { noneDisabled: true },
  Opened: { redownload: true },
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

  canPerformAction(
    request: any,
    action: 'edit' | 'delete' | 'cancel' | 'open' | 'redownload'
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
    canceled: [false],
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
    private categoryHierarchyService: CategoryHierarchyService,
    private fb: FormBuilder,
    private stateService: StateService
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
    canceled: 5,
    opened: 6,
  };

  readonly AVAILABLE_ACTIONS = [
    'edit',
    'delete',
    'cancel',
    'open',
    'redownload',
  ] as const;

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
      params.requestTypeIds = selectedRequestType;
    }

    if (selectedRequestStatus.length > 0) {
      params.requestStatusIds = selectedRequestStatus;
    }

    this.loadAndJoinRequestData(params);
  }

  private loadAndJoinRequestData(params?: any): void {
    if (!this.organizationId) {
      console.error('Organization ID not found');
      this.dataSource = new MatTableDataSource<any>([]);
      this.hasLoadedData = false;
      return;
    }

    const requestParams = {
      organizationId: this.organizationId,
      ...(params || {}),
    };

    const combinedData: any[] = [];

    forkJoin([
      this.requestService.GetRequestsAgencyView(requestParams).pipe(
        catchError((error) => {
          console.error('Error loading requests:', error);
          return of({ requests: [] });
        })
      ),
      this.categoryHierarchyService.GetCategoryHierarchy().pipe(
        catchError((error) => {
          console.error('Error loading categories:', error);
          return of([]);
        })
      ),
      this.requestService.GetRequestTypes().pipe(
        catchError((error) => {
          console.error('Error loading request types:', error);
          return of([]);
        })
      ),
      this.requestService.GetRequestStatuses().pipe(
        catchError((error) => {
          console.error('Error loading request statuses:', error);
          return of([]);
        })
      ),
    ])
      .pipe(takeUntil(this.destroy$))
      .subscribe(
        ([requests, categories, requestTypes, requestStatuses]) => {
          const requestsData = requests?.requests || [];
          this.hasLoadedData = requestsData.length > 0;

          requestsData.forEach((request: any) => {
            const category = this.findCategoryById(
              categories || [],
              request.categoryId
            );
            const requestType = (requestTypes || []).find(
              (r) => r.requestTypeId === request.requestTypeId
            );

            const agencyRequestStatus = (requestStatuses || []).find(
              (rs: { requestStatusId: any }) =>
                rs.requestStatusId === request.agencyRequestStatusId
            );

            const submittedOffersCount = (request.responses || []).filter(
              (r: any) => r.offerorRequestStatusId === 9
            ).length;

            request.closeDate = request.closeDate
              ? new Date(request.closeDate + 'Z')
              : null;

            combinedData.push({
              ...request,
              category,
              requestType,
              agencyRequestStatus,
              submittedOffersCount,
            });
          });

          this.dataSource = new MatTableDataSource(combinedData);
          this.dataSource.paginator = this.paginator;
          this.dataSource.sort = this.sort;
        },
        (error) => {
          console.error('Unexpected error in forkJoin:', error);
          this.dataSource = new MatTableDataSource<any>([]);
          this.hasLoadedData = false;
        }
      );
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
      (r: any) => r.offerorRequestStatusId === 9
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

  openConfirmationDialog(action: string, request: any): void {
    const dialogRef = this.dialog.open(ConfirmationDialog, {
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
            updateData.newStatusDesc
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
            cancelData.reasonNote
          );
          this.onCancelUpdateRequestStatus(
            cancelData.request,
            cancelData.action
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
    newStatusDesc: string
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
          console.log(
            `Request with ID ${request.requestId} deleted successfully.`
          );
          this.loadAndJoinRequestData();
        },
        error: (error) => {
          console.error('Error deleting the request:', error);
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
            console.error('Error updating Request status:', error);
          },
        });
    }
  }

  onCancelUpdateRequestCancelReason(
    request: any,
    reasonId: number,
    reasonNote: string
  ): void {
    this.requestService
      .UpdateRequestCancelReason(request.requestId, reasonId, reasonNote)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          console.log(
            `Request with ID ${request.requestId} updated successfully with cancel reason ID ${reasonId}.`
          );
        },
        error: (error) => {
          console.error('Error updating the request:', error);
        },
      });
  }
}
