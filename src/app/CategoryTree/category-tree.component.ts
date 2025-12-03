import {
  Component,
  ElementRef,
  OnInit,
  QueryList,
  ViewChildren,
} from '@angular/core';
import { MatTreeNestedDataSource, MatTreeModule } from '@angular/material/tree';
import { NestedTreeControl } from '@angular/cdk/tree';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CategoryHierarchyService } from '../Request/services/category-hierarchy.service';
import { CategoryNode } from '../shared/model/category-tree.model';
import { LoadingService } from '../shared/LoadingSpinner/loading.service';
import { finalize } from 'rxjs';
import { LoggingService } from '../exceptionhandling/logging.service';
import { StateService } from '../Request/services/state.service';
@Component({
  selector: 'app-category-tree',
  templateUrl: './category-tree.component.html',
  styleUrls: ['./category-tree.component.css'],
  standalone: true,
  imports: [
    MatTreeModule,
    MatButtonModule,
    MatIconModule,
    CommonModule,
    FormsModule,
  ],
})
export class CategoryTreeComponent implements OnInit {
  @ViewChildren('treeNode') treeNodes: QueryList<ElementRef> | undefined;

  treeControl = new NestedTreeControl<CategoryNode>(
    (node) => node.children || []
  );
  dataSource = new MatTreeNestedDataSource<CategoryNode>();
  categoryHierarchy: CategoryNode[] = [];

  constructor(
    private categoryHierarchyService: CategoryHierarchyService,
    private loadingService: LoadingService,
    private loggingService: LoggingService,
    private stateService: StateService
  ) {}

  ngOnInit() {
    this.loadCategoryHierarchy();
  }

  hasChild = (_: number, node: CategoryNode) =>
    !!node.children && node.children.length > 0;

  getNodeIndent(level: number | undefined): number {
    return (level ?? 0) * 30;
  }

  private loadCategoryHierarchy() {
    this.loadingService.show();

    this.categoryHierarchyService
      .GetCategoryHierarchy()
      .pipe(finalize(() => this.loadingService.hide()))
      .subscribe({
        next: (categories: CategoryNode[]) => {
          this.categoryHierarchy = categories;
          this.dataSource.data = categories;
          this.treeControl.dataNodes = categories;
        },
        error: (error) => {
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
        },
      });
  }
}
