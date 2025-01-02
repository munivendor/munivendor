import { ChangeDetectorRef, Component, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, Validators, FormsModule, ReactiveFormsModule, FormGroup, FormArray } from '@angular/forms';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatStepperModule } from '@angular/material/stepper';
import { MatButtonModule } from '@angular/material/button';
import { Document } from '../model/document.model';
import { RequestDocument } from '../model/requestdocument.model';
import { ActivatedRoute } from '@angular/router';
import { forkJoin, Observable, tap } from 'rxjs';
import { StateService } from '../services/state.service';
import { BasicRequestComponent } from '../request-basic.component';
import { RequestOverviewComponent } from '../request-overview.component';
import { RequestRequiredDocumentsComponent } from '../request-required-docs.component';
import { RequestReviewComponent } from '../request-review.component';
import { RequestService } from '../services/request.service';
import { Request } from '../model/request.model';
import { SubCategory } from '../model/subcategory.model';
import { MatSelectChange } from '@angular/material/select';
import { RequestSection } from '../model/requestsection.model';

@Component({
  selector: 'create-request-stepper',
  templateUrl: 'create-request-stepper.component.html',
  styleUrls: ['./create-request-stepper.component.css'],
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
    CommonModule
  ],
})

export class CreateRequestStepper {
updateRequestStatusToScheduled() {
throw new Error('Method not implemented.');
}

  @ViewChild(BasicRequestComponent) basicRequestComponent!: BasicRequestComponent;
  @ViewChild(RequestOverviewComponent)requestOverViewComponent!: RequestOverviewComponent;
  @ViewChild(RequestRequiredDocumentsComponent)requestRequiredDocumentsComponent!: RequestRequiredDocumentsComponent;

  receivedProposalSections: RequestSection[] = [];
  requestData!: Request;
  basicsFormGroup!: FormGroup;
  subcategories!: SubCategory[];
  proposalsOverview!: FormGroup;
  requestDocumentsFormGroup!: FormGroup;
  municipalityId = 1;
  requestId!: number;

  proposalsOverviewFormGroup!: FormGroup;

  requiredDocuments: Document[] = [];
  optionalDocuments: Document[] = [];
  municipalityDocuments: Document[] = [];

  finalReviewFormGroup!: FormGroup;

  idParam: string | null | undefined;

  constructor(
    private fb: FormBuilder,
    private requestService: RequestService,
    private stateService: StateService,
    private route: ActivatedRoute,
    private cdr: ChangeDetectorRef)
     {
    this.route.paramMap.subscribe((params) => {
      this.idParam = params.get('requestId');
      this.requestId = this.idParam ? + this.idParam : 0;
    });
  }

  saveRequest() {
    this.basicRequestComponent.saveRequest();
  }

  saveSections(): void {
    this.requestOverViewComponent.saveSections(this.requestId)
  }

  saveDocuments(): void {
    this.requestRequiredDocumentsComponent.saveDocuments (this.requestId)
  }
}

 

  

