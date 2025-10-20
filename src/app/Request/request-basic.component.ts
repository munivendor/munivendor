import {
  Component,
  OnInit,
  OnDestroy,
  Input,
  Output,
  EventEmitter,
  ChangeDetectorRef,
  inject,
  PLATFORM_ID,
  Inject,
} from '@angular/core';
import { RouterModule } from '@angular/router';
import {
  FormGroup,
  FormBuilder,
  FormArray,
  ReactiveFormsModule,
  Validators,
  FormControl,
  FormsModule,
  AbstractControl,
  ValidationErrors,
} from '@angular/forms';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { RequestService } from './services/request.service';
import { StateService } from './services/state.service';
import { DecisionMaker } from './model/decisionmaker.model';
import { RequestType } from './model/requesttype.model';
import { Request } from './model/request.model';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import {
  MatDatepickerInputEvent,
  MatDatepickerModule,
} from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { NgxMatTimepickerModule } from 'ngx-mat-timepicker';
import { MatIconModule } from '@angular/material/icon';
import { BehaviorSubject, forkJoin, Subject, takeUntil } from 'rxjs';
import { MatTreeModule } from '@angular/material/tree';
import { CategoryHierarchyService } from './services/category-hierarchy.service';
import { CategoryNode } from '../shared/model/category-tree.model';
import {
  debounceTime,
  distinctUntilChanged,
  filter,
  tap,
} from 'rxjs/operators';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { LoggingService } from '../exceptionhandling/logging.service';
import { MatSnackBar } from '@angular/material/snack-bar';

interface FlattenedCategoryNode {
  name: string;
  categoryId: string;
  level: number;
  expandable: boolean;
  parentId?: string | null;
  children?: FlattenedCategoryNode[];
}

@Component({
  selector: 'request-basic',
  standalone: true,
  templateUrl: './request-basic.component.html',
  styleUrls: ['./request-basic.component.css'],
  imports: [
    ReactiveFormsModule,
    RouterModule,
    CommonModule,
    MatSelectModule,
    FormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatDatepickerModule,
    MatNativeDateModule,
    NgxMatTimepickerModule,
    MatIconModule,
    MatTreeModule,
    MatAutocompleteModule,
  ],
})
export class BasicRequestComponent implements OnInit, OnDestroy {
  @Input() requestId?: number | null;
  @Input() idParam?: string | null | undefined;
  @Output() deleteDropdown = new EventEmitter<{
    decisionMakerId: number | null;
  }>();
  @Output() formValidityChange = new EventEmitter<boolean>();
  private _snackBar = inject(MatSnackBar);
  private _logger = inject(LoggingService);

  filteredCategoriesSubject = new BehaviorSubject<FlattenedCategoryNode[]>([]);
  filteredCategories = this.filteredCategoriesSubject.asObservable();
  isFiltering = false;
  hierarchicalCategories: CategoryNode[] = [];
  flattenedCategories: FlattenedCategoryNode[] = [];
  expandedNodes: Set<string> = new Set<string>();
  private destroy$ = new Subject<void>();
  decisionMakers!: DecisionMaker[];
  categories: CategoryNode[] = [];
  requestTypes: RequestType[] | undefined;
  requestName = new FormControl<string | null>(null, [Validators.required]);
  basicsFormGroup!: FormGroup;
  organizationId = this.stateService.getOrganizationId();
  private formStatus$ = new Subject<void>();

