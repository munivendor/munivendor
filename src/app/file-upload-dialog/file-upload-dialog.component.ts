import { FormsModule } from '@angular/forms';
import { Component } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { SingleFileUploadComponent } from "../single-file-upload/single-file-upload.component";
import { StateService } from '../Request/services/state.service';
import { Request } from '../Request/model/request.model';
import { HttpClient } from '@angular/common/http';

import {  MatDialogActions, MatDialogClose, MatDialogContent,  MatDialogRef,  MatDialogTitle } from '@angular/material/dialog';

import { environment } from '../../environments/environment';
import { throwError } from 'rxjs';

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
  requestId: number =0;
  file: File | null = null;
  status: 'initial' | 'uploading' | 'success' | 'fail' = 'initial';
  
  constructor(public dialogRef: MatDialogRef<FileUploadDialogComponent>, private state: StateService,  private http: HttpClient ) {}

  ngOnInit() {
     
    var request = this.state.getState () as Request;   
    this.requestId= request.requestId;
 }

 onFileSelected(event: any) {
  const file: File = event.target.files[0];
  if (file) {this.file = file;}
  }

  onUpload(): void {

    if (this.file) {
      const formData = new FormData();
      const url = environment.apiUrl;

      formData.append('file', this.file, this.file.name);
      formData.append('documentName', this.text);

      const upload$ = this.http.post<DocumentType>(url+'UploadDocumentType', formData);

      upload$.subscribe({
        next: (response: DocumentType) => {
          this.dialogRef.close(response);
          this.status = 'success';
        },
        error: (error: any) => {
          this.status = 'fail';
          return throwError(() => error);
        },
      })
    }
      
  }

  onFileUploaded(isUploaded: boolean) {
    this.isFileUploaded = isUploaded;
  }


  onNoClick(): void {
    if (this.selectedFile) {
      console.log('File:', this.selectedFile);
      console.log('Text:', this.text);
    }
    this.dialogRef.close();
    this.dialogRef.close({ documentName: this.text, documentTypeId: 'this.documentTypeId' });

  }
}

