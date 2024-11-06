import { FormsModule } from '@angular/forms';
import { Component, Inject, ChangeDetectorRef } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { SingleFileUploadComponent } from "../single-file-upload/single-file-upload.component";
import { Document} from '../Request/model/document.model';
import { RequestService } from '../Request/services/request.service';

import {  MatDialogActions, MatDialogClose, MatDialogContent,  MatDialogRef,  MatDialogTitle, MAT_DIALOG_DATA } from '@angular/material/dialog';

@Component({
  selector: 'file-upload-dialog',
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
    SingleFileUploadComponent,
  ],
 
})
export class FileUploadDialogComponent {
  documentName: string = '';
  selectedFile: File | null = null;
  municipalityDocuments: Document[] = []; 

  constructor(
    private cdr: ChangeDetectorRef,
    private dialogRef: MatDialogRef<FileUploadDialogComponent>,
    private requestService: RequestService,
    @Inject(MAT_DIALOG_DATA) public data: { municipalityId: number, municipalityDocuments: Document[] }
  ) {
    this.municipalityDocuments = data.municipalityDocuments;
  }

  onFileSelected(event: any): void {
    this.selectedFile = event.target.files[0];
  }

  onUpload(municipalityId: number): void {
    if (!this.selectedFile || !this.documentName) {
      console.error('File or document name is missing');
      return;
    }

    const documentPayload = {
      municipalityId: this.data.municipalityId,
      documentName: this.documentName,
      documentId: null,
    };
    this.requestService.SaveMunicipalityDocument(municipalityId, documentPayload).subscribe(
      (responseDocumentId) => {
        const documentId = responseDocumentId;
        this.uploadFile(documentId);
        console.log('Document saved successfully with documentId:', documentId);
        this.dialogRef.close(documentId);
      },
      (error) => {
        console.error('Error saving document', error);
      }
    );
  }

  private uploadFile(documentId: number): void {
    const formData = new FormData();
    formData.append('file', this.selectedFile as File);
    formData.append('fileName', this.documentName);
  
    this.requestService.UploadDocument(documentId, formData).subscribe(
      (response) => {
        const newDocument = {
          municipalityId: this.data.municipalityId,
          documentId,
          documentName: this.documentName,
          documentDescription: '',
          documentRequired: true
        };
        this.municipalityDocuments.push(newDocument);
        this.cdr.detectChanges();
        this.dialogRef.close(response);
      },
      (error) => {
        console.error('Error uploading file', error);
      }
    );
  }

  onNoClick(): void {
    this.dialogRef.close(false);
  }
}