  constructor(
    private fb: FormBuilder,
    private requestService: RequestService,
    private stateService: StateService,
    private cdr: ChangeDetectorRef,
    private categoryHierarchyService: CategoryHierarchyService,
    private loggingService: LoggingService,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {
    this.flattenCategories();
  }

  ngOnInit() {
    this.stateService.setRequestId(null);
    if (this.idParam) {
      this.getRequestById(Number(this.idParam));
    } else {
      this.initializeForm();

      let lastStatus = this.basicsFormGroup.valid;
      this.basicsFormGroup.statusChanges
        .pipe(
          debounceTime(100),
          takeUntil(this.destroy$),
          filter(() => this.basicsFormGroup.valid !== lastStatus),
          tap(() => (lastStatus = this.basicsFormGroup.valid))
        )
        .subscribe(() => {
          this.formValidityChange.emit(this.basicsFormGroup.valid);
        });
    }
  }

  private initializeForm(data: any = null): void {
    this.formStatus$.next();

    this.createFormGroup(data);
    this.handleCategoryValueChanges();
    this.monitorFormValidity();

    this.emitInitialFormValidity();
    this.fetchInitialData();
  }

  flattenCategories(): void {
    this.flattenedCategories = [];
    this.processCategoryLevel(this.hierarchicalCategories);

    // Initialize display based on no filter or filtering
    if (this.isFiltering && this.basicsFormGroup?.get('category')?.value) {
      // Filtering
      this.applyCategoryFilter(this.basicsFormGroup.get('category')?.value);
    } else {
      // No filter
      this.updateFilteredCategoriesWithToggle();
    }
  }

  private updateFilteredCategoriesWithToggle(): void {
    const visible: FlattenedCategoryNode[] = [];
    for (const node of this.flattenedCategories) {
      if (this.isNodeVisible(node)) {
        visible.push(node);
      }
    }
    this.filteredCategoriesSubject.next(visible);
  }

  applyCategoryFilter(value: string | { name: string }) {
    const name = typeof value === 'string' ? value : value?.name;
    const filterValue = name?.toLowerCase() ?? '';
    this.isFiltering = !!filterValue;

    if (!filterValue) {
      this.updateFilteredCategoriesWithToggle();
      return;
    }

    // Show matching nodes + parents, but respect toggles for visibility
    const matched = this.flattenedCategories.filter((cat) =>
      cat.name.toLowerCase().includes(filterValue)
    );

    const relevantNodes = new Set<FlattenedCategoryNode>();

    for (const match of matched) {
      relevantNodes.add(match);
      this.collectAllDescendants(parseInt(match.categoryId), relevantNodes);
    }

    // Add parents of all matched nodes to make the tree structure complete
    this.addParentsOfFilteredNodes(Array.from(relevantNodes), relevantNodes);

    // Filter based on toggle visibility within the relevant nodes
    const finalFiltered = Array.from(relevantNodes).filter((node) => {
      const isMatched = matched.includes(node);
      const isParentOfMatched = this.isParentOfMatchedNodes(node, matched);
      if (isMatched || isParentOfMatched) {
        return true;
      }
      return this.isNodeVisibleInFilterMode(node, relevantNodes);
    });

    finalFiltered.sort((a, b) => {
      const indexA = this.flattenedCategories.findIndex(
        (cat) => cat.categoryId === a.categoryId
      );
      const indexB = this.flattenedCategories.findIndex(
        (cat) => cat.categoryId === b.categoryId
      );
      return indexA - indexB;
    });

    this.filteredCategoriesSubject.next(finalFiltered);
  }

  private addParentsOfFilteredNodes(
    filtered: FlattenedCategoryNode[],
    result: Set<FlattenedCategoryNode>
  ): void {
    const parentsToAdd: Set<string> = new Set();
    // Collect all parent IDs that need to be visible
    for (const node of filtered) {
      let currentParentId = node.parentId;
      while (currentParentId) {
        parentsToAdd.add(currentParentId);
        const parentNode = this.flattenedCategories.find(
          (cat) => cat.categoryId === currentParentId
        );
        currentParentId = parentNode?.parentId;
      }
    }
    // Add parent nodes to result set
    for (const parentId of parentsToAdd) {
      const parentNode = this.flattenedCategories.find(
        (cat) => cat.categoryId === parentId
      );
      if (parentNode) {
        result.add(parentNode);
      }
    }
  }

  private collectAllDescendants(
    parentId: number,
    result: Set<FlattenedCategoryNode>
  ) {
    for (const node of this.flattenedCategories) {
      if (node.parentId === parentId.toString()) {
        result.add(node);
        this.collectAllDescendants(parseInt(node.categoryId), result);
      }
    }
  }

  expandParentsOfFilteredNodes(filtered: FlattenedCategoryNode[]): void {
    const toExpand: Set<string> = new Set();

    for (const node of filtered) {
      let currentParentId = node.parentId;
      while (currentParentId) {
        toExpand.add(currentParentId);
        const parentNode = this.flattenedCategories.find(
          (cat) => cat.categoryId === currentParentId
        );
        currentParentId = parentNode?.parentId;
      }
    }

    for (const id of toExpand) {
      this.expandedNodes.add(id);
    }

    for (const id of toExpand) {
      const parentNode = this.flattenedCategories.find(
        (cat) => cat.categoryId === id
      );
      if (parentNode && !filtered.includes(parentNode)) {
        filtered.push(parentNode);
      }
    }

    filtered.sort((a, b) => {
      const indexA = this.flattenedCategories.findIndex(
        (cat) => cat.categoryId === a.categoryId
      );
      const indexB = this.flattenedCategories.findIndex(
        (cat) => cat.categoryId === b.categoryId
      );
      return indexA - indexB;
    });
  }

  onCategoryFocus(): void {
    const categoryControl = this.basicsFormGroup.get('category');
    const currentValue = categoryControl?.value;
    categoryControl?.setValue(currentValue);
  }

  isNodeVisible(node: FlattenedCategoryNode): boolean {
    if (node.level === 0) return true;
    let parentId = node.parentId;
    while (parentId) {
      if (!this.expandedNodes.has(parentId)) {
        return false;
      }
      const parent = this.flattenedCategories.find(
        (cat) => cat.categoryId === parentId
      );
      parentId = parent?.parentId;
    }
    return true;
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

  private isParentOfMatchedNodes(
    node: FlattenedCategoryNode,
    matched: FlattenedCategoryNode[]
  ): boolean {
    return matched.some((matchedNode) => {
      let parentId = matchedNode.parentId;
      while (parentId) {
        if (parentId === node.categoryId) {
          return true;
        }
        const parent = this.flattenedCategories.find(
          (cat) => cat.categoryId === parentId
        );
        parentId = parent?.parentId;
      }
      return false;
    });
  }

  private isNodeVisibleInFilterMode(
    node: FlattenedCategoryNode,
    relevantNodes: Set<FlattenedCategoryNode>
  ): boolean {
    if (node.level === 0) return true;

    let parentId = node.parentId;
    while (parentId) {
      if (!this.expandedNodes.has(parentId)) {
        return false;
      }
      const parent = this.flattenedCategories.find(
        (cat) => cat.categoryId === parentId
      );
      parentId = parent?.parentId;
    }
    return true;
  }

  private processCategoryLevel(
    categories: CategoryNode[],
    level = 0,
    parentId: string | null = null
  ): void {
    categories.forEach((category) => {
      const catId = category.categoryId ?? '';
      const flatNode: FlattenedCategoryNode = {
        name: category.name,
        categoryId: catId,
        level: level,
        expandable: !!category.children?.length,
        parentId: parentId ?? undefined,
      };

      this.flattenedCategories.push(flatNode);

      if (category.children?.length) {
        this.processCategoryLevel(category.children, level + 1, catId);
      }
    });
  }

  toggleExpand(categoryId: number, event: MouseEvent): void {
    event.stopPropagation();
    const idStr = categoryId.toString();

    if (this.expandedNodes.has(idStr)) {
      this.expandedNodes.delete(idStr);
    } else {
      this.expandedNodes.add(idStr);
    }

    if (this.isFiltering) {
      const currentValue = this.basicsFormGroup?.get('category')?.value;
      if (currentValue) {
        this.applyCategoryFilter(currentValue);
      }
    } else {
      this.updateFilteredCategoriesWithToggle();
    }
  }

  isExpanded(categoryId: string): boolean {
    return this.expandedNodes.has(categoryId);
  }

  private createFormGroup(data: any = null): void {
    this.basicsFormGroup = this.fb.group({
      category: [
        data?.category || '',
        [Validators.required, this.categoryValidator],
      ],
      requestType: [data?.requestType || '', Validators.required],
      requestName: [data?.requestName || '', Validators.required],
      publishDate: [data?.publishDate || '', Validators.required],
      publishTime: [data?.publishTime || '', Validators.required],
      closeDate: [data?.closeDate || '', Validators.required],
      closeTime: [data?.closeTime || '', Validators.required],
      contractStartDate: [data?.contractStartDate || '', Validators.required],
      contractEndDate: [data?.contractEndDate || '', Validators.required],
      dropdowns: this.fb.array(
        data?.dropdowns || [this.createDropdownControl()]
      ),
    });
  }

  private categoryValidator = (
    control: AbstractControl
  ): ValidationErrors | null => {
    if (!control.value) return null;

    if (!this.flattenedCategories || this.flattenedCategories.length === 0) {
      return null;
    }

    const exists = this.flattenedCategories.some(
      (cat) => String(cat.categoryId) === String(control.value)
    );

    return exists ? null : { invalidCategory: true };
  };

  private handleCategoryValueChanges(): void {
    const categoryControl = this.basicsFormGroup.get('category');
    if (!categoryControl) return;

    categoryControl.valueChanges
      .pipe(debounceTime(200), distinctUntilChanged())
      .subscribe((value) => {
        if (!value) {
          categoryControl.setValue('', { emitEvent: false });
          this.isFiltering = false;
          this.updateFilteredCategoriesWithToggle();
        } else if (value !== null) {
          this.applyCategoryFilter(value);
        }
      });
  }

  private monitorFormValidity(): void {
    let lastValid = this.basicsFormGroup.valid;

    this.basicsFormGroup.statusChanges
      .pipe(
        debounceTime(100),
        takeUntil(this.formStatus$),
        filter(() => this.basicsFormGroup.valid !== lastValid),
        tap(() => (lastValid = this.basicsFormGroup.valid))
      )
      .subscribe(() => {
        Promise.resolve().then(() => {
          this.formValidityChange.emit(this.basicsFormGroup.valid);
        });
      });
  }

  private emitInitialFormValidity(): void {
    setTimeout(() => {
      this.formValidityChange.emit(this.basicsFormGroup.valid);
    });
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

  private fetchInitialData(): void {
    this.categoryHierarchyService
      .GetCategoryHierarchy()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (categories) => {
          this.hierarchicalCategories =
            this.prepareCategoriesForTreeRendering(categories);
          this.flattenCategories();

          const categoryControl = this.basicsFormGroup.get('category');
          if (categoryControl && categoryControl.value) {
            const currentValue = categoryControl.value;
            categoryControl.setValue(currentValue, { emitEvent: true });
          }
        },
        error: (error) => {
          const err = new Error(error.message || error.toString());
          err.name = 'Fetch Category Hierarchy Failed';
          this._logger.logException(err, 3, {
            methodName: 'fetchInitialData',
            className: 'RequestBasicComponent',
            operation: 'GetCategoryHierarchy',
            organizationId: this.organizationId,
          });
          this._snackBar.open(
            'Failed to load categories. Please try again later.',
            'Close',
            { verticalPosition: 'top' }
          );
        },
      });

    this.requestService
      .GetDecisionMakers(this.organizationId ?? 0)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (decisionMakers: DecisionMaker[]) =>
          (this.decisionMakers = decisionMakers),
        error: (error) => {
          const err = new Error(error.message || error.toString());
          err.name = 'Fetch Decision Makers Failed';
          this._logger.logException(err, 3, {
            methodName: 'fetchInitialData',
            className: 'RequestBasicComponent',
            operation: 'GetDecisionMakers',
            organizationId: this.organizationId,
          });
          this._snackBar.open(
            'Failed to load decision makers. Please try again later.',
            'Close',
            { verticalPosition: 'top' }
          );
        },
      });

