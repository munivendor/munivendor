import {
  Component,
  ViewChild,
  OnDestroy,
  HostListener,
  OnInit,
  PLATFORM_ID,
  Inject,
} from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormGroup } from '@angular/forms';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatStepperModule } from '@angular/material/stepper';
import { MatButtonModule } from '@angular/material/button';
import { Document } from '../model/document.model';
import { ActivatedRoute, Router, NavigationStart } from '@angular/router';
import { BasicRequestComponent } from '../request-basic.component';
import { RequestOverviewComponent } from '../request-overview.component';
import { RequestRequiredDocumentsComponent } from '../request-required-docs.component';
import { RequestReviewComponent } from '../request-review.component';
import { Request } from '../model/request.model';
import { RequestSection } from '../model/requestsection.model';
import { Subject, takeUntil, filter } from 'rxjs';
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
export class CreateRequestStepper implements OnInit, OnDestroy {
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
    private router: Router,
    private stateService: StateService,
    @Inject(PLATFORM_ID) private platformId: Object,
  ) {
    this.route.paramMap.pipe(takeUntil(this.destroy$)).subscribe((params) => {
      this.idParam = params.get('requestId');
      this.requestId = this.idParam ? +this.idParam : null;

      // Check for redirect after route params are loaded
      this.checkAndRedirectOnReload();
    });

    // Listen for navigation events to clear sessionStorage when leaving this route
    this.router.events
      .pipe(
        filter(
          (event): event is NavigationStart => event instanceof NavigationStart,
        ),
        takeUntil(this.destroy$),
      )
      .subscribe((event) => {
        // Check if navigating away from create-request-view
        if (!event.url.includes('/create-request-view')) {
          this.clearCreationSessionStorage();
        }
      });
  }

  ngOnInit(): void {
    // Determine if we're in creation mode based on route
    if (isPlatformBrowser(this.platformId)) {
      // If there's no requestId in the route initially, we're creating
      if (!this.idParam) {
        sessionStorage.setItem('request_in_creation_mode', 'true');
      } else {
        // We're editing, so remove the flag if it exists
        sessionStorage.removeItem('request_in_creation_mode');
        sessionStorage.removeItem('currentRequestId');
      }
    }

    // Also check on init in case route params loaded before constructor subscription
    this.checkAndRedirectOnReload();
  }

  private checkAndRedirectOnReload(): void {
    // Only run in browser environment
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    // Check if we're in creation mode (not edit mode)
    const isCreationMode =
      sessionStorage.getItem('request_in_creation_mode') === 'true';

    // Check multiple sources for requestId, including sessionStorage for persistence
    const sessionRequestId = sessionStorage.getItem('currentRequestId');
    const hasRequestId =
      this.stateService.getRequestId() ||
      this.requestId ||
      (sessionRequestId ? +sessionRequestId : null);

    const isPageReload =
      performance?.navigation?.type === 1 ||
      (performance as any)?.navigation?.type === 'reload';

    // Only redirect if in creation mode AND page was reloaded
    if (hasRequestId && isPageReload && isCreationMode) {
      // Clear the session storage before redirecting
      this.clearCreationSessionStorage();
      this.router.navigate(['/requests-view']);
    }
  }

  private clearCreationSessionStorage(): void {
    if (isPlatformBrowser(this.platformId)) {
      sessionStorage.removeItem('currentRequestId');
      sessionStorage.removeItem('request_in_creation_mode');
    }
  }

  @HostListener('window:beforeunload', ['$event'])
  unloadNotification($event: any): void {
    $event.preventDefault();
    $event.returnValue =
      'You have unsaved changes. Are you sure you want to leave?';
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
