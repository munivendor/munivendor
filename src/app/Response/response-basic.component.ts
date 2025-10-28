import {
  Component,
  EventEmitter,
  Inject,
  Input,
  OnInit,
  Output,
  PLATFORM_ID,
  ViewChild,
  ViewEncapsulation,
} from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { RequestService } from '../Request/services/request.service';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { CategoryHierarchyService } from '../Request/services/category-hierarchy.service';
import { Subject, takeUntil, forkJoin, BehaviorSubject } from 'rxjs';
import { MatButtonModule } from '@angular/material/button';
import { MatMenuTrigger } from '@angular/material/menu';
import { MatMenuModule } from '@angular/material/menu';
import { Router } from '@angular/router';
import { OfferorProfileService } from '../shared/service/offeror-profile.service';
import { Response } from '../shared/model/response.model';
import { StateService } from '../Request/services/state.service';
import { TooltipDirective } from '../shared/directive/tooltip.directive';
import { LoggingService } from '../exceptionhandling/logging.service';
import { MatSnackBar } from '@angular/material/snack-bar';
import { AuthService } from '../authorization/auth.service';
import { SnackbarNotificationService } from '../shared/service/snackbar-notification.service';

interface FlattenedCategoryNode {
  name: string;
  categoryId: string;
  level: number;
  expandable: boolean;
  parentId?: string | null;
  children?: FlattenedCategoryNode[];
}

interface AuthorizingOfficial {
  vendorAuthorizingOfficialId: number;
  firstName: string;
  lastName: string;
}

@Component({
  selector: 'response-basic',
  templateUrl: './response-basic.component.html',
  styleUrls: ['./response-basic.component.css'],
  standalone: true,
  encapsulation: ViewEncapsulation.None,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatTooltipModule,
    MatInputModule,
    MatFormFieldModule,
    MatCardModule,
    MatIconModule,
    MatButtonModule,
    MatMenuModule,
    MatSelectModule,
    TooltipDirective,
  ],
  providers: [RequestService],
})
export class ResponseBasicComponent implements OnInit {
  @ViewChild(MatMenuTrigger) menuTrigger!: MatMenuTrigger;
  @Input() sourceIdParam?: string | null | undefined;
  @Input() requestId?: number;
  @Output() formValidityChange = new EventEmitter<boolean>();
  @Input() isEditMode = false;
  @Input() responseIdParam?: string | undefined | null;
  requestForm!: FormGroup;
  request: Response | undefined;
  responseForm: FormGroup;
  private destroy$ = new Subject<void>();
  authorizingOfficialId: number | null = null;
  organizationId = this.stateService.getOrganizationId();
  responseIdFromStateService = this.stateService.getRequestId();
  filteredCategoriesSubject = new BehaviorSubject<FlattenedCategoryNode[]>([]);
  flattenedCategories: FlattenedCategoryNode[] = [];
  authorizingOfficialTooltip: any;
  authorizingOfficials: AuthorizingOfficial[] = [];

