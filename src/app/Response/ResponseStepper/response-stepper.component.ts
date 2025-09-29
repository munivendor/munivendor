import { Component, OnDestroy, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatStepperModule } from '@angular/material/stepper';
import { MatButtonModule } from '@angular/material/button';
import { ActivatedRoute } from '@angular/router';
import { ResponseBasicComponent } from '../response-basic.component';
import { ResponseDetailsComponent } from '../response-details.component';
import { Subject, takeUntil } from 'rxjs';
import { ResponseDocumentsComponent } from '../response-documents.component';
import { ResponseReviewComponent } from '../response-review.component';
import { StateService } from '../../Request/services/state.service';
import { TooltipDirective } from '../../shared/directive/tooltip.directive';
import { Router } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
// import { ResponseNotarizationComponent } from '../response-notarization.component';
import { StepperSelectionEvent } from '@angular/cdk/stepper';

@Component({
  selector: 'response-stepper',
  templateUrl: 'response-stepper.component.html',
  styleUrls: ['response-stepper.component.css'],
  standalone: true,
  imports: [
    MatButtonModule,
    MatStepperModule,
    FormsModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    ResponseBasicComponent,
    ResponseDetailsComponent,
    ResponseDetailsComponent,
    CommonModule,
    ResponseDocumentsComponent,
    ResponseReviewComponent,
    TooltipDirective,
    MatIconModule,
    // ResponseNotarizationComponent
  ],
})
export class ResponseStepper implements OnDestroy {
  @ViewChild(ResponseBasicComponent)
  responseBasicComponent!: ResponseBasicComponent;
  @ViewChild(ResponseDetailsComponent)
  responseDetailsComponent!: ResponseDetailsComponent;
  @ViewChild(ResponseDocumentsComponent)
  responseDocumentsComponent!: ResponseDocumentsComponent;
  @ViewChild(ResponseReviewComponent)
  responseReviewComponent!: ResponseReviewComponent;
  // @ViewChild(ResponseNotarizationComponent) responseNotarizationComponent!: ResponseNotarizationComponent;

  private destroy$ = new Subject<void>();
  allRequiredDocumentsUploaded = false;
  requestId?: number;
  responseId?: number;
  sourceIdParam?: string | undefined | null;
  responseIdParam?: string | undefined | null;
  isEditMode = false;
  isStepValid = false;
  isAutoFillComplete = false;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private stateService: StateService
  ) {
    this.route.paramMap.pipe(takeUntil(this.destroy$)).subscribe((params) => {
      this.sourceIdParam = params.get('sourceId');
      this.requestId = this.sourceIdParam ? +this.sourceIdParam : 0;
      this.responseIdParam = params.get('responseId')
        ? params.get('responseId')
        : this.stateService.getRequestId()?.toString();
    });
  }

  onStepChange(event: StepperSelectionEvent): void {
    // Check if we're navigating to the Review step (index 3, assuming 0-based)
    if (event.selectedIndex === 3 && this.responseReviewComponent) {
      // Refresh the documents data when entering the review step
      this.responseReviewComponent.initializeDocuments();
    }
  }

  onDocumentsValidityChange(valid: boolean): void {
    this.allRequiredDocumentsUploaded = valid;
  }

  goToOfferorProfilePage() {
    this.router.navigate(['/offeror-profile-page']);
  }

  onAutoFillStatusChange(status: boolean) {
    this.isAutoFillComplete = status;
  }

  onFormValidityChange(valid: boolean) {
    this.isStepValid = valid;
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.stateService.clearRequestId();
  }

  saveResponse() {
    if (this.responseBasicComponent) {
      this.responseBasicComponent.saveResponse();
    } else {
      console.error('Basic request component not initialized');
    }
  }

  onSubmitOfferorResponse(): void {
    if (this.responseReviewComponent) {
      this.responseReviewComponent.onConfirmSubmission();
    } else {
      console.error('Response review component not initialized');
    }
  }
}
