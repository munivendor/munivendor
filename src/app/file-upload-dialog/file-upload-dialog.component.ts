import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { Component } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';

@Component({
  selector: 'app-file-upload-dialog',
  templateUrl: './file-upload-dialog.component.html',
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatFormFieldModule, MatInputModule, FormsModule],
})
export class FileUploadDialogComponent {
  text: string = '';
  selectedFile: File | null = null;

  constructor(public dialogRef: MatDialogRef<FileUploadDialogComponent>) {}

  onNoClick(): void {
    this.dialogRef.close();
  }

  onFileSelected(event: any): void {
    this.selectedFile = event.target.files[0];
  }

  onUpload(): void {
    if (this.selectedFile) {
      // Handle the file upload logic here
      console.log('File:', this.selectedFile);
      console.log('Text:', this.text);
    }
    this.dialogRef.close();
  }
}