  constructor(
    private requestService: RequestService,
    private fb: FormBuilder,
    private categoryHierarchyService: CategoryHierarchyService,
    private router: Router,
    private stateService: StateService,
    private offerorProfileService: OfferorProfileService,
    private loggingService: LoggingService,
    private _snackBar: MatSnackBar,
    private authService: AuthService,
    private snackbarNotificationService: SnackbarNotificationService,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {
    this.responseForm = this.fb.group({
      responseName: ['', Validators.required],
      authorizingOfficial: [null, Validators.required],
    });
  }

  private fetchAuthorizingOfficials(): void {
    this.offerorProfileService
      .GetOfferorAuthorizingOfficials(Number(this.organizationId))
      .pipe(takeUntil(this.destroy$))
      .subscribe(
        (officials) => {
          this.authorizingOfficials = officials || [];

          if (this.authorizingOfficials.length > 0) {
            const firstOfficial = this.authorizingOfficials[0];
            this.authorizingOfficialId =
              firstOfficial.vendorAuthorizingOfficialId;

            this.responseForm.patchValue({
              authorizingOfficial: firstOfficial.vendorAuthorizingOfficialId,
            });
          } else {
            this.authorizingOfficialId = null;
            this.responseForm.patchValue({
              authorizingOfficial: null,
            });
          }
        },
        (error) => {
          this.authorizingOfficials = [];
          this.authorizingOfficialId = null;
          this.responseForm.patchValue({
            authorizingOfficial: null,
          });

          const correlationId = error?.error?.correlationId;

          this.loggingService.logException(
            new Error(`HTTP Error ${error.status}: ${error.statusText}`),
            3,
            {
              requestId: this.stateService.getRequestId(),
              organizationId: this.organizationId,
              correlationId: correlationId,
              methodName: 'fetchAuthorizingOfficials',
              className: 'ResponseBasicsComponent',
              operation: 'GetOfferorAuthorizingOfficials',
              userId: this.stateService.getUserId(),
            }
          );
          if (error.status !== 401 && this.authService.isAuthenticated) {
            this.snackbarNotificationService.showSnackbarError(correlationId);
          }
        }
      );
  }

  onAuthorizingOfficialChange(officialId: number): void {
    this.authorizingOfficialId = officialId;
  }

  ngOnInit(): void {
    this.authorizingOfficialTooltip = {
      header: 'Required',
      body: 'Please designate an authorizing official for this offer. An Authorizing Official is a person authorized from your organization to submit offers in response to government agency solicitations.',
      actionLabel: 'Offeror Profile Page',
      width: '320px',
      onAction: () => this.goToOfferorProfilePage(),
      transformStyle: 'translate(-50%, -102%)',
    };

    if (this.sourceIdParam) {
      this.loadTemplateRequest(Number(this.sourceIdParam));
      this.fetchAuthorizingOfficials();
    }

    if (this.responseIdParam) {
      this.loadResponseRequest(Number(this.responseIdParam));
    } else if (this.responseIdFromStateService) {
      this.loadResponseRequest(this.responseIdFromStateService);
    }

    this.responseForm.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.formValidityChange.emit(this.responseForm.valid);
      });

