// src/app/components/add-category-dialog/add-category-dialog.component.ts
import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { Category } from './model/category.model';

import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { FormsModule } from '@angular/forms';

 




export interface AddCategoryDialogData {
  parentCategory: Category | null;
}

@Component({
  selector: 'app-add-category-dialog',
  templateUrl: './add-category-dialog.component.html',
  styleUrls: ['./add-category-dialog.component.css'],
  standalone: true,
  imports: [MatFormFieldModule, MatInputModule, MatCheckboxModule, FormsModule  ]
                
})
export class AddCategoryDialogComponent {
  categoryName = '';
  addUnderParent = true;

  constructor(
    public dialogRef: MatDialogRef<AddCategoryDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: AddCategoryDialogData
  ) {
    if (!data.parentCategory) {
      this.addUnderParent = false;
    }
  }

  onCancel() {
    this.dialogRef.close();
  }

  onAdd() {
    this.dialogRef.close({
      categoryName: this.categoryName,
      addUnderParent: this.addUnderParent,
    });
  }
}
