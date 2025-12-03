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
import { LoggingService } from '../exceptionhandling/logging.service';
import { StateService } from '../Request/services/state.service';
import { MatSnackBar } from '@angular/material/snack-bar';
import { LoadingService } from '../shared/LoadingSpinner/loading.service';

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
    private loggingService: LoggingService,
    private stateService: StateService,
    private _snackBar: MatSnackBar,
    private loadingService: LoadingService,
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
    const file = event.target.files[0];

    if (file) {
      const allowedTypes = ['application/pdf', 'image/jpeg', 'image/jpg'];
      const allowedExtensions = ['.pdf', '.jpg', '.jpeg'];
      const fileExtension = file.name
        .toLowerCase()
        .substring(file.name.lastIndexOf('.'));

      if (
        !allowedTypes.includes(file.type) &&
        !allowedExtensions.includes(fileExtension)
      ) {
        this._snackBar.open(
          'Invalid file type. Only PDF and JPG/JPEG files are allowed.',
          'Close',
          {
            duration: 5000,
            verticalPosition: 'top',
          }
        );

        event.target.value = '';
        return;
      }

      this.selectedFile = file;
    }
  }

  onUpload(): void {
    if (!this.selectedFile || !this.documentName) {
      console.error('File or document name is missing');
      return;
    }

    this.loadingService.show('Uploading...');

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
        .subscribe({
          next: (response) => {
            this.loadingService.hide();
            this.dialogRef.close({
              documentId: response.documentId,
              documentName: municipalityDocument.documentName,
              organizationDocumentId: response.organizationDocumentId,
              documentRequired: true,
              selected: true,
              notarization: 'Not Required',
            });

            this._snackBar.open('Document successfully uploaded.', 'Close', {
              duration: 5000,
              verticalPosition: 'top',
            });
          },
          error: (error) => {
            this.loadingService.hide();
            const correlationId = error?.error?.correlationId;

            this.loggingService.logException(
              new Error(`HTTP Error ${error.status}: ${error.statusText}`),
              3,
              {
                requestId: this.stateService.getRequestId(),
                organizationId: this.stateService.getOrganizationId(),
                documentName: this.documentName,
                correlationId: correlationId,
                methodName: 'onUpload',
                className: 'FileUploadDialogComponent',
                operation: 'SaveOrganizationDocument',
                userId: this.stateService.getUserId(),
                fileSize: this.selectedFile.size,
              }
            );
          },
        });
    } else if ('requestId' in this.data) {
      const offerorDocument = {
        requestId: this.data.responseId,
        documentName: this.documentName,
        documentId: null,
      };

      this.requestService
        // this is offeror/response requestID
        .SaveOfferorDocument(
          Number(this.data.requestId),
          offerorDocument,
          this.selectedFile
        )
        .subscribe({
          next: (response) => {
            this.loadingService.hide();
            this.dialogRef.close({
              documentId: response.documentId,
              documentName: this.documentName,
              requestDocumentId: response.requestDocumentId,
            });

            this._snackBar.open('Document successfully uploaded.', 'Close', {
              duration: 5000,
              verticalPosition: 'top',
            });
          },
          error: (error) => {
            this.loadingService.hide();
            const correlationId = error?.error?.correlationId;

            this.loggingService.logException(
              new Error(`HTTP Error ${error.status}: ${error.statusText}`),
              3,
              {
                requestId: this.stateService.getRequestId(),
                organizationId: this.stateService.getOrganizationId(),
                documentName: this.documentName,
                correlationId: correlationId,
                methodName: 'onUpload',
                className: 'FileUploadDialogComponent',
                operation: 'SaveOfferorDocument',
                userId: this.stateService.getUserId(),
                fileSize: this.selectedFile.size,
              }
            );
          },
        });
    }
  }

  onNoClick(): void {
    this.dialogRef.close(false);
  }
}
