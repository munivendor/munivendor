import { Component, ViewChild, OnDestroy } from '@angular/core';
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
import { SubCategory } from '../model/subcategory.model';
import { RequestSection } from '../model/requestsection.model';
import { Subject, takeUntil } from 'rxjs';

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
export class CreateRequestStepper implements OnDestroy {
  @ViewChild(BasicRequestComponent) basicRequestComponent!: BasicRequestComponent;
  @ViewChild(RequestOverviewComponent) requestOverViewComponent!: RequestOverviewComponent;
  @ViewChild(RequestRequiredDocumentsComponent) requestRequiredDocumentsComponent!: RequestRequiredDocumentsComponent;
  @ViewChild(RequestReviewComponent) requestReviewComponent!: RequestReviewComponent;

  private destroy$ = new Subject<void>();
  
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
  isStepValid = true;

  constructor(
    private route: ActivatedRoute,
  ) {
    this.route.paramMap
      .pipe(takeUntil(this.destroy$))
      .subscribe((params) => {
        this.idParam = params.get('requestId');
        this.requestId = this.idParam ? + this.idParam : 0;
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
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