import { FormsModule } from '@angular/forms';

import { Component } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { SingleFileUploadComponent } from "../single-file-upload/single-file-upload.component";
import { StateService } from '../Request/services/state.service';
import { Request } from '../Request/model/request.model';

import {
  MatDialogActions,
  MatDialogClose,
  MatDialogContent,
  MatDialogRef,
  MatDialogTitle
} from '@angular/material/dialog';



@Component({
  selector: 'app-file-upload-dialog',
  templateUrl: './file-upload-dialog.component.html',
  styleUrls: ['./file-upload-dialog.component.css'],
  standalone: true,
  imports: [
    MatFormFieldModule,
    MatInputModule,
    FormsModule,
    MatButtonModule,
    MatDialogTitle,
    MatDialogContent,
    MatDialogActions,
    MatDialogClose,
    SingleFileUploadComponent
  ],
 
})
export class FileUploadDialogComponent {
  text: string = '';
  selectedFile: File | null = null;
  isFileUploaded: boolean = false;
  requestId: number | undefined;
  

  constructor(public dialogRef: MatDialogRef<FileUploadDialogComponent>, private state: StateService) {}

  ngOnInit() {
     
    var request = this.state.getState () as Request;   
    this.requestId= request.requestId;
 }
  onNoClick(): void {
    this.dialogRef.close();
  }

  onFileUploaded(isUploaded: boolean) {
    this.isFileUploaded = isUploaded;
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

