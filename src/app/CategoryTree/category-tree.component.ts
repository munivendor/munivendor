import { Component, OnInit } from '@angular/core';
import { MatTreeNestedDataSource, MatTreeModule } from '@angular/material/tree';
import { NestedTreeControl } from '@angular/cdk/tree';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

interface CategoryNode {
  id: number;
  name: string;
  isEditing?: boolean;
  children?: CategoryNode[];
}

const TREE_DATA: CategoryNode[] = [
  {
    id: 1,
    name: 'Category 1',
    children: [
      {
        id: 11,
        name: 'Subcategory 1A',
        children: [
          { id: 111, name: 'SubSubcategory 1A-1', children: [{ id: 1111, name: 'SubSubSubcategory 1A-1-1'}] }
        ]
      },
      { id: 12, name: 'Subcategory 1B' }
    ]
  },
  {
    id: 2,
    name: 'Category 2',
    children: [
      { id: 21, name: 'Subcategory 2A' }
    ]
  }
];

@Component({
  selector: 'app-category-tree',
  templateUrl: './category-tree.component.html',
  styleUrls: ['./category-tree.component.css'],
  standalone: true,
  imports: [MatTreeModule, MatButtonModule, MatIconModule, CommonModule, FormsModule],
})
export class CategoryTreeComponent implements OnInit {
  treeControl = new NestedTreeControl<CategoryNode>(node => node.children || []);
  dataSource = new MatTreeNestedDataSource<CategoryNode>();

  // Add this property to your component class
private highestId = 0;

// Add this method to your component class
private getNextId(): number {
  // First, find the current highest ID in the tree
  const findHighestId = (nodes: any[]): number => {
    let maxId = 0;
    nodes.forEach(node => {
      // Convert to number to ensure proper comparison
      const nodeId = typeof node.id === 'string' ? parseInt(node.id, 10) : node.id;
      maxId = Math.max(maxId, isNaN(nodeId) ? 0 : nodeId);
      
      if (node.children && node.children.length > 0) {
        maxId = Math.max(maxId, findHighestId(node.children));
      }
    });
    return maxId;
  };
  
  // Update the highest ID if necessary
  this.highestId = Math.max(this.highestId, findHighestId(this.dataSource.data));
  
  // Return the next ID
  return ++this.highestId;
}
  
  // Track newly added nodes to expand them after tree update
  private newlyCreatedNode: CategoryNode | null = null;

  constructor() {
    this.dataSource.data = JSON.parse(JSON.stringify(TREE_DATA));
  }

  ngOnInit() {
    this.expandAll();
  }

  hasChild = (_: number, node: CategoryNode) => !!node.children && node.children.length > 0;

  editNode(node: CategoryNode) {
    node.isEditing = !node.isEditing;
  }

  addChild(node: CategoryNode) {
    // Save expanded nodes state
    const expandedNodeIds = this.getExpandedNodeIds();
    
    if (!node.children) {
      node.children = [];
    }
    
    const newId = Date.now() + Math.floor(Math.random() * 1000);
    const newNode = { 
      id: newId, 
      name: 'New Item', 
      isEditing: true,
      // Initialize with empty children array to make it expandable
      children: []
    };
    
    // Store reference to the newly created node
    this.newlyCreatedNode = newNode;
    
    node.children.push(newNode);
    
    // Update data source with a deep clone
    this.updateTreeData();
    
    // Restore expanded nodes state
    this.restoreExpandedNodes(expandedNodeIds);
    
    // Make sure the parent of the new node is expanded
    this.treeControl.expand(node);
    
    // Find and expand the newly created node after tree update
    this.findAndExpandNewNode(this.dataSource.data, newId);
  }

  // Find the newly created node by ID and expand it
  private findAndExpandNewNode(nodes: CategoryNode[], newNodeId: number) {
    setTimeout(() => {
      const findNode = (nodeArray: CategoryNode[]) => {
        for (const node of nodeArray) {
          if (node.id === newNodeId) {
            // Found the node, expand it
            this.treeControl.expand(node);
            return true;
          }
          
          if (node.children && node.children.length) {
            if (findNode(node.children)) {
              return true;
            }
          }
        }
        return false;
      };
      
      findNode(nodes);
    }, 0);
  }

  deleteNode(node: CategoryNode) {
    // Save expanded nodes state
    const expandedNodeIds = this.getExpandedNodeIds();
    
    // First try to find and delete from roots
    const newData = this.dataSource.data.filter(n => n.id !== node.id);
    
    if (newData.length === this.dataSource.data.length) {
      // Node wasn't at root level, so we need to find its parent
      this.deleteNodeById(node.id, this.dataSource.data);
    } else {
      // It was a root node
      this.dataSource.data = newData;
    }
    
    // Update data source
    this.updateTreeData();
    
    // Restore expanded nodes state
    this.restoreExpandedNodes(expandedNodeIds);
  }
  
  // Helper method to recursively find and delete a node by its ID
  deleteNodeById(id: number, nodes: CategoryNode[]): boolean {
    for (let i = 0; i < nodes.length; i++) {
      const node = nodes[i];
      
      // Check direct children
      if (node.children) {
        const initialLength = node.children.length;
        node.children = node.children.filter(child => child.id !== id);
        
        // If we found and removed the node
        if (node.children.length < initialLength) {
          // Clean up empty children arrays
          if (node.children.length === 0) {
            delete node.children;
          }
          return true;
        }
        
        // If not found, check deeper in the tree
        for (const child of node.children) {
          if (this.deleteNodeById(id, [child])) {
            return true;
          }
        }
      }
    }
    return false;
  }

  // Get IDs of currently expanded nodes
  private getExpandedNodeIds(): number[] {
    const expandedNodeIds: number[] = [];
    
    const checkNode = (nodes: CategoryNode[]) => {
      nodes.forEach(node => {
        if (this.treeControl.isExpanded(node)) {
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
  
  // Restore expanded state for nodes with matching IDs
  private restoreExpandedNodes(expandedNodeIds: number[]) {
    const expandNode = (nodes: CategoryNode[]) => {
      nodes.forEach(node => {
        if (expandedNodeIds.includes(node.id)) {
          this.treeControl.expand(node);
        }
        
        if (node.children && node.children.length) {
          expandNode(node.children);
        }
      });
    };
    
    expandNode(this.dataSource.data);
  }
  
  // Update tree data with a deep clone
  private updateTreeData() {
    this.dataSource.data = JSON.parse(JSON.stringify(this.dataSource.data));
  }

  // Expand all nodes (for initial setup)
  private expandAll() {
    const expandNode = (nodes: CategoryNode[]) => {
      nodes.forEach(node => {
        if (node.children && node.children.length > 0) {
          this.treeControl.expand(node);
          expandNode(node.children);
        }
      });
    };
    
    expandNode(this.dataSource.data);
  }

  addRootCategory() {
    const newNode = {
      id: this.getNextId(), // You'll need a method to generate unique IDs
      name: 'New Category',
      isEditing: true,
      children: []
    };
    
    const data = this.dataSource.data;
    data.push(newNode);
    this.dataSource.data = [...data]; // Trigger change detection
    
    // Optional: Automatically focus the new input field
    setTimeout(() => {
      const inputElement = document.querySelector('.edit-input:last-of-type');
      if (inputElement) {
        (inputElement as HTMLElement).focus();
      }
    });
  }
}