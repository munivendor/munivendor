import { Component, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormGroup } from '@angular/forms';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatStepperModule } from '@angular/material/stepper';
import { MatButtonModule } from '@angular/material/button';
import { Document } from '../model/document.model';
import { ActivatedRoute } from '@angular/router';
import { BasicRequestComponent } from '../request-basic.component';
import { RequestOverviewComponent } from '../request-overview.component';
import { RequestRequiredDocumentsComponent } from '../request-required-docs.component';
import { RequestReviewComponent } from '../request-review.component';
import { Request } from '../model/request.model';
import { RequestSection } from '../model/requestsection.model';
import { SubCategory } from '../model/subcategory.model';
import { RequestSection } from '../model/requestsection.model';

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
  @ViewChild(BasicRequestComponent) basicRequestComponent!: BasicRequestComponent;

  @ViewChild(RequestOverviewComponent) requestOverViewComponent!: RequestOverviewComponent;
  @ViewChild(RequestRequiredDocumentsComponent) requestRequiredDocumentsComponent!: RequestRequiredDocumentsComponent;
  @ViewChild(RequestReviewComponent) requestReviewComponent!: RequestReviewComponent;

  receivedProposalSections: RequestSection[] = [];
  requestData!: Request;
  basicsFormGroup!: FormGroup;
  subcategories!: SubCategory[];
  proposalsOverview!: FormGroup;
  requestDocumentsFormGroup!: FormGroup;
  municipalityId = 1;

  requestId?: number;
  proposalsOverviewFormGroup!: FormGroup;
  requiredDocuments: Document[] = [];
  optionalDocuments: Document[] = [];
  municipalityDocuments: Document[] = [];
  finalReviewFormGroup!: FormGroup;
  idParam?: string | undefined | null;
  isStepValid = false;

  constructor(
    private route: ActivatedRoute,
  ) {
 
    this.route.paramMap.subscribe((params) => {
      const idParam = params.get('requestId'); 
      this.requestId = idParam ? +idParam : 0; 
    });
  }


  saveRequest() {
    this.basicRequestComponent.saveRequest();
  }

  saveSections(): void {
    this.requestOverViewComponent.saveSections();
  }

  saveDocuments(): void {
    this.requestRequiredDocumentsComponent.saveDocuments();
  }

  updateRequestStatusToScheduled(): void {
    this.requestReviewComponent.onSubmit();
  }
}

