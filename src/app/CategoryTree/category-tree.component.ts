import { Component, ElementRef, OnInit, QueryList, ViewChildren } from '@angular/core';
import { MatTreeNestedDataSource, MatTreeModule } from '@angular/material/tree';
import { NestedTreeControl } from '@angular/cdk/tree';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CategoryHierarchyService } from '../Request/services/category-hierarchy.service';
import { CategoryNode } from '../shared/model/category-tree.model';
@Component({
  selector: 'app-category-tree',
  templateUrl: './category-tree.component.html',
  styleUrls: ['./category-tree.component.css'],
  standalone: true,
  imports: [MatTreeModule, MatButtonModule, MatIconModule, CommonModule, FormsModule],
})
export class CategoryTreeComponent implements OnInit {
  @ViewChildren('treeNode') treeNodes: QueryList<ElementRef> | undefined;

  treeControl = new NestedTreeControl<CategoryNode>(node => node.children || []);
  dataSource = new MatTreeNestedDataSource<CategoryNode>();
  categoryHierarchy: CategoryNode[] = [];
  newlyCreatedNode: CategoryNode | null = null;

  constructor(
    private categoryHierarchyService: CategoryHierarchyService,
  ) { }

  ngOnInit() {
    this.loadCategoryHierarchy();
  }

  hasChild = (_: number, node: CategoryNode) => !!node.children && node.children.length > 0;

  getNodeIndent(level: number | undefined): number {
    return (level ?? 0) * 30;
  }

  private loadCategoryHierarchy() {
    this.categoryHierarchyService.getCategoryHierarchy().subscribe({
      next: (categories: CategoryNode[]) => {
        this.updateNodeLevels(categories);
        this.categoryHierarchy = categories;
        this.dataSource.data = categories;
        this.treeControl.dataNodes = categories;
      },
      error: (error) => {
        console.error('Error fetching categories:', error);
      }
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
      deleted: false,
      isEditing: true,
      level,
      children: []
    };
  }

  addRootCategory() {
    const newRoot = this.createNewNode(0);

    this.dataSource.data.push(newRoot);
    this.updateCategoryHierarchy();
    this.updateTreeData();
  }

  addChild(parentNode: CategoryNode) {
    const expandedNodeIds = this.getExpandedNodeIds();
    const newChild: CategoryNode = this.createNewNode(parentNode.level! + 1);

    parentNode.children = parentNode.children || [];
    parentNode.children.push(newChild);

    this.newlyCreatedNode = newChild;
    this.updateNodeLevels(this.dataSource.data);
    this.updateCategoryHierarchy();
    this.updateTreeData();
    this.restoreExpandedNodes(expandedNodeIds);
    this.treeControl.expand(parentNode);
  }

  editNode(node: CategoryNode) {
    node.tempName = node.name;
    node.isEditing = true;
  }

  saveNodeEdit(node: CategoryNode) {
    if (node.tempName && node.tempName.trim() !== '') {
      node.name = node.tempName.trim();
    }
    node.isEditing = false;
    this.updateCategoryHierarchy();
    this.updateTreeData();
    this.saveCategoryHierarchy();
  }

  deleteNode(node: CategoryNode) {
    this.markAndUpdateDeletedNode(node.id, this.categoryHierarchy);
    this.refreshTreeAndExpand();
    this.saveCategoryHierarchy();
  }

  private markAndUpdateDeletedNode(nodeId: number | null, nodes: CategoryNode[]) {
    if (!nodeId) return;
    nodes.forEach(node => {
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
      children: node.children?.map(child => this.cleanNode(child)) || []
    };
  }

  saveCategoryHierarchy(): void {
    const cleanedHierarchy = this.categoryHierarchy.map(node => this.cleanNode(node));
    this.categoryHierarchyService.saveCategoryHierarchy(cleanedHierarchy).subscribe({
      next: () => {
        console.log('Category hierarchy saved successfully!');
        this.loadCategoryHierarchy();
      },
      error: (error) => {
        console.error('Error saving category hierarchy:', error);
      }
    });
  }

  private setTreeData(data: CategoryNode[]) {
    this.dataSource.data = data;
    this.treeControl.dataNodes = data;
  }

  private refreshTreeAndExpand(expandedNode?: CategoryNode) {
    const expandedNodeIds = this.getExpandedNodeIds();
    this.setTreeData([...this.categoryHierarchy]);
    this.restoreExpandedNodes(expandedNodeIds);
    if (expandedNode) {
      this.treeControl.expand(expandedNode);
    }
  }

  private updateNodeLevels(nodes: CategoryNode[], parentLevel: number = 0) {
    nodes.forEach(node => {
      node.level = parentLevel;
      if (node.children && node.children.length) {
        this.updateNodeLevels(node.children, parentLevel + 1);
      }
    });
  }

  private getExpandedNodeIds(): (number | null)[] {
    const expandedNodeIds: (number | null)[] = [];

    const checkNode = (nodes: CategoryNode[]) => {
      nodes.forEach(node => {
        if (node.id !== null && this.treeControl.isExpanded(node)) {
          expandedNodeIds.push(node.id);
        }
        if (node.children && node.children.length) {
          checkNode(node.children);
        }
      });
    };
    checkNode(this.dataSource.data);
    return expandedNodeIds;
  }

  private restoreExpandedNodes(expandedNodeIds: (number | null)[]) {
    const expandNode = (nodes: CategoryNode[]) => {
      nodes.forEach(node => {
        if (node.id !== null && expandedNodeIds.includes(node.id)) {
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