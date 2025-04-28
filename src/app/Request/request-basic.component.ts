import { Component, OnInit, OnDestroy, Input, Output, EventEmitter, ChangeDetectorRef, ViewChild } from '@angular/core';
import { RouterModule } from '@angular/router';
import { FormGroup, FormBuilder, FormArray, ReactiveFormsModule, Validators, FormControl, FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { RequestService } from './services/request.service';
import { StateService } from './services/state.service';
import { DecisionMaker } from './model/decisionmaker.model';
import { RequestType } from './model/requesttype.model';
import { Request } from './model/request.model';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatDatepickerInputEvent, MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { NgxMatTimepickerModule } from 'ngx-mat-timepicker';
import { MatIconModule } from '@angular/material/icon';
import { BehaviorSubject, forkJoin, Subject, takeUntil } from 'rxjs';
import { MatTreeModule } from '@angular/material/tree';
import { CategoryHierarchyService } from './services/category-hierarchy.service';
import { CategoryNode } from '../shared/model/category-tree.model';
import { debounceTime, distinctUntilChanged, filter, tap } from 'rxjs/operators';
import { MatAutocompleteModule } from '@angular/material/autocomplete';

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
    MatAutocompleteModule
  ],
})

export class BasicRequestComponent implements OnInit, OnDestroy {
  @Input() requestId?: number;
  @Input() idParam?: string | null | undefined;
  @Output() deleteDropdown = new EventEmitter<{ decisionMakerId: number | null }>();
  @Output() formValidityChange = new EventEmitter<boolean>();

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
  municipalityId = 1;

  constructor(
    private fb: FormBuilder,
    private requestService: RequestService,
    private stateService: StateService,
    private cdr: ChangeDetectorRef,
    private categoryHierarchyService: CategoryHierarchyService
  ) {
    this.flattenCategories();
  }

