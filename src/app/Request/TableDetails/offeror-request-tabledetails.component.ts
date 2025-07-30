import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit, ViewChild } from '@angular/core';
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
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatAutocompleteModule } from '@angular/material/autocomplete';

interface Actions {
  value: string;
  viewValue: string;
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
  ],
})
export class OfferorTableDetailsComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  filterForm = this.fb.group({
    categoryName: [''],
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

  actions: Actions[] = [
    { value: '1', viewValue: 'Respond' },
    { value: '2', viewValue: 'Continue' },
    { value: '3', viewValue: 'Delete' },
  ];

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
    private fb: FormBuilder
  ) {}

  readonly requestTypeMap = {
    rfi: 1,
    rfq: 2,
    rfp: 3,
    bid: 4,
  };

  readonly requestStatusMap = {
    live: 3,
    closed: 4,
    canceled: 5,
    opened: 6,
    none: 7,
    inProgress: 8,
    submitted: 9,
  };

  onSearch(): void {
    const formValues = this.filterForm.value;

    const selectedRequestType = Object.entries(this.requestTypeMap)
      .filter(([key]) => this.filterForm.get(key)?.value)
      .map(([, value]) => value);

    const selectedRequestStatus = Object.entries(this.requestStatusMap)
      .filter(([key]) => this.filterForm.get(key)?.value)
      .map(([, value]) => value);

    const params: any = {};

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

    if (selectedRequestStatus.length > 0) {
      params.requestStatusId = selectedRequestStatus;
    }

    this.loadAndJoinRequestData(params);
  }

  ngOnInit(): void {
    // this.getRequestObjDetails();
    this.loadAndJoinRequestData(); // Loads all requests initially
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

            combinedData.push({
              ...request,
              category,
              requestType,
              agencyRequestStatus,
            });
          });

          this.dataSource = new MatTableDataSource(combinedData);

          this.dataSource.paginator = this.paginator;
          this.dataSource.sort = this.sort;
        },
        (error) => {
          console.error('Error loading request data:', error);
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

  applyFilter(event: Event) {
    const filterValue = (event.target as HTMLInputElement).value;
    this.dataSource.filter = filterValue.trim().toLowerCase();

    if (this.dataSource.paginator) {
      this.dataSource.paginator.firstPage();
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
