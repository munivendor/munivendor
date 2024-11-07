import { Component } from '@angular/core';
import { FormBuilder, Validators, FormsModule, ReactiveFormsModule, FormGroup } from '@angular/forms';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatStepperModule } from '@angular/material/stepper';
import { MatButtonModule } from '@angular/material/button';
import { Document } from '../model/document.model';
import { IRequestDocuments } from '../../interfaces/IRequestDocuments';

import { BasicRequestComponent } from '../request-basic.component';
import { RequestOverviewComponent } from '../request-overview.component';
import { RequestRequiredDocumentsComponent } from '../request-required-docs.component';
import { RequestReviewComponent } from '../request-review.component';
import { RequestService } from '../services/request.service';

@Component({
  selector: 'create-request-stepper',
  templateUrl: 'create-request-stepper.component.html',
  standalone: true,
  imports: [
    MatButtonModule,
    MatStepperModule,
    FormsModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    BasicRequestComponent,
    RequestOverviewComponent,
    RequestRequiredDocumentsComponent,
    RequestReviewComponent,
  ],
})

// comments are WIP for when validation is required before users
// are able to move onto the next step
// can save data for each step
// submit the final request data to database
export class CreateRequestStepper {
  basicsFormGroup!: FormGroup;
  proposalsOverview!: FormGroup;
  requestDocumentsFormGroup!: FormGroup;
  municipalityId = 1; // Example ID, replace as needed
  requestId = 1;

  // Variables to hold document data passed from the child component
  requiredDocuments: Document[] = [];
  optionalDocuments: Document[] = [];
  municipalityDocuments: Document[] = [];

  proposalsOverviewFormGroup = this._formBuilder.group({
    // proposalsOverview: ['', Validators.required],
  });
  // requestDocumentsFormGroup = this._formBuilder.group({
  //   // requestDocuments: ['', Validators.required],
  // });
  finalReviewFormGroup = this._formBuilder.group({
    // finalReview: ['', Validators.required],
  });

  constructor(private _formBuilder: FormBuilder, private requestService: RequestService) {
    this.requestDocumentsFormGroup = this._formBuilder.group({});
  }

  ngOnInit() {
    // Initialize form groups with FormControl
    this.basicsFormGroup = this._formBuilder.group({
      category: ['', Validators.required],
      subcategory: ['', Validators.required],
      requestType: ['', Validators.required],
      requestName: ['', Validators.required],
      publishDate: ['', Validators.required],
      publishTime: ['', Validators.required],
      openDate: ['', Validators.required],
      openTime: ['', Validators.required],
      contractStartDate: ['', Validators.required],
      contractEndDate: ['', Validators.required],
    });

    this.proposalsOverview = this._formBuilder.group({
      // field2: new FormControl(this.requestService.getRequestData('step2')?.field2 || '')
    });
  }

  onDocumentsUpdated(documents: IRequestDocuments) {
    this.requiredDocuments = documents.required;
    this.optionalDocuments = documents.optional;
    this.municipalityDocuments = documents.municipality;
  }

  saveDocuments() {
    const documentIds: number[] = [
      ...this.requiredDocuments,
      ...this.optionalDocuments,
      ...this.municipalityDocuments
    ].map(documentId => documentId.documentId);

    this.requestService.SaveRequestDocuments(this.requestId, documentIds)
      .subscribe(response => {
        console.log('Documents saved successfully:', response);
      }, error => {
        console.error('Error saving documents:', error);
      });
  }

  handleFormUpdate(updatedData: any) {
    if (updatedData.step1) {
      this.basicsFormGroup.patchValue(updatedData.step1);
    }
    if (updatedData.step2) {
      this.proposalsOverview.patchValue(updatedData.step2);
    }
  }
}