  ngOnInit() {
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
          tap(() => lastStatus = this.basicsFormGroup.valid)
        )
        .subscribe(() => {
          this.formValidityChange.emit(this.basicsFormGroup.valid);
        });
    }
  }

  getNodeIndent(level: number | undefined): number {
    return (level ?? 0) * 30;
  }

  applyCategoryFilter(value: string | { name: string }) {
    const name = typeof value === 'string' ? value : value?.name;
    const filterValue = name?.toLowerCase() ?? '';
  
    this.isFiltering = !!filterValue;
  
    if (!filterValue) {
      this.isFiltering = false;
  
      const visible: FlattenedCategoryNode[] = [];
  
      for (const node of this.flattenedCategories) {
        if (node.level === 0 || this.isNodeVisible(node)) {
          const parentId = node.parentId;
          if (!parentId || this.expandedNodes.has(parentId) || node.level === 0) {
            visible.push(node);
          }
        }
      }
  
      this.filteredCategoriesSubject.next(visible);
      return;
    }
  
    const matched = this.flattenedCategories.filter(cat =>
      cat.name.toLowerCase().includes(filterValue)
    );
  
    const matchedWithChildren = new Set<FlattenedCategoryNode>();
  
    for (const match of matched) {
      matchedWithChildren.add(match);
      this.collectAllDescendants(parseInt(match.categoryId), matchedWithChildren);
    }
  
    const filtered = Array.from(matchedWithChildren);
  
    this.expandParentsOfFilteredNodes(filtered);
    this.filteredCategoriesSubject.next(filtered);
  }

  private collectAllDescendants(parentId: number, result: Set<FlattenedCategoryNode>) {
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
        const parentNode = this.flattenedCategories.find(cat => cat.categoryId === currentParentId);
        currentParentId = parentNode?.parentId;
      }
    }

    for (const id of toExpand) {
      this.expandedNodes.add(id);
    }

    for (const id of toExpand) {
      const parentNode = this.flattenedCategories.find(cat => cat.categoryId === id);
      if (parentNode && !filtered.includes(parentNode)) {
        filtered.push(parentNode);
      }
    }

    filtered.sort((a, b) => {
      const indexA = this.flattenedCategories.findIndex(cat => cat.categoryId === a.categoryId);
      const indexB = this.flattenedCategories.findIndex(cat => cat.categoryId === b.categoryId);
      return indexA - indexB;
    });
  }

  // triggers autocomplete dropdown to display since the component is a
  // custom tree-like autocomplete and value is manually set by category ID
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
      const parent = this.flattenedCategories.find(cat => cat.categoryId === parentId);
      parentId = parent?.parentId;
    }
    return true;
  }

  prepareCategoriesForTreeRendering(categories: CategoryNode[], level: number = 0): CategoryNode[] {
    return categories
      .filter(cat => !cat.deleted)
      .map(category => ({
        ...category,
        categoryId: category.id?.toString() ?? '',
        level,
        expandable: !!category.children?.length,
        children: category.children?.length
          ? this.prepareCategoriesForTreeRendering(category.children, level + 1)
          : undefined
      }));
  }

  flattenCategories(): void {
    this.flattenedCategories = [];
    this.processCategoryLevel(this.hierarchicalCategories);
  }

  private processCategoryLevel(categories: CategoryNode[], level = 0, parentId: string | null = null): void {
    categories.forEach(category => {
      const catId = category.categoryId ?? '';
      const flatNode: FlattenedCategoryNode = {
        name: category.name,
        categoryId: catId,
        level: level,
        expandable: !!category.children?.length,
        parentId: parentId ?? undefined
      };

      this.flattenedCategories.push(flatNode);

      if (category.children?.length) {
        this.processCategoryLevel(category.children, level + 1, catId);
      }
    });
  }

  toggleExpand(categoryId: number, event: MouseEvent): void {
    event.stopPropagation();
    if (this.expandedNodes.has(categoryId.toString())) {
      this.expandedNodes.delete(categoryId.toString());
    } else {
      this.expandedNodes.add(categoryId.toString());
    }
  }

  isExpanded(categoryId: string): boolean {
    return this.expandedNodes.has(categoryId);
  }

  private formStatus$ = new Subject<void>();

  private initializeForm(data: any = null): void {
    this.formStatus$.next();

    this.createFormGroup(data);
    this.handleCategoryValueChanges();
    this.monitorFormValidity();

    this.emitInitialFormValidity();
    this.fetchInitialData();
  }

  private createFormGroup(data: any = null): void {
    this.basicsFormGroup = this.fb.group({
      category: [data?.category || '', Validators.required],
      requestType: [data?.requestType || '', Validators.required],
      requestName: [data?.requestName || '', Validators.required],
      publishDate: [data?.publishDate || '', Validators.required],
      publishTime: [data?.publishTime || '', Validators.required],
      openDate: [data?.openDate || '', Validators.required],
      openTime: [data?.openTime || '', Validators.required],
      contractStartDate: [data?.contractStartDate || '', Validators.required],
      contractEndDate: [data?.contractEndDate || '', Validators.required],
      dropdowns: this.fb.array(data?.dropdowns || [this.createDropdownControl()]),
    });
  }

  private handleCategoryValueChanges(): void {
    const categoryControl = this.basicsFormGroup.get('category');
    if (!categoryControl) return;

    categoryControl.valueChanges
      .pipe(debounceTime(200), distinctUntilChanged())
      .subscribe(value => {
        if (!value) {
          categoryControl.setValue('', { emitEvent: false });
          this.expandedNodes.clear();
        }
        if (value !== null) {
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
        tap(() => lastValid = this.basicsFormGroup.valid)
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
  
    const match = this.flattenedCategories.find(cat => cat.categoryId === value);
    if (match) {
      return match.name;
    }
  
    return typeof value === 'string' ? value : '';
  };

  private fetchInitialData(): void {
    this.categoryHierarchyService.GetCategoryHierarchy()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (categories) => {
          this.hierarchicalCategories = this.prepareCategoriesForTreeRendering(categories);
          this.flattenCategories();
        },
        error: err => console.error('Error fetching categories:', err)
      });

    this.requestService.GetDecisionMakers()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (decisionMakers: DecisionMaker[]) => this.decisionMakers = decisionMakers,
        error: err => console.error('Error fetching decision makers:', err)
      });

    this.requestService.GetRequestTypes()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (requestTypes: RequestType[]) => this.requestTypes = requestTypes,
        error: err => console.error('Error fetching request types:', err)
      });
  }

  selectCategory(categoryId: string, categoryName: string): void {
    this.basicsFormGroup.get('category')?.setValue(categoryId, { emitEvent: true });
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
    const decisionMakers$ = this.requestService.GetDecisionMakers();

    forkJoin([request$, categories$, requestTypes$, decisionMakers$])
      .pipe(takeUntil(this.destroy$))
      .subscribe(
        ([request, categories, requestTypes, decisionMakers]) => {
          const category = this.findCategoryById(categories, request.categoryId);
          const requestType = requestTypes.find((r: { requestTypeId: number }) => r.requestTypeId === request.requestTypeId);
          const decisionMakersMapped = request.decisionMakerSelections.map(
            (selection: { decisionMakerId: number }) =>
              decisionMakers.find((dm: { decisionMakerId: number }) => dm.decisionMakerId === selection.decisionMakerId)
          ).filter((dm: any) => dm);

          const formData = {
            category: category?.id,
            requestType: requestType?.requestTypeId,
            requestName: request.requestName,
            publishDate: request.publishDate,
            publishTime: this.convertUtcToLocalTimeOnly(request.publishDate),
            openDate: request.openDate,
            openTime: this.convertUtcToLocalTimeOnly(request.openDate),
            contractStartDate: request.contractStart,
            contractEndDate: request.contractEnd,
            dropdowns: this.createDecisionMakerDropdownControls(decisionMakersMapped),
          };

          this.initializeForm(formData);
          if (category) {
            this.basicsFormGroup.get('category')?.setValue(category.id, { emitEvent: true });
            if (category.id !== null) {
              this.selectCategory(category.id.toString(), category.name);
            }

            setTimeout(() => {
              const categoryInput = document.querySelector('input[formControlName="category"]');
              if (categoryInput) {
                (categoryInput as HTMLInputElement).value = category.name;
              }
              this.cdr.detectChanges();
            }, 0);
          }
          this.cdr.detectChanges();
        },
        (error: any) => {
          console.error('Error fetching data', error);
        }
      );
  }

  get dropdowns(): FormArray {
    return this.basicsFormGroup.get('dropdowns') as FormArray;
  }

  private createDecisionMakerDropdownControls(decisionMakers: any[]): any[] {
    return decisionMakers.map((decisionMaker) =>
      this.fb.group({
        decisionMaker: [decisionMaker?.decisionMakerId || '', Validators.required],
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
      this.requestService.DeleteDecisionMaker(this.requestId ?? Number(this.idParam), decisionMakerId)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => {
            this.dropdowns.removeAt(index);
            console.log(`Decision Maker with ID ${decisionMakerId} removed successfully.`);
          },
          error: (error) => console.error(`Error removing Decision Maker with ID ${decisionMakerId}:`, error),
        });
    } else {
      this.dropdowns.removeAt(index);
    }
  }

  getFilteredDecisionMakers(index: number): DecisionMaker[] {
    const selectedDecisionMakerIds = new Set(
      this.dropdowns.controls
        .filter((_, i) => i !== index)
        .map(control => control.get('decisionMaker')?.value)
        .filter(value => value !== null)
    );

    return this.decisionMakers?.filter(dm => !selectedDecisionMakerIds.has(dm.decisionMakerId)) ?? [];
  }

  saveRequest() {
    let request = this.createRequest();
    const requestIdFromStateService = this.stateService.getRequestId();

    if (this.idParam || requestIdFromStateService) {
      this.requestService.UpdateRequest(Number(this.idParam), request)
        .pipe(takeUntil(this.destroy$))
        .subscribe(
          (responseRequestId: number) => {
            console.log('Request updated successfully:', responseRequestId);
            this.getRequestById(responseRequestId);
            this.stateService.setRequestId(responseRequestId);
            this.stateService.setRequestHasBeenSaved(true);
          },
          error => {
            console.error('Error updating Request:', error);
          }
        );
    }
    else if (!this.idParam || !requestIdFromStateService) {
      this.requestService.CreateRequest(request)
        .pipe(takeUntil(this.destroy$))
        .subscribe(
          (responseRequestId: number) => {
            console.log('Request created successfully:', responseRequestId);
            this.requestId = responseRequestId;
            this.stateService.setRequestId(responseRequestId)
            this.cdr.detectChanges();
          },
          error => {
            console.error('Error creating request:', error);
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

    const publishDate = new Date(formValues.publishDate);
    const publishTime = formValues.publishTime;
    request.publishDate = this.combineDateAndTime(publishDate, publishTime);

    const openDate = new Date(formValues.openDate);
    const openTime = formValues.openTime;
    request.openDate = this.combineDateAndTime(openDate, openTime);

    request.contractStart = new Date(formValues.contractStartDate);
    request.contractEnd = new Date(formValues.contractEndDate);
    request.decisionMakerSelections = formValues.dropdowns.map((control: any, index: number) => ({
      decisionMakerNumber: index + 1,
      decisionMakerId: control.decisionMaker
    }));

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
      hour12: false
    });
    return localTime;
  }

  onSelectDate(controlName: string, event: MatDatepickerInputEvent<Date>) {
    if (event.value) {
      const selectedDate = event.value as Date;
      this.basicsFormGroup.get(controlName)?.setValue(
        new Date(
          selectedDate.getFullYear(),
          selectedDate.getMonth(),
          selectedDate.getDate()
        )
      );
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.formStatus$.next();
    this.formStatus$.complete();
  }
}