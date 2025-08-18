import { CommonModule } from '@angular/common';
import { Component, Input, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { forkJoin, Subject, takeUntil } from 'rxjs';
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
import { ChangeDetectorRef } from '@angular/core';

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
  private destroy$ = new Subject<void>();
  @Input() categoryControl!: FormControl<number | null>;
  organizationId: number = 0;

  readonly AVAILABLE_ACTIONS = ['respond', 'delete', 'continue'] as const;

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
      ['Canceled', 'Opened'].includes(agencyStatus) &&
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

    dialogRef.componentInstance.cancellationRequested
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (cancelData: any) => {},
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

  deleteRequest(request: any): void {
    this.requestService
      .DeleteRequest(request.offerorRequestId, this.organizationId)
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
    private stateService: StateService
  ) {
    this.organizationId = this.stateService.getOrganizationId() ?? 0;
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
    canceled: 5,
    opened: 6,
  };

  readonly offerorRequestStatusMap = {
    none: 7,
    inProgress: 8,
    submitted: 9,
  };

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

  ngOnInit(): void {
    this.loadAndJoinRequestData();
  }

  private loadAndJoinRequestData(params?: any): void {
    const combinedData: any[] = [];

    forkJoin([
      this.requestService.GetRequestsOfferorView(params || {}),
      this.categoryHierarchyService.GetCategoryHierarchy(),
      this.requestService.GetRequestTypes(),
      this.requestService.GetRequestStatuses(),
    ])
      .pipe(takeUntil(this.destroy$))
      .subscribe(
        ([requests, categories, requestTypes, requestStatuses]) => {
          requests.requests.forEach((request: any) => {
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

            combinedData.push({
              ...request,
              category,
              requestType,
              agencyRequestStatus,
              offerorRequestStatus,
            });
          });

          this.dataSource = new MatTableDataSource(combinedData);
          this.dataSource.paginator = this.paginator;
          this.dataSource.sort = this.sort;
        },
        (error) => {
          console.error('Error loading request data:', error);
          this.dataSource = new MatTableDataSource<any>([]);
        }
      );
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
