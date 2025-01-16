// src/app/components/category-manager/category-manager.component.ts
import { Component, OnInit } from '@angular/core';
import { CategoryService } from './service/category.service';
import { Category } from './model/category.model';
import { MatDialog } from '@angular/material/dialog';
import { AddCategoryDialogComponent } from './add-category-dialog.component';
import { MatTreeNestedDataSource } from '@angular/material/tree';
import { NestedTreeControl } from '@angular/cdk/tree';


import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { FormsModule } from '@angular/forms';
import { MatTreeModule } from '@angular/material/tree';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule } from '@angular/material/dialog';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { BrowserModule } from '@angular/platform-browser';

@Component({
  selector: 'app-category-manager',
  templateUrl: './category-manager.component.html',
  styleUrls: ['./category-manager.component.scss'],
  standalone: true,
    imports: [BrowserModule,
        BrowserAnimationsModule,
        FormsModule, MatTreeModule,
        MatButtonModule, MatDialogModule,
        MatCheckboxModule, MatIconModule,
        MatFormFieldModule, MatInputModule
    ],
})
export class CategoryManagerComponent implements OnInit {
  treeControl = new NestedTreeControl<Category>(node => node.children);
  dataSource = new MatTreeNestedDataSource<Category>();
  selectedCategory: Category | null = null;

  constructor(private categoryService: CategoryService, private dialog: MatDialog) {}

  ngOnInit() {
    this.categoryService.categories$.subscribe(categories => {
      this.dataSource.data = categories;
    });
  }

  hasChild = (_: number, node: Category) => !!node.children && node.children.length > 0;

  selectCategory(node: Category) {
    this.selectedCategory = node;
  }

  openAddCategoryDialog() {
    const dialogRef = this.dialog.open(AddCategoryDialogComponent, {
      width: '400px',
      data: { parentCategory: this.selectedCategory },
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        const parentId = result.addUnderParent ? this.selectedCategory?.id ?? null : null;
        this.categoryService.addCategory(result.categoryName, parentId);
      }
    });
  }

  deleteCategory() {
    if (this.selectedCategory) {
      this.categoryService.deleteCategory(this.selectedCategory.id);
      this.selectedCategory = null;
    }
  }
}
