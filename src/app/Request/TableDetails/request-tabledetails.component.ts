import {
  Component,
  OnInit,
  OnDestroy,
  ViewChild,
  TemplateRef,
} from '@angular/core';
import { forkJoin, Subject, takeUntil } from 'rxjs';
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
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatNativeDateModule } from '@angular/material/core';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatSelectModule } from '@angular/material/select';
import { MatInputModule } from '@angular/material/input';

interface Actions {
  value: string;
  viewValue: string;
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
  ],
})
export class AgencyTableDetailsComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  filterForm = this.fb.group({
    categoryName: [''],
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
    'requestStatus',
    'numberOfOffers',
    'actions',
  ];

  joinedRequestData: Request[] = [];
  dataSource = new MatTableDataSource<any>();

  @ViewChild(MatPaginator)
  paginator!: MatPaginator;
  @ViewChild(MatSort)
  sort!: MatSort;
  @ViewChild('offersDialog') offersDialog!: TemplateRef<any>;

  constructor(
    public dialog: MatDialog,
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
    draft: 1,
    scheduled: 2,
    live: 3,
    closed: 4,
    canceled: 5,
    opened: 6,
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
    this.loadAndJoinRequestData();
  }

  private loadAndJoinRequestData(params?: any): void {
    const combinedData: any[] = [];

    forkJoin([
      this.requestService.GetRequestsAgencyView(params || {}),
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

            // 👇 Count submitted responses (offerorRequestStatusId === 9)
            const submittedOffersCount = (request.responses || []).filter(
              (r: any) => r.offerorRequestStatusId === 9
            ).length;

            combinedData.push({
              ...request,
              category,
              requestType,
              agencyRequestStatus,
              submittedOffersCount, // <- Add this field
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

  applyFilter(event: Event) {
    const filterValue = (event.target as HTMLInputElement).value;
    this.dataSource.filter = filterValue.trim().toLowerCase();

    if (this.dataSource.paginator) {
      this.dataSource.paginator.firstPage();
    }
  }

  // openOffersDialog(request: any): void {
  //   const mockOffers = [
  //     {
  //       offerorName: 'Acme Corp',
  //       submittedDate: new Date('2024-11-10T10:30:00'),
  //     },
  //     {
  //       offerorName: 'Beta Solutions',
  //       submittedDate: new Date('2024-11-12T15:45:00'),
  //     },
  //   ];

  //   this.dialog.open(this.offersDialog, {
  //     width: '600px',
  //     data: {
  //       requestId: request.requestId,
  //       requestName: request.requestName,
  //       offers: mockOffers,
  //     },
  //   });
  // }

  openOffersDialog(request: any): void {
    const submittedOffers = (request.responses || []).filter(
      (r: any) => r.offerorRequestStatusId === 9
    );

    const formattedOffers = submittedOffers.map((offer: any) => ({
      offerorName: 'Offeror Org ' + offer.organizationId,
      submittedDate: new Date(), // replace with actual submission date if available
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

  canDelete(joinedRequest: any): boolean {
    return (
      joinedRequest.agencyRequestStatus?.requestStatusDesc === 'Draft' ||
      joinedRequest.agencyRequestStatus?.requestStatusDesc === 'Scheduled'
    );
  }

  canEdit(joinedRequest: any): boolean {
    return (
      joinedRequest.agencyRequestStatus?.requestStatusDesc === 'Draft' ||
      joinedRequest.agencyRequestStatus?.requestStatusDesc === 'Scheduled'
    );
  }

  canCancel(joinedRequest: any): boolean {
    return joinedRequest.agencyRequestStatus?.requestStatusDesc === 'Live';
  }

  openConfirmationDialog(action: string, request: any): void {
    const dialogRef = this.dialog.open(ConfirmationDialog, {
      width: '600px',
      data: { action, request },
    });

    dialogRef.componentInstance.onCancelUpdateRequestStatus =
      this.onCancelUpdateRequestStatus.bind(this);

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
        // if (result && action === "edit") {
        //   this.editRequest(request, action);
        // }
      });
  }

  deleteRequest(request: any): void {
    this.requestService
      .DeleteRequest(request.requestId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          console.log(
            `Request with ID ${request.requestId} deleted successfully.`
          );
          this.joinedRequestData = this.joinedRequestData.filter(
            (i) => i.requestId !== request.requestId
          );
          this.dataSource.data = this.joinedRequestData;
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
