import {
  Component,
  OnDestroy,
  ViewChild,
  HostListener,
  OnInit,
  PLATFORM_ID,
  Inject,
} from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatStepperModule } from '@angular/material/stepper';
import { MatButtonModule } from '@angular/material/button';
import { ActivatedRoute, Router, NavigationStart } from '@angular/router';
import { ResponseBasicComponent } from '../response-basic.component';
import { ResponseDetailsComponent } from '../response-details.component';
import { filter, Subject, takeUntil } from 'rxjs';
import { ResponseDocumentsComponent } from '../response-documents.component';
import { ResponseReviewComponent } from '../response-review.component';
import { StateService } from '../../Request/services/state.service';
import { TooltipDirective } from '../../shared/directive/tooltip.directive';
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
export class ResponseStepper implements OnInit, OnDestroy {
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
  hasOfferorDocuments = false;

  requestId?: number;
  responseId?: number;
  sourceIdParam?: string | undefined | null;
  responseIdParam?: string | undefined | null;
  isEditMode = false;
  isStepValid = false;
  isAutoFillComplete = false;
  organizationId = 1;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private stateService: StateService,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {
    this.route.paramMap.pipe(takeUntil(this.destroy$)).subscribe((params) => {
      this.sourceIdParam = params.get('sourceId');
      this.requestId = this.sourceIdParam ? +this.sourceIdParam : 0;
      this.responseIdParam = params.get('responseId')
        ? params.get('responseId')
        : this.stateService.getRequestId()?.toString();

      // Check for redirect after route params are loaded
      this.checkAndRedirectOnReload();
    });
  }

  ngOnInit(): void {
    // Determine if we're in creation mode based on route
    if (isPlatformBrowser(this.platformId)) {
      // If there's no responseId in the route initially, we're creating
      if (!this.responseIdParam) {
        sessionStorage.setItem('response_in_creation_mode', 'true');
      } else {
        // We're editing, so remove the flag if it exists
        sessionStorage.removeItem('response_in_creation_mode');
        sessionStorage.removeItem('currentResponseId');
      }
    }

    // Also check on init in case route params loaded before constructor subscription
    this.checkAndRedirectOnReload();

    // Listen for navigation events to clear sessionStorage when leaving this route
    this.router.events
      .pipe(
        filter(
          (event): event is NavigationStart => event instanceof NavigationStart
        ),
        takeUntil(this.destroy$)
      )
      .subscribe((event) => {
        // Check if navigating away from create-request-view
        if (!event.url.includes('/response-basic-view')) {
          this.clearCreationSessionStorage();
        }
      });
  }

  onStepChange(event: StepperSelectionEvent): void {
    // Check if we're navigating to the Review step (index 3, assuming 0-based)
    if (event.selectedIndex === 3 && this.responseReviewComponent) {
      // Refresh the documents data when entering the review step
      this.responseReviewComponent.initializeDocuments();
    }
  }

  private checkAndRedirectOnReload(): void {
    // Only run in browser environment
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    // Check if we're in creation mode (not edit mode)
    const isCreationMode =
      sessionStorage.getItem('response_in_creation_mode') === 'true';

    // Check multiple sources for responseId, including sessionStorage for persistence
    const sessionResponseId = sessionStorage.getItem('currentResponseId');
    const hasResponseId =
      this.stateService.getRequestId() ||
      this.responseId ||
      (sessionResponseId ? +sessionResponseId : null);

    const isPageReload =
      performance?.navigation?.type === 1 ||
      (performance as any)?.navigation?.type === 'reload';

    // Only redirect if in creation mode AND page was reloaded
    if (hasResponseId && isPageReload && isCreationMode) {
      // Clear the session storage before redirecting
      this.clearCreationSessionStorage();
      this.router.navigate(['/offeror-requests-view']);
    }
  }

  private clearCreationSessionStorage(): void {
    if (isPlatformBrowser(this.platformId)) {
      sessionStorage.removeItem('currentResponseId');
      sessionStorage.removeItem('response_in_creation_mode');
    }
  }

  @HostListener('window:beforeunload', ['$event'])
  unloadNotification($event: any): void {
    $event.returnValue = true;
  }

  onDocumentsValidityChange(valid: boolean): void {
    this.allRequiredDocumentsUploaded = valid;
    this.hasOfferorDocuments = valid;
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

    // Always clear sessionStorage on component destroy (navigation away)
    this.clearCreationSessionStorage();
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