    this.formValidityChange.emit(this.responseForm.valid);
  }

  private loadTemplateRequest(requestId: number): void {
    const request$ = this.requestService.GetRequestDetailsById(requestId);
    const categories$ = this.categoryHierarchyService.GetCategoryHierarchy();
    const requestTypes$ = this.requestService.GetRequestTypes();

    forkJoin([request$, categories$, requestTypes$])
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: ([request, categories, requestTypes]) => {
          this.flattenedCategories = this.flattenCategories(categories);

          const category = this.flattenedCategories.find(
            (cat) => cat.categoryId === request.categoryId.toString()
          );

          const requestType = requestTypes.find(
            (r: { requestTypeId: number }) =>
              r.requestTypeId === request.requestTypeId
          );

          this.requestForm = this.fb.group({
            requestName: [{ value: request?.requestName, disabled: true }],
            requestCategory: [
              {
                value: category ? this.buildBreadcrumbPath(category) : '',
                disabled: true,
              },
            ],
            categoryId: [request.categoryId],
            requestType: [
              { value: requestType?.requestTypeDesc, disabled: true },
            ],
            publishDateAndTime: [
              {
                value: this.formatDateTime(request.publishDate),
                disabled: true,
              },
            ],
            publishDate: [{ value: request.publishDate, disabled: true }],
            publishTime: [
              {
                value: this.convertUtcToLocalTimeOnly(request.publishDate),
                disabled: true,
              },
            ],
            closeDateAndTime: [
              { value: this.formatDateTime(request.closeDate), disabled: true },
            ],
            closeDate: [{ value: request.closeDate, disabled: true }],
            closeTime: [
              {
                value: this.convertUtcToLocalTimeOnly(request.closeDate),
                disabled: true,
              },
            ],
            contractStartDate: [
              {
                value: this.getDateOnly(request.contractStart),
                disabled: true,
              },
            ],
            contractEndDate: [
              { value: this.getDateOnly(request.contractEnd), disabled: true },
            ],
          });
        },
        error: (error: any) => {
          console.error('Error loading template request:', error);

          const correlationId = error?.error?.correlationId;
          let operation = 'UnknownOperation';
          const errorUrl = error?.url?.toLowerCase?.() || '';

          if (errorUrl.includes('requestdetails'))
            operation = 'GetRequestDetailsById';
          else if (errorUrl.includes('categoryhierarchy'))
            operation = 'GetCategoryHierarchy';
          else if (errorUrl.includes('requesttypes'))
            operation = 'GetRequestTypes';

          this.loggingService.logException(
            new Error(`HTTP Error ${error.status}: ${error.statusText}`),
            3,
            {
              requestId: requestId,
              organizationId: this.organizationId,
              correlationId: correlationId,
              methodName: 'loadTemplateRequest',
              className: 'ResponseBasicsComponent',
              operation: operation,
              userId: this.stateService.getUserId(),
            }
          );

          if (error.status !== 401 && this.authService.isAuthenticated) {
            this.snackbarNotificationService.showSnackbarError(correlationId);
          }
        },
      });
  }

  private flattenCategories(categories: any[]): FlattenedCategoryNode[] {
    const flattened: FlattenedCategoryNode[] = [];

    const flatten = (
      nodes: any[],
      level: number = 0,
      parentId: string | null = null
    ) => {
      nodes.forEach((node) => {
        const flatNode: FlattenedCategoryNode = {
          name: node.categoryName || node.name,
          categoryId: node.id?.toString() || node.categoryId?.toString(),
          level: level,
          expandable: node.children && node.children.length > 0,
          parentId: parentId,
          children: [],
        };

        flattened.push(flatNode);

        if (node.children && node.children.length > 0) {
          flatten(node.children, level + 1, flatNode.categoryId);
        }
      });
    };

    flatten(categories);
    return flattened;
  }

  displayCategoryName = (value: string | number | null): string => {
    if (value == null) {
      return '';
    }
    const match = this.flattenedCategories.find(
      (cat) => cat.categoryId === value
    );
    if (match) {
      return this.buildBreadcrumbPath(match);
    }

    return typeof value === 'string' ? value : '';
  };

  private buildBreadcrumbPath(node: FlattenedCategoryNode): string {
    const path = [node.name];
    let currentParentId = node.parentId;

    while (currentParentId) {
      const parentNode = this.flattenedCategories.find(
        (cat) => cat.categoryId === currentParentId
      );
      if (parentNode) {
        path.unshift(parentNode.name);
        currentParentId = parentNode.parentId;
      } else {
        break;
      }
    }

    return path.join(' > ');
  }

  private getDateOnly(dateTimeString: string): string {
    if (!dateTimeString) return '';
    const date = new Date(dateTimeString);
    return date.toLocaleDateString('en-US');
  }

  private loadResponseRequest(responseId: number): void {
    const request$ = this.requestService.GetRequestDetailsById(responseId);
    const authorizingOfficials$ =
      this.offerorProfileService.GetOfferorAuthorizingOfficials(
        Number(this.organizationId)
      );

    forkJoin([request$, authorizingOfficials$])
      .pipe(takeUntil(this.destroy$))
      .subscribe(
        ([response, authorizingOfficials]) => {
          this.authorizingOfficials = authorizingOfficials || [];

          this.responseForm.patchValue({
            responseName: response.requestName,
            authorizingOfficial: response.authorizingOfficialId || null,
          });

          if (response.authorizingOfficialId) {
            this.authorizingOfficialId = response.authorizingOfficialId;
          }
        },
        (error: any) => {
          console.error('Error loading response request', error);

          const correlationId = error?.error?.correlationId;
          let operation = 'UnknownOperation';
          const errorUrl = error?.url?.toLowerCase?.() || '';
          // request is response in this case
          if (errorUrl.includes('requestdetails'))
            operation = 'GetRequestDetailsById';
          else if (errorUrl.includes('authorizingofficials'))
            operation = 'GetOfferorAuthorizingOfficials';

          this.loggingService.logException(
            new Error(`HTTP Error ${error.status}: ${error.statusText}`),
            3,
            {
              requestId: this.stateService.getRequestId(),
              organizationId: this.organizationId,
              correlationId: correlationId,
              methodName: 'loadResponseRequest',
              className: 'ResponseBasicComponent',
              operation: operation,
              userId: this.stateService.getUserId(),
            }
          );

          if (error.status !== 401 && this.authService.isAuthenticated) {
            this.snackbarNotificationService.showSnackbarError(correlationId);
          }
        }
      );
  }

  private formatDateTime(dateString: string): string {
    if (!dateString) return '';

    const date = new Date(dateString + 'Z');

    if (isNaN(date.getTime())) return '';

    const formattedDate = date.toLocaleDateString('en-US');
    const formattedTime = date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });

    return `${formattedDate} at ${formattedTime}`;
  }

  private convertUtcToLocalTimeOnly(utcDateTime: string): string {
    if (!utcDateTime) return '';
    const utcDate = new Date(utcDateTime + 'Z');
    if (isNaN(utcDate.getTime())) return '';
    const localTime = utcDate.toLocaleTimeString(undefined, {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
    return localTime;
  }

  saveResponse(): void {
    if (this.responseForm.invalid) {
      return;
    }

    const sourceRequestId = this.sourceIdParam;
    const responseName = this.responseForm.value.responseName;
    const request: Response = {
      requestName: responseName,
      requestTypeId: 4,
      sourceRequestId: +(sourceRequestId ?? 0),
      authorizingOfficialId: this.authorizingOfficialId,
      organizationId: this.organizationId,
    };
    const responseIdFromStateService = this.stateService.getRequestId();
    const effectiveResponseId =
      this.responseIdParam ?? responseIdFromStateService;

    if (effectiveResponseId) {
      // EDIT MODE - don't set creation flag
      this.requestService
        .UpdateRequest(Number(effectiveResponseId), request)
        .pipe(takeUntil(this.destroy$))
        .subscribe(
          (responseRequestId: number) => {
            this.stateService.setRequestId(responseRequestId);
            this.stateService.setRequestHasBeenSaved(true);
            // In edit mode, don't set the creation flag
            if (isPlatformBrowser(this.platformId)) {
              sessionStorage.setItem(
                'currentResponseId',
                responseRequestId.toString()
              );
            }
          },
          (error) => {
            console.error('Error updating response:', error);

            const correlationId = error?.error?.correlationId;

            this.loggingService.logException(
              new Error(`HTTP Error ${error.status}: ${error.statusText}`),
              3,
              {
                requestId: effectiveResponseId,
                organizationId: this.organizationId,
                correlationId: correlationId,
                methodName: 'saveResponse',
                className: 'ResponseBasicComponent',
                operation: 'UpdateRequest',
                userId: this.stateService.getUserId(),
              }
            );
            if (error.status !== 401 && this.authService.isAuthenticated) {
              this.snackbarNotificationService.showSnackbarError(correlationId);
            }
          }
        );
    } else if (!responseIdFromStateService || !this.responseIdParam) {
      // CREATION MODE - set the creation flag
      this.requestService
        .CreateRequest(request)
        .pipe(takeUntil(this.destroy$))
        .subscribe(
          (response) => {
            this.stateService.setRequestId(response);
            // Store in sessionStorage for reload detection - only in browser
            if (isPlatformBrowser(this.platformId)) {
              sessionStorage.setItem('currentResponseId', response.toString());
              sessionStorage.setItem('response_in_creation_mode', 'true'); // Mark as creation mode
            }

            this.requestService
              .UpdateRequestStatus(response, 8)
              .pipe(takeUntil(this.destroy$))
              .subscribe(
                (statusResponse) => {
                  console.log('Response status updated successfully');
                },
                (error) => {
                  console.error('Error updating response status:', error);

                  const correlationId = error?.error?.correlationId;

                  this.loggingService.logException(
                    new Error(
                      `HTTP Error ${error.status}: ${error.statusText}`
                    ),
                    3,
                    {
                      organizationId: this.organizationId,
                      correlationId: correlationId,
                      methodName: 'saveResponse',
                      className: 'ResponseBasicsComponent',
                      operation: 'UpdateRequestStatus',
                      userId: this.stateService.getUserId(),
                    }
                  );
                  if (
                    error.status !== 401 &&
                    this.authService.authState.value
                  ) {
                    this.snackbarNotificationService.showSnackbarError(
                      correlationId
                    );
                  }
                }
              );
          },
          (error) => {
            console.error('Error creating response:', error);

            const correlationId = error?.error?.correlationId;

            this.loggingService.logException(
              new Error(`HTTP Error ${error.status}: ${error.statusText}`),
              3,
              {
                organizationId: this.organizationId,
                correlationId: correlationId,
                methodName: 'saveResponse',
                className: 'ResponseBasicsComponent',
                operation: 'CreateRequest',
                userId: this.stateService.getUserId(),
              }
            );
            if (error.status !== 401 && this.authService.isAuthenticated) {
              this.snackbarNotificationService.showSnackbarError(correlationId);
            }
          }
        );
    }
  }

  goToOfferorProfilePage() {
    this.router.navigate(['/offeror-profile-page']);
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
