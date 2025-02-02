import { Component, OnInit } from '@angular/core';
import { RouterModule } from '@angular/router';
import { FormGroup, FormBuilder, ReactiveFormsModule, FormArray } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { MatCheckbox } from '@angular/material/checkbox';
import { MatFormField } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { forkJoin } from 'rxjs';

import { RequestService } from './services/request.service';

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

export class RequestReviewComponent implements OnInit {

  @Input() paramRequestId?: number;

  requestId!: number | null;

  requestFinalReviewDetailsForm!: FormGroup;
  requestId: number = 60;
  requestFinalReviewDetails: any = {};
  docs: any;

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private requestService: RequestService
  ) { }

  ngOnInit() {

    if (this.paramRequestId) {
      this.getRequestObjDetails(this.paramRequestId);
    }
    // dynamically call getRequestObjDetails if any page  
    // has been saved to receive updated request details
    this.stateService.currentRequestHasBeenSaved$.subscribe((hasBeenSaved) => {
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
      requiredDocuments: this.fb.array([]) // Same for required documents
    });

    this.getRequestObjDetails(this.requestId);
  }

  getRequestObjDetails(requestId: number) {
    const request$ = this.requestService.GetRequestDetailsById(requestId);
    const categories$ = this.requestService.GetCategories();
    const requestTypes$ = this.requestService.GetRequestTypes();
    const requestStatuses$ = this.requestService.GetRequestStatuses();
    const subCategories$ = this.requestService.GetAllSubcategories();
    const decisionMakers$ = this.requestService.GetDecisionMakers();
    const requiredRequestDocuments$ = this.requestService.GetRequestRequiredDocumentsById(requestId);

    forkJoin([request$, categories$, requestTypes$, requestStatuses$, subCategories$, decisionMakers$, requiredRequestDocuments$]).subscribe(
      ([request, categories, requestTypes, requestStatuses, subCategories, decisionMakers, requiredRequestDocuments]) => {
        const category = categories.find((c: { categoryId: any }) => c.categoryId === request.categoryId);
        const requestType = requestTypes.find((r: { requestTypeId: number }) => r.requestTypeId === request.requestTypeId);
        const requestStatus = requestStatuses.find((rs: { requestStatusId: any }) => rs.requestStatusId === request.requestStatusId);
        const subCategory = subCategories.find((sc: { subCategoryId: number }) => sc.subCategoryId === request.subCategoryId);

        // Map over decisionMakerSelections in request to match decisionMakers from API response
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
          requestStatus,
          subCategory,
          decisionMakers: decisionMakersMapped,
          requiredDocuments,
          openDate: this.formatToUSDate(request.openDate),
          publishDate: this.formatToUSDate(request.publishDate),
          contractStart: this.formatToUSDate(request.contractStart),
          contractEnd: this.formatToUSDate(request.contractEnd),
          openTime: this.formatToUSTime(request.openTime),
          publishTime: this.formatToUSTime(request.publishTime)
        };


        // Populate the form with data
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
    // Parse the UTC date-time string as UTC
    const utcDate = new Date(dateTimeString + 'Z'); // Ensure it's treated as UTC by appending 'Z'
  
    const dateOptions: Intl.DateTimeFormatOptions = {
      month: '2-digit',
      day: '2-digit',
      year: 'numeric'
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
      controlArray.push(this.fb.control(item.name || item));  // Customize based on your data structure
    });
  }

  onSubmit() {

    // Determine the requestId to use
    const requestIdToUse = this.stateService.getRequestId();
    if (!requestIdToUse) {
      console.error('Error: No valid requestId found.');
      return;
    }
  }
}
