import { CommonModule } from '@angular/common';
import {
  Component,
  EventEmitter,
  Input,
  OnDestroy,
  OnInit,
  Output,
  SimpleChanges,
} from '@angular/core';
import {
  BehaviorSubject,
  debounceTime,
  distinctUntilChanged,
  Subject,
  takeUntil,
} from 'rxjs';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { CategoryHierarchyService } from '../../Request/services/category-hierarchy.service';
import { MatSelectModule } from '@angular/material/select';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatIconModule } from '@angular/material/icon';
import { MatDialog } from '@angular/material/dialog';
import { CategoryNode } from '../../shared/model/category-tree.model';
import { MatButtonModule } from '@angular/material/button';
import { StateService } from '../../Request/services/state.service';
import { LoggingService } from '../../exceptionhandling/logging.service';
import { AuthService } from '../../authorization/auth.service';
import { SnackbarNotificationService } from '../service/snackbar-notification.service';

interface FlattenedCategoryNode {
  name: string;
  categoryId: string;
  level: number;
  expandable: boolean;
  parentId?: string | null;
  children?: FlattenedCategoryNode[];
}

@Component({
  selector: 'custom-category-dropdown',
  standalone: true,
  imports: [
    CommonModule,
    MatFormFieldModule,
    MatSelectModule,
    MatInputModule,
    MatIconModule,
    MatAutocompleteModule,
    ReactiveFormsModule,
    MatButtonModule,
  ],
  templateUrl: './custom-category-dropdown.component.html',
})
export class CustomCategoryDropdownComponent implements OnInit, OnDestroy {
  @Output() categorySelected = new EventEmitter<number>();
  @Input() categoryControl!: FormControl<string | number | null>;

  ngOnInit(): void {
    this.fetchInitialData();
    if (this.categoryControl) {
      this.categoryControl.valueChanges
        .pipe(debounceTime(200), distinctUntilChanged())
        .subscribe((value) => {
          if (!value) {
            this.isFiltering = false;
            this.updateFilteredCategoriesWithToggle();
          } else {
            this.applyCategoryFilter(
              typeof value === 'number' ? value.toString() : value
            );
          }
        });
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['categoryControl'] && this.categoryControl) {
      this.handleCategoryValueChanges();
    }
  }

  private handleCategoryValueChanges(): void {
    if (!this.categoryControl) return;

    this.categoryControl.valueChanges
      .pipe(debounceTime(200), distinctUntilChanged())
      .subscribe((value) => {
        if (!value) {
          this.isFiltering = false;
          this.updateFilteredCategoriesWithToggle();
        } else {
          this.applyCategoryFilter(
            typeof value === 'number' ? value.toString() : value
          );
        }
      });
  }

  selectCategory(categoryId: number, categoryName: string) {
    this.categorySelected.emit(categoryId);
  }

  private destroy$ = new Subject<void>();
  filteredCategoriesSubject = new BehaviorSubject<FlattenedCategoryNode[]>([]);
  filteredCategories = this.filteredCategoriesSubject.asObservable();
  flattenedCategories: FlattenedCategoryNode[] = [];
  expandedNodes: Set<string> = new Set<string>();
  isFiltering = false;
  hierarchicalCategories: CategoryNode[] = [];

  constructor(
    private categoryHierarchyService: CategoryHierarchyService,
    public dialog: MatDialog,
    private stateService: StateService,
    private loggingService: LoggingService,
    private authService: AuthService,
    private snackbarNotificationService: SnackbarNotificationService
  ) {
    this.flattenCategories();
  }

  flattenCategories(): void {
    this.flattenedCategories = [];
    this.processCategoryLevel(this.hierarchicalCategories);

    // Initialize display based on no filter or filtering
    if (this.isFiltering && this.categoryControl?.value) {
      // Filtering
      this.applyCategoryFilter(this.categoryControl?.value ?? '');
    } else {
      // No filter
      this.updateFilteredCategoriesWithToggle();
    }
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

  private fetchInitialData(): void {
    this.categoryHierarchyService
      .GetCategoryHierarchy()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (categories) => {
          this.hierarchicalCategories =
            this.prepareCategoriesForTreeRendering(categories);
          this.flattenCategories();
        },
        error: (error) => {
          console.error('Error fetching categories:', error);
          // Extract correlationId
          const correlationId = error?.error?.correlationId;

          this.loggingService.logException(
            new Error(`HTTP Error ${error.status}: ${error.statusText}`),
            3,
            {
              organizationId: this.stateService.getOrganizationId(),
              correlationId: correlationId,
              methodName: 'fetchInitialData',
              className: 'CustomCategoryDropdownComponent',
              operation: 'GetCategoryHierarchy',
              userId: this.stateService.getUserId(),
            }
          );
          if (error.status !== 401 && this.authService.authState.value) {
            this.snackbarNotificationService.showUploadError(correlationId);
          }
        },
      });
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

  onCategoryFocus(): void {
    const categoryControl = this.categoryControl;
    const currentValue = categoryControl?.value;
    categoryControl?.setValue(currentValue ?? null);
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

  getNodeIndent(level: number | undefined): number {
    return (level ?? 0) * 30;
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
      const currentValue = this.categoryControl?.value;
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

  private updateFilteredCategoriesWithToggle(): void {
    const visible: FlattenedCategoryNode[] = [];
    for (const node of this.flattenedCategories) {
      if (this.isNodeVisible(node)) {
        visible.push(node);
      }
    }
    this.filteredCategoriesSubject.next(visible);
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

  applyCategoryFilter(value: string | number | { name: string }) {
    let name: string | undefined;
    if (typeof value === 'string') {
      name = value;
    } else if (typeof value === 'object' && value !== null && 'name' in value) {
      name = (value as { name: string }).name;
    } else if (typeof value === 'number') {
      name = value.toString();
    }
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

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
