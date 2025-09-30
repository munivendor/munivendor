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
import { RequestSection } from '../model/requestsection.model';
import { Subject, takeUntil } from 'rxjs';
import { MatCardModule } from '@angular/material/card';
import { StateService } from '../services/state.service';
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
    CommonModule,
    MatCardModule,
  ],
})
export class CreateRequestStepper implements OnDestroy {
  @ViewChild(BasicRequestComponent)
  basicRequestComponent!: BasicRequestComponent;
  @ViewChild(RequestOverviewComponent)
  requestOverViewComponent!: RequestOverviewComponent;
  @ViewChild(RequestRequiredDocumentsComponent)
  requestRequiredDocumentsComponent!: RequestRequiredDocumentsComponent;
  @ViewChild(RequestReviewComponent)
  requestReviewComponent!: RequestReviewComponent;

  private destroy$ = new Subject<void>();

  receivedProposalSections: RequestSection[] = [];
  requestData!: Request;
  basicsFormGroup!: FormGroup;
  proposalsOverview!: FormGroup;
  requestDocumentsFormGroup!: FormGroup;
  organizationId = 1;
  requestId?: number | null;
  proposalsOverviewFormGroup!: FormGroup;
  requiredDocuments: Document[] = [];
  optionalDocuments: Document[] = [];
  municipalityDocuments: Document[] = [];
  finalReviewFormGroup!: FormGroup;
  idParam?: string | null;
  isStepValid = false;

  constructor(
    private route: ActivatedRoute,
    private stateService: StateService
  ) {
    this.route.paramMap.pipe(takeUntil(this.destroy$)).subscribe((params) => {
      this.idParam = params.get('requestId');
      this.requestId = this.idParam ? +this.idParam : null;
    });
  }

  onFormValidityChange(valid: boolean) {
    this.isStepValid = valid;
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.stateService.clearRequestId();
  }

  saveRequest() {
    if (this.basicRequestComponent) {
      this.basicRequestComponent.saveRequest();
    } else {
      console.error('Basic request component not initialized');
    }
  }

  saveSections(): void {
    if (this.requestOverViewComponent) {
      this.requestOverViewComponent.saveSections();
    } else {
      console.error('Request overview component not initialized');
    }
  }

  saveDocuments(): void {
    if (this.requestRequiredDocumentsComponent) {
      this.requestRequiredDocumentsComponent.saveDocuments();
    } else {
      console.error('Request required documents component not initialized');
    }
  }

  updateRequestStatusToScheduled(): void {
    if (this.requestReviewComponent) {
      this.requestReviewComponent.onSubmit();
    } else {
      console.error('Request review component not initialized');
    }
  }
}
