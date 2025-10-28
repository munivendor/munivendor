import { Component, Input, OnInit, OnDestroy } from '@angular/core';
import { RouterModule } from '@angular/router';
import {
  FormGroup,
  FormBuilder,
  ReactiveFormsModule,
  FormArray,
} from '@angular/forms';
import { CommonModule } from '@angular/common';
import { MatCheckbox } from '@angular/material/checkbox';
import { MatFormField } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { forkJoin, Subject, takeUntil } from 'rxjs';
import { RequestService } from './services/request.service';
import { StateService } from './services/state.service';
import { Router } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { CategoryNode } from '../shared/model/category-tree.model';
import { CategoryHierarchyService } from './services/category-hierarchy.service';
import { LoggingService } from '../exceptionhandling/logging.service';

interface FlattenedCategoryNode {
  categoryId: string;
  name: string;
  parentId: string | null;
}

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
    MatInputModule,
  ],
})
export class RequestReviewComponent implements OnInit, OnDestroy {
  @Input() paramRequestId?: number;
  private destroy$ = new Subject<void>();

  requestId!: number | null;
  requestFinalReviewDetailsForm!: FormGroup;
  requestFinalReviewDetails: any = {};
  docs: any;
  hierarchicalCategories: CategoryNode[] = [];
  flattenedCategories: FlattenedCategoryNode[] = [];
  organizationId: number | null = this.stateService.getOrganizationId();

  constructor(
    private fb: FormBuilder,
    private requestService: RequestService,
    private stateService: StateService,
    private router: Router,
    private snackBar: MatSnackBar,
    private categoryHierarchyService: CategoryHierarchyService,
    private loggingService: LoggingService
  ) {}

