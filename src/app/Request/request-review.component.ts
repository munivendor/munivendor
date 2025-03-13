import { Component, Input, OnInit, OnDestroy } from '@angular/core';
import { RouterModule } from '@angular/router';
import { FormGroup, FormBuilder, ReactiveFormsModule, FormArray } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { MatCheckbox } from '@angular/material/checkbox';
import { MatFormField } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { forkJoin, Subject, takeUntil } from 'rxjs';
import { RequestService } from './services/request.service';
import { StateService } from './services/state.service';
import { Router } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';

@Component({
  selector: 'request-review',
  standalone: true,
  templateUrl: './request-review.component.html',
  styleUrls: ['./request-review.component.css'],
  imports: [
    ReactiveFormsModule,
    RouterModule,
    CommonModule,
    MatCheckbox,
    MatFormField,
    MatInputModule
  ]
})

export class RequestReviewComponent implements OnInit, OnDestroy {
  @Input() paramRequestId?: number;
  private destroy$ = new Subject<void>();
  
  requestId!: number | null;
  requestFinalReviewDetailsForm!: FormGroup;
  requestFinalReviewDetails: any = {};
  docs: any;

  constructor(
    private fb: FormBuilder,
    private requestService: RequestService,
    private stateService: StateService,
    private router: Router,
    private snackBar: MatSnackBar
  ) { }

  ngOnInit() {
    if (this.paramRequestId) {
      this.getRequestObjDetails(this.paramRequestId);
    }
    this.stateService.currentRequestHasBeenSaved$
      .pipe(takeUntil(this.destroy$))
      .subscribe((hasBeenSaved) => {
        this.requestId = this.stateService.getRequestId();
        if (hasBeenSaved && this.requestId) {
          if (this.paramRequestId) {
            this.getRequestObjDetails(this.paramRequestId);
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

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  getRequestObjDetails(requestId: number) {
    const request$ = this.requestService.GetRequestDetailsById(requestId);
    const categories$ = this.requestService.GetCategories();
    const requestTypes$ = this.requestService.GetRequestTypes();
    const subCategories$ = this.requestService.GetAllSubcategories();
    const decisionMakers$ = this.requestService.GetDecisionMakers();
    const requiredRequestDocuments$ = this.requestService.GetRequestRequiredDocumentsById(requestId);

    forkJoin([request$, categories$, requestTypes$, subCategories$, decisionMakers$, requiredRequestDocuments$])
      .pipe(takeUntil(this.destroy$))
      .subscribe(
        ([request, categories, requestTypes, subCategories, decisionMakers, requiredRequestDocuments]) => {
          const category = categories.find((c: { categoryId: any }) => c.categoryId === request.categoryId);
          const requestType = requestTypes.find((r: { requestTypeId: number }) => r.requestTypeId === request.requestTypeId);
          const subCategory = subCategories.find((sc: { subCategoryId: number }) => sc.subCategoryId === request.subCategoryId);

          const decisionMakersMapped = request.decisionMakerSelections.map((selection: { decisionMakerId: number }) =>
            decisionMakers.find((dm: { decisionMakerId: number }) => dm.decisionMakerId === selection.decisionMakerId)
          ).filter((dm: any) => dm);

          const requestDocuments = requiredRequestDocuments.documents;

          const { date: publishDate, time: publishTime } = this.splitDateTime(request.publishDate);
          const { date: openDate, time: openTime } = this.splitDateTime(request.openDate);
          const { date: contractStart } = this.splitDateTime(request.contractStart);
          const { date: contractEnd } = this.splitDateTime(request.contractEnd);

          this.requestFinalReviewDetails = {
            ...request,
            category,
            requestType,
            subCategory,
            decisionMakers: decisionMakersMapped,
            requestDocuments,
            openDate,
            publishDate,
            contractStart,
            contractEnd,
            openTime,
            publishTime
          };

          this.requestFinalReviewDetailsForm.patchValue({
            requestName: request.requestName,
            category: category?.categoryName || '',
            subcategory: subCategory?.subCategoryName || '',
            requestType: requestType?.requestTypeDesc || '',
            publishDate: publishDate,
            publishTime: publishTime,
            openDate: openDate,
            openTime: openTime,
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

  // takes a combined date-time string, parses it
  // returns an object containing separate date and time fields.
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
          this.router.navigate(['/dashboard-component/requests-view']);
        },
        error: (err) => {
          console.error('Failed to update request status:', err);
        }
      });
  }
}