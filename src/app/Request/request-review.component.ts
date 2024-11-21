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

      // Filter documents to include only those marked as required
      const requiredDocuments = requiredRequestDocuments;

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
      },
      error => {
        console.error('Error fetching data', error);
      }
    );
  }

  // Helper function to format dates to MM/DD/YYYY
  formatToUSDate(dateString: string): string {
    const date = new Date(dateString);
    const options: Intl.DateTimeFormatOptions = {
      month: '2-digit',
      day: '2-digit',
      year: 'numeric'
    };
    return new Intl.DateTimeFormat('en-US', options).format(date);
  }

  // Helper function to format times to HH:MM AM/PM
  formatToUSTime(timeString: string): string {
    const date = new Date(timeString);
    const options: Intl.DateTimeFormatOptions = {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    };
    return new Intl.DateTimeFormat('en-US', options).format(date);
  }

  populateArrayFormControls(controlName: string, items: any[]) {
    const controlArray = this.requestFinalReviewDetailsForm.get(controlName) as FormArray;
    controlArray.clear();
    items?.forEach(item => {
      controlArray.push(this.fb.control(item.name || item));  // Customize based on your data structure
    });
  }

  onSubmit() {
    if (this.requestFinalReviewDetailsForm.valid) {
      console.log(this.requestFinalReviewDetailsForm.value);
    }
  }
}