  private getCategoryHierarchy() {
    this.categoryHierarchyService
      .GetCategoryHierarchy()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (categories) => {
          this.hierarchicalCategories =
            this.prepareCategoriesForTreeRendering(categories);
          this.flattenedCategories = this.flattenCategories(
            this.hierarchicalCategories
          );
        },
        error: (err) => console.error('Error fetching categories:', err),
      });
  }

  private flattenCategories(
    categories: CategoryNode[],
    parentId: string | null = null
  ): FlattenedCategoryNode[] {
    const flattened: FlattenedCategoryNode[] = [];

    for (const category of categories) {
      flattened.push({
        categoryId: category.categoryId || category.id?.toString() || '',
        name: category.name || '',
        parentId: parentId,
      });

      if (category.children && category.children.length > 0) {
        flattened.push(
          ...this.flattenCategories(
            category.children,
            category.categoryId || category.id?.toString() || ''
          )
        );
      }
    }

    return flattened;
  }

  displayCategoryName = (value: string | number | null): string => {
    if (value == null) {
      return '';
    }

    const searchValue = value.toString();
    const match = this.flattenedCategories.find(
      (cat) => cat.categoryId === searchValue
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

  ngOnInit() {
    this.getCategoryHierarchy();

    if (this.paramRequestId) {
      this.getRequestObjDetails(this.paramRequestId);
    }
    this.stateService.currentRequestHasBeenSaved$
      .pipe(takeUntil(this.destroy$))
      .subscribe((hasBeenSaved) => {
        this.requestId = this.stateService.getRequestId();
        if (hasBeenSaved && this.requestId) {
          if (this.paramRequestId) {
            this.getRequestObjDetails(this.paramRequestId);
          } else if (this.requestId) {
            this.getRequestObjDetails(this.requestId);
          }
        }
      });

    this.requestFinalReviewDetailsForm = this.fb.group({
      requestName: [''],
      category: [''],
      requestType: [''],
      publishDate: [''],
      publishTime: [''],
      closeDate: [''],
      closeTime: [''],
      contractStart: [''],
      contractEnd: [''],
      decisionMakers: this.fb.array([]),
      requestDocuments: this.fb.array([]),
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  getRequestObjDetails(requestId: number) {
    const request$ = this.requestService.GetRequestDetailsById(requestId);
    const requestTypes$ = this.requestService.GetRequestTypes();
    const decisionMakers$ = this.requestService.GetDecisionMakers(
      this.organizationId ?? 0
    );
    const requiredRequestDocuments$ =
      this.requestService.GetRequestRequiredDocumentsById(requestId);

    forkJoin([
      request$,
      requestTypes$,
      decisionMakers$,
      requiredRequestDocuments$,
    ])
      .pipe(takeUntil(this.destroy$))
      .subscribe(
        ([request, requestTypes, decisionMakers, requiredRequestDocuments]) => {
          const category = this.findCategoryById(request.categoryId);
          const requestType = requestTypes.find(
            (r: { requestTypeId: number }) =>
              r.requestTypeId === request.requestTypeId
          );

          const decisionMakersMapped = request.decisionMakerSelections
            .map((selection: { decisionMakerId: number }) =>
              decisionMakers.find(
                (dm: { decisionMakerId: number }) =>
                  dm.decisionMakerId === selection.decisionMakerId
              )
            )
            .filter((dm: any) => dm);

          const requestDocuments = requiredRequestDocuments.documents;

          const { date: publishDate, time: publishTime } = this.splitDateTime(
            request.publishDate
          );
          const { date: closeDate, time: closeTime } = this.splitDateTime(
            request.closeDate
          );
          const { date: contractStart } = this.splitDateTime(
            request.contractStart
          );
          const { date: contractEnd } = this.splitDateTime(request.contractEnd);

          this.requestFinalReviewDetails = {
            ...request,
            category,
            requestType,
            decisionMakers: decisionMakersMapped,
            requestDocuments,
            closeDate,
            publishDate,
            contractStart,
            contractEnd,
            closeTime,
            publishTime,
          };

          this.requestFinalReviewDetailsForm.patchValue({
            requestName: request.requestName,

            category: this.displayCategoryName(request.categoryId),
            requestType: requestType?.requestTypeDesc || '',
            publishDate: publishDate,
            publishTime: publishTime,
            closeDate: closeDate,
            closeTime: closeTime,
            contractStart: contractStart,
            contractEnd: contractEnd,
          });

          this.populateArrayFormControls(
            'decisionMakers',
            decisionMakersMapped
          );
          this.populateArrayFormControls(
            'requestDocuments',
            requiredRequestDocuments
          );
        },
        (error) => {
          console.error('Error fetching data', error);
        }
      );
  }

  findCategoryById(categoryId: number): CategoryNode | null {
    if (!categoryId) return null;
    const categoryIdToFind = categoryId.toString();

    const search = (categories: CategoryNode[]): CategoryNode | null => {
      for (const category of categories) {
        if (
          category.categoryId === categoryIdToFind ||
          category.id?.toString() === categoryIdToFind
        ) {
          return category;
        }
        if (category.children) {
          const found = search(category.children);
          if (found) return found;
        }
      }
      return null;
    };

    return search(this.hierarchicalCategories);
  }

  prepareCategoriesForTreeRendering(
    categories: CategoryNode[],
    level: number = 0
  ): CategoryNode[] {
    return categories
      .filter((cat) => !cat.deleted)
      .map((category) => ({
        ...category,
        categoryId: category.id?.toString() ?? '',
        level,
        expandable: !!category.children?.length,
        children: category.children?.length
          ? this.prepareCategoriesForTreeRendering(category.children, level + 1)
          : undefined,
      }));
  }

  splitDateTime(dateTimeString: string): { date: string; time: string } {
    const utcDate = new Date(dateTimeString + 'Z');
    const dateOptions: Intl.DateTimeFormatOptions = {
      month: '2-digit',
      day: '2-digit',
      year: 'numeric',
    };
    const timeOptions: Intl.DateTimeFormatOptions = {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    };
    return {
      date: new Intl.DateTimeFormat('en-US', dateOptions).format(utcDate),
      time: utcDate.toLocaleTimeString(undefined, timeOptions),
    };
  }

  populateArrayFormControls(controlName: string, items: any[]) {
    const controlArray = this.requestFinalReviewDetailsForm.get(
      controlName
    ) as FormArray;
    controlArray.clear();
    items?.forEach((item) => {
      controlArray.push(this.fb.control(item.name || item));
    });
  }

  onSubmit() {
    const requestIdToUse = this.stateService.getRequestId();
    if (!requestIdToUse) {
      console.error('Error: No valid requestId found.');
      return;
    }

    // Update the request status to 'Scheduled' once users finalize review
    this.requestService
      .UpdateRequestStatus(requestIdToUse, 2)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.snackBar.open('Request successfully submitted!', '', {
            duration: 15000,
            verticalPosition: 'top',
          });
          sessionStorage.removeItem('currentRequestId');
          sessionStorage.removeItem('request_in_creation_mode');
          this.router.navigate(['/requests-view']);
        },
        error: (error) => {
          console.error('Failed to update request status:', error);

          const correlationId = error?.error?.correlationId;

          this.loggingService.logException(
            new Error(`HTTP Error ${error.status}: ${error.statusText}`),
            3,
            {
              organizationId: this.organizationId,
              correlationId: correlationId,
              methodName: 'onSubmit',
              className: 'RequestReviewComponent',
              operation: 'UpdateRequestStatus',
              requestId: requestIdToUse,
              userId: this.stateService.getUserId(),
            }
          );
        },
      });
  }
}