    this.requestService
      .GetRequestTypes()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (requestTypes: RequestType[]) =>
          (this.requestTypes = requestTypes),
        error: (error) => {
          const err = new Error(error.message || error.toString());
          err.name = 'Fetch Request Types Failed';
          this._logger.logException(err, 3, {
            methodName: 'fetchInitialData',
            className: 'YourComponent',
            operation: 'GetRequestTypes',
          });
          this._snackBar.open(
            'Failed to load request types. Please try again later.',
            'Close',
            { verticalPosition: 'top' }
          );
        },
      });
  }

  selectCategory(categoryId: string, categoryName: string): void {
    this.basicsFormGroup
      .get('category')
      ?.setValue(categoryId, { emitEvent: true });
    setTimeout(() => this.cdr.markForCheck());
  }

  private findCategoryById(categories: any[], targetId: number): any {
    for (const category of categories) {
      if (category.id === targetId) {
        return category;
      }

      if (category.children && category.children.length > 0) {
        const found = this.findCategoryById(category.children, targetId);
        if (found) return found;
      }
    }
    return null;
  }

  private getRequestById(requestId: number): void {
    const request$ = this.requestService.GetRequestDetailsById(requestId);
    const categories$ = this.categoryHierarchyService.GetCategoryHierarchy();
    const requestTypes$ = this.requestService.GetRequestTypes();
    const decisionMakers$ = this.requestService.GetDecisionMakers(
      this.organizationId ?? 0
    );

    forkJoin([request$, categories$, requestTypes$, decisionMakers$])
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: ([request, categories, requestTypes, decisionMakers]) => {
          const category = this.findCategoryById(
            categories,
            request.categoryId
          );
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

          const formData = {
            category: category?.id,
            requestType: requestType?.requestTypeId,
            requestName: request.requestName,
            publishDate: this.convertUtcToLocalDate(request.publishDate),
            publishTime: this.convertUtcToLocalTimeOnly(request.publishDate),
            closeDate: this.convertUtcToLocalDate(request.closeDate),
            closeTime: this.convertUtcToLocalTimeOnly(request.closeDate),
            contractStartDate: request.contractStart,
            contractEndDate: request.contractEnd,
            dropdowns:
              this.createDecisionMakerDropdownControls(decisionMakersMapped),
          };

          this.initializeForm(formData);

          if (category) {
            this.basicsFormGroup
              .get('category')
              ?.setValue(category.id, { emitEvent: true });
            if (category.id !== null) {
              this.selectCategory(category.id.toString(), category.name);
            }

            setTimeout(() => {
              const categoryInput = document.querySelector(
                'input[formControlName="category"]'
              );
              if (categoryInput) {
                (categoryInput as HTMLInputElement).value = category.name;
              }
              this.cdr.detectChanges();
            }, 0);
          }

          this.cdr.detectChanges();
        },
        error: (error: any) => {
          console.error('Error fetching request details:', error);

          // Extract correlationId
          const correlationId = error?.error?.correlationId;

          // Identify likely failing operation (based on backend message or URL)
          let operation = 'UnknownOperation';
          const errorMessage = error?.message?.toLowerCase?.() || '';
          const errorUrl = error?.url?.toLowerCase?.() || '';

          if (errorUrl.includes('requestdetails'))
            operation = 'GetRequestDetailsById';
          else if (errorUrl.includes('categoryhierarchy'))
            operation = 'GetCategoryHierarchy';
          else if (errorUrl.includes('requesttypes'))
            operation = 'GetRequestTypes';
          else if (errorUrl.includes('decisionmakers'))
            operation = 'GetDecisionMakers';

          this.loggingService.logException(
            new Error(`HTTP Error ${error.status}: ${error.statusText}`),
            3,
            {
              requestId: requestId,
              organizationId: this.organizationId,
              correlationId: correlationId,
              methodName: 'getRequestById',
              className: 'RequestBasicsComponent',
              operation: operation,
              userId: this.stateService.getUserId(),
            }
          );

          this._snackBar.open(
            'An error occurred while fetching request data.',
            'Close',
            {
              verticalPosition: 'top',
            }
          );
        },
      });
  }

  get dropdowns(): FormArray {
    return this.basicsFormGroup.get('dropdowns') as FormArray;
  }

  private createDecisionMakerDropdownControls(decisionMakers: any[]): any[] {
    return decisionMakers.map((decisionMaker) =>
      this.fb.group({
        decisionMaker: [
          decisionMaker?.decisionMakerId || '',
          Validators.required,
        ],
      })
    );
  }

  private createDropdownControl(): FormGroup {
    return this.fb.group({
      decisionMaker: ['', Validators.required],
    });
  }

  addDropdown(): void {
    this.dropdowns.push(this.createDropdownControl());
  }

  removeDropdown(index: number): void {
    const dropdownControl = this.dropdowns.at(index);
    const decisionMakerId = dropdownControl.get('decisionMaker')?.value;

    if (decisionMakerId && (this.requestId || this.idParam)) {
      this.requestService
        .DeleteDecisionMaker(
          this.requestId ?? Number(this.idParam),
          decisionMakerId
        )
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => {
            this.dropdowns.removeAt(index);
            console.log(
              `Decision Maker with ID ${decisionMakerId} removed successfully.`
            );
          },
          error: (error) =>
            console.error(
              `Error removing Decision Maker with ID ${decisionMakerId}:`,
              error
            ),
        });
    } else {
      this.dropdowns.removeAt(index);
    }
  }

  getFilteredDecisionMakers(index: number): DecisionMaker[] {
    const selectedDecisionMakerIds = new Set(
      this.dropdowns.controls
        .filter((_, i) => i !== index)
        .map((control) => control.get('decisionMaker')?.value)
        .filter((value) => value !== null)
    );

    return (
      this.decisionMakers?.filter(
        (dm) => !selectedDecisionMakerIds.has(dm.decisionMakerId)
      ) ?? []
    );
  }

  saveRequest() {
    let request = this.createRequest();

    const requestIdFromStateService = this.stateService.getRequestId();
    const effectiveRequestId = this.idParam ?? requestIdFromStateService;

    if (effectiveRequestId) {
      this.requestService
        .UpdateRequest(Number(effectiveRequestId), request)
        .pipe(takeUntil(this.destroy$))
        .subscribe(
          (responseRequestId: number) => {
            this.getRequestById(responseRequestId);
            this.stateService.setRequestId(responseRequestId);
            this.stateService.setRequestHasBeenSaved(true);
            if (isPlatformBrowser(this.platformId)) {
              sessionStorage.setItem(
                'currentRequestId',
                responseRequestId.toString()
              );
            }
          },
          (error) => {
            console.error('Error updating Request:', error);
            this._snackBar.open(
              'An error occurred while saving the request. Please try again.',
              'Close',
              { verticalPosition: 'top' }
            );

            // Extract correlationId from error response
            const correlationId = error?.error?.correlationId;

            this.loggingService.logException(
              new Error(`HTTP Error ${error.status}: ${error.statusText}`),
              3,
              {
                requestId: effectiveRequestId,
                organizationId: this.organizationId,
                correlationId: correlationId,
                methodName: 'saveRequest',
                className: 'RequestBasicsComponent',
                operation: 'UpdateRequest',
                userId: this.stateService.getUserId(),
              }
            );
          }
        );
    } else if (!this.idParam || !this.requestId) {
      this.requestService
        .CreateRequest(request)
        .pipe(takeUntil(this.destroy$))
        .subscribe(
          (responseRequestId: number) => {
            this.requestId = responseRequestId;
            this.stateService.setRequestId(responseRequestId);
            if (isPlatformBrowser(this.platformId)) {
              sessionStorage.setItem(
                'currentRequestId',
                responseRequestId.toString()
              );
            }
            this.cdr.detectChanges();
          },
          (error) => {
            console.error('Error creating request:', error);

            // Extract correlationId from error response
            const correlationId = error?.error?.correlationId;

            this.loggingService.logException(
              new Error(`HTTP Error ${error.status}: ${error.statusText}`),
              3,
              {
                organizationId: this.organizationId,
                correlationId: correlationId,
                methodName: 'saveRequest',
                className: 'RequestBasicsComponent',
                operation: 'CreateRequest',
                userId: this.stateService.getUserId(),
              }
            );
          }
        );
    }
  }

  createRequest(): Request {
    const formValues = this.basicsFormGroup.value;
    let request = new Request();

    request.categoryId = formValues.category;
    request.requestTypeId = formValues.requestType;
    request.requestName = formValues.requestName;
    request.organizationId = this.organizationId ?? 0;
    const publishDate = new Date(formValues.publishDate);
    const publishTime = formValues.publishTime;
    request.publishDate = this.combineDateAndTime(publishDate, publishTime);

    const closeDate = new Date(formValues.closeDate);
    const closeTime = formValues.closeTime;
    request.closeDate = this.combineDateAndTime(closeDate, closeTime);

    request.contractStart = new Date(formValues.contractStartDate);
    request.contractEnd = new Date(formValues.contractEndDate);
    request.decisionMakerSelections = formValues.dropdowns.map(
      (control: any, index: number) => ({
        decisionMakerNumber: index + 1,
        decisionMakerId: control.decisionMaker,
      })
    );

    return request;
  }

  private combineDateAndTime(date: Date, timeString: string) {
    const [hours, minutes] = timeString.split(':').map(Number);
    const combinedDate = new Date(date);
    combinedDate.setHours(hours, minutes, 0, 0);
    return combinedDate;
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

  private convertUtcToLocalDate(utcDateTime: string): Date | null {
    if (!utcDateTime) return null;
    const utcDate = new Date(utcDateTime + 'Z');
    if (isNaN(utcDate.getTime())) return null;
    return utcDate;
  }

  disableWeekendsAndPastDates = (date: Date | null): boolean => {
    if (!date) return false;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const isFutureOrToday = date >= today;
    const isWeekday = date.getDay() !== 0 && date.getDay() !== 6;

    return isFutureOrToday && isWeekday;
  };

  onSelectDate(controlName: string, event: MatDatepickerInputEvent<Date>) {
    if (event.value) {
      const selectedDate = event.value as Date;
      this.basicsFormGroup
        .get(controlName)
        ?.setValue(
          new Date(
            selectedDate.getFullYear(),
            selectedDate.getMonth(),
            selectedDate.getDate()
          )
        );
    }
  }

  getNodeIndent(level: number | undefined): number {
    return (level ?? 0) * 30;
  }

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

  disableContractEndDates = (date: Date | null): boolean => {
    if (!date) return false;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const isFutureOrToday = date >= today;
    const isWeekday = date.getDay() !== 0 && date.getDay() !== 6;

    const contractStartDate =
      this.basicsFormGroup?.get('contractStartDate')?.value;

    // If there's a contract start date, ensure end date is not before it
    let isAfterOrEqualToStartDate = true;
    if (contractStartDate) {
      const startDate = new Date(contractStartDate);
      startDate.setHours(0, 0, 0, 0);
      isAfterOrEqualToStartDate = date >= startDate;
    }

    return isFutureOrToday && isWeekday && isAfterOrEqualToStartDate;
  };

  disableCloseDates = (date: Date | null): boolean => {
    if (!date) return false;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const isFutureOrToday = date >= today;
    const isWeekday = date.getDay() !== 0 && date.getDay() !== 6;

    const publishDate = this.basicsFormGroup?.get('publishDate')?.value;

    let isAfterOrEqualToPublishDate = true;
    if (publishDate) {
      const pubDate = new Date(publishDate);
      pubDate.setHours(0, 0, 0, 0);
      isAfterOrEqualToPublishDate = date >= pubDate;
    }

    return isFutureOrToday && isWeekday && isAfterOrEqualToPublishDate;
  };

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.formStatus$.next();
    this.formStatus$.complete();
  }
}
