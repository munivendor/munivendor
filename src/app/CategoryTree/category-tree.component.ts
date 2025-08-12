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
import { ChangeDetectorRef } from '@angular/core';

// TODO: use treeNode to keep an internal state of all nodes and their collapsed state and save to session storage
//       on load, restore the state from session storage
//       this will allow the tree to maintain its state across page reloads
//       and will also allow the user to collapse/expand nodes without losing their state
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
  newlyCreatedNode: CategoryNode | null = null;
  editedNode: CategoryNode | null = null;
  collapsedStateTree: { [key: string]: boolean } = {};

  constructor(
    private categoryHierarchyService: CategoryHierarchyService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    this.loadCategoryHierarchy();
  }

  isAnyNodeEditing(): boolean {
    return (
      !!this.editedNode ||
      this.categoryHierarchy.some((node) => this.checkEditing(node))
    );
  }

  private checkEditing(node: CategoryNode): boolean {
    if (node.isEditing) return true;
    return node.children?.some((child) => this.checkEditing(child)) ?? false;
  }

  hasChild = (_: number, node: CategoryNode) =>
    !!node.children && node.children.length > 0;

  getNodeIndent(level: number | undefined): number {
    return (level ?? 0) * 30;
  }

  private loadCategoryHierarchy() {
    this.categoryHierarchyService.GetCategoryHierarchy().subscribe({
      next: (categories: CategoryNode[]) => {
        this.updateNodeLevels(categories);
        this.categoryHierarchy = categories;
        this.dataSource.data = categories;
        this.treeControl.dataNodes = categories;

        this.loadFromSessionStorage();
        if (this.collapsedStateTree) {
          this.restoreExpandedNodes(
            Object.keys(this.collapsedStateTree)
              .filter((key) => !this.collapsedStateTree[key])
              .map((key) => (isNaN(Number(key)) ? key : Number(key)))
          );
        }
      },
      error: (error) => {
        console.error('Error fetching categories:', error);
      },
    });
  }

  // data to be passed in payload
  private updateCategoryHierarchy() {
    this.categoryHierarchy = JSON.parse(JSON.stringify(this.dataSource.data));
  }

  // data displayed in UI
  private updateTreeData() {
    this.dataSource.data = JSON.parse(JSON.stringify(this.dataSource.data));
  }

  private createNewNode(level: number): CategoryNode {
    return {
      id: null,
      name: 'New Category',
      tempName: 'New Category',
      parentId: null,
      deleted: false,
      isEditing: true,
      isNew: true,
      level,
      children: [],
    };
  }

  addRootCategory() {
    const newRoot = this.createNewNode(0);

    this.dataSource.data.push(newRoot);
    this.updateCategoryHierarchy();
    this.updateTreeData();
  }

  addChild(parentNode: CategoryNode) {
    this.treeControl.expand(parentNode);
    const expandedNodeIds = this.getExpandedNodeIds();
    const newChild: CategoryNode = this.createNewNode(parentNode.level! + 1);
    newChild.parentId = parentNode.id;

    parentNode.children = parentNode.children || [];
    parentNode.children.push(newChild);

    this.newlyCreatedNode = newChild;
    this.updateNodeLevels(this.dataSource.data);
    this.updateCategoryHierarchy();
    this.updateTreeData();

    if (!this.treeControl.isExpanded(parentNode)) {
      this.treeControl.expand(parentNode);
    }
    this.restoreExpandedNodes(expandedNodeIds);
  }

  editNode(node: CategoryNode): void {
    if (this.isAnyNodeEditing() && !node.isEditing) {
      return;
    }

    if (this.editedNode && this.editedNode !== node) {
      this.saveNodeEdit(this.editedNode);
    }

    node.tempName = node.name;
    node.isEditing = true;
    this.editedNode = node;

    this.cdr.detectChanges();
    setTimeout(() => {
      const inputs = document.querySelectorAll('.edit-input');
      inputs.forEach((input) => {
        if (input instanceof HTMLInputElement) {
          input.focus();
        }
      });
    }, 0);
  }

  saveNodeEdit(node: CategoryNode): void {
    const expandedNodeIds = this.getExpandedNodeIds();
    const parentPath = this.findParentPath(this.categoryHierarchy, node);

    if (node.tempName && node.tempName.trim() !== '') {
      node.name = node.tempName.trim();
      node.isModified = true;
    }

    node.isEditing = false;
    this.editedNode = null;

    this.updateCategoryHierarchy();
    this.updateTreeData();
    this.restoreExpandedNodes(expandedNodeIds);

    parentPath.forEach((parent) => {
      this.treeControl.expand(parent);
    });
    this.cdr.markForCheck();
    this.cdr.detectChanges();
  }

  private findParentPath(
    nodes: CategoryNode[],
    targetNode: CategoryNode,
    currentPath: CategoryNode[] = []
  ): CategoryNode[] {
    for (const node of nodes) {
      if (node === targetNode) {
        return currentPath;
      }

      if (node.children && node.children.length > 0) {
        const foundPath = this.findParentPath(node.children, targetNode, [
          ...currentPath,
          node,
        ]);

        if (foundPath.length > 0) {
          return foundPath;
        }
      }
    }
    return [];
  }

  deleteNode(node: CategoryNode) {
    const expandedNodeIds = this.getExpandedNodeIds();
    const parentPath = this.findParentPath(this.categoryHierarchy, node);

    this.markAndUpdateDeletedNode(node.id, this.categoryHierarchy);
    this.updateCategoryHierarchy();
    this.updateTreeData();
    this.restoreExpandedNodes(expandedNodeIds);

    parentPath.forEach((parent) => {
      this.treeControl.expand(parent);
    });
  }

  private markAndUpdateDeletedNode(
    nodeId: number | null,
    nodes: CategoryNode[]
  ) {
    if (!nodeId) return;
    nodes.forEach((node) => {
      if (node.id === nodeId) {
        node.deleted = true;
      } else if (node.children?.length) {
        this.markAndUpdateDeletedNode(nodeId, node.children);
      }
    });
  }

  private cleanNode(node: CategoryNode): CategoryNode {
    return {
      ...node,
      id: (node.id ?? 0) < 0 ? null : node.id,
      children: node.children?.map((child) => this.cleanNode(child)) || [],
    };
  }

  private buildCollapsedStateTree() {
    const traverse = (nodes: CategoryNode[]) => {
      nodes.forEach((node) => {
        // Use node.id as key; fallback to a unique string if id is null
        const key =
          node.id !== null && node.id !== undefined
            ? node.id.toString()
            : `temp_${Math.random()}`;
        this.collapsedStateTree[key] = !this.treeControl.isExpanded(node);
        if (node.children && node.children.length) {
          traverse(node.children);
        }
      });
    };
    this.collapsedStateTree = {};
    traverse(this.dataSource.data);
  }

  private saveToSessionStorage() {
    sessionStorage.setItem(
      'collapsedStateTree',
      JSON.stringify(this.collapsedStateTree)
    );
  }

  private loadFromSessionStorage() {
    const storedState = sessionStorage.getItem('collapsedStateTree');
    if (storedState) {
      this.collapsedStateTree = JSON.parse(storedState);
    } else {
      this.collapsedStateTree = {};
    }
  }

  saveCategoryHierarchy(): void {
    const cleanedCategoryHierarchy = this.categoryHierarchy.map((node) =>
      this.cleanNode(node)
    );
    const categoryHierarchyString = JSON.stringify(cleanedCategoryHierarchy);
    this.buildCollapsedStateTree();
    this.saveToSessionStorage();

    this.categoryHierarchyService
      .SaveCategoryHierarchy(categoryHierarchyString)
      .subscribe({
        next: (response) => {
          console.log('Category hierarchy saved successfully!');
          this.loadCategoryHierarchy();
          const expandedNodeIds = this.getExpandedNodeIds();
          this.restoreExpandedNodes(expandedNodeIds);
        },
        error: (error) => {
          console.error('Error saving category hierarchy:', error);
        },
      });
  }

  private updateNodeLevels(nodes: CategoryNode[], parentLevel: number = 0) {
    nodes.forEach((node) => {
      node.level = parentLevel;
      if (node.children && node.children.length) {
        this.updateNodeLevels(node.children, parentLevel + 1);
      }
    });
  }

  private getExpandedNodeIds(): (number | string | null)[] {
    const expandedNodeIds: (number | string | null)[] = [];
    const checkNode = (nodes: CategoryNode[]) => {
      nodes.forEach((node) => {
        if (this.treeControl.isExpanded(node)) {
          const nodeId = node.id ?? null;
          if (nodeId !== undefined) {
            expandedNodeIds.push(nodeId);
          }
        }
        if (node.children && node.children.length) {
          checkNode(node.children);
        }
      });
    };
    checkNode(this.dataSource.data);
    return expandedNodeIds;
  }

  private restoreExpandedNodes(expandedNodeIds: (number | string | null)[]) {
    const expandNode = (nodes: CategoryNode[]) => {
      nodes.forEach((node) => {
        const nodeId = node.id ?? null;
        if (nodeId !== undefined && expandedNodeIds.includes(nodeId)) {
          this.treeControl.expand(node);
        }
        if (node.children && node.children.length) {
          expandNode(node.children);
        }
      });
    };
    expandNode(this.dataSource.data);
  }
}
