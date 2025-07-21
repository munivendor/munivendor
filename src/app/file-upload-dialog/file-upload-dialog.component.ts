import { FormsModule } from '@angular/forms';
import { Component, Inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { Document } from '../Request/model/document.model';
import { RequestService } from '../Request/services/request.service';
import {
  MatDialogActions,
  MatDialogContent,
  MatDialogRef,
  MatDialogTitle,
  MAT_DIALOG_DATA,
} from '@angular/material/dialog';

export type FileUploadDialogData =
  | { organizationId: number; municipalityDocuments: Document[] }
  | { requestId?: number; responseId?: number; offerorDocuments: Document[] };
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
  ],
})
export class FileUploadDialogComponent {
  selectedFile!: File;
  documentName: string = '';
  municipalityDocuments: Document[] = [];
  documents: Document[] = [];

  constructor(
    private requestService: RequestService,
    public dialogRef: MatDialogRef<FileUploadDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: FileUploadDialogData
  ) {}

  ngOnInit(): void {
    if ('municipalityDocuments' in this.data) {
      this.documents = this.data.municipalityDocuments;
    } else if ('offerorDocuments' in this.data) {
      this.documents = this.data.offerorDocuments;
    }
  }

  onFileSelected(event: any): void {
    this.selectedFile = event.target.files[0];
  }

  onUpload(): void {
    if (!this.selectedFile || !this.documentName) {
      console.error('File or document name is missing');
      return;
    }

    if ('organizationId' in this.data) {
      const municipalityDocument = {
        organizationId: this.data.organizationId,
        documentName: this.documentName,
        documentId: null,
      };

      this.requestService
        .SaveOrganizationDocument(
          this.data.organizationId,
          municipalityDocument,
          this.selectedFile
        )
        .subscribe((response) => {
          console.log('Document uploaded and saved successfully:', response);
          this.dialogRef.close({
            documentId: response.documentId,
            documentName: municipalityDocument.documentName,
            organizationDocumentId: response.organizationDocumentId,
            documentRequired: true,
            selected: true,
            notarization: 'Not Required',
          });
        });
    } else if ('requestId' in this.data) {
      const offerorDocument = {
        requestId: this.data.responseId,
        documentName: this.documentName,
        documentId: null,
      };

      this.requestService
        .SaveOfferorDocument(
          Number(this.data.requestId),
          offerorDocument,
          this.selectedFile
        )
        .subscribe((response) => {
          console.log('Document uploaded and saved successfully:', response);
          this.dialogRef.close({
            documentId: response.documentId,
            documentName: this.documentName,
            requestDocumentId: response.requestDocumentId,
          });
        });
    }
  }

  onNoClick(): void {
    this.dialogRef.close(false);
  }
}
