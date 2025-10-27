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
import { AuthService } from '../authorization/auth.service';

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
    private authService: AuthService,
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
            console.log('Document uploaded and saved successfully:', response);
            this.dialogRef.close({
              documentId: response.documentId,
              documentName: municipalityDocument.documentName,
              organizationDocumentId: response.organizationDocumentId,
              documentRequired: true,
              selected: true,
              notarization: 'Not Required',
            });
          },
          error: (error) => {
            console.error('Error uploading document:', error);

            // Extract correlationId
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
              }
            );
            if (error.status !== 401 && this.authService.authState.value) {
              this._snackBar.open(
                `Failed to upload document. (Correlation ID: ${correlationId}). If you need MuniVendor technical support, please feel free to email vendorsupport@munivenor.com, or call us Monday through Friday, 9am until 5pm EST at (732) 354-1215. In your email, please make sure to include either a screenshot of the error, or the specific Correlation ID code in this error message.`,
                'Close',
                { verticalPosition: 'top', duration: 15000 }
              );
            }
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
            console.log('Document uploaded and saved successfully:', response);
            this.dialogRef.close({
              documentId: response.documentId,
              documentName: this.documentName,
              requestDocumentId: response.requestDocumentId,
            });
          },
          error: (error) => {
            console.error('Error uploading document:', error);

            // Extract correlationId
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
              }
            );
            if (error.status !== 401 && this.authService.authState.value) {
              this._snackBar.open(
                `Failed to upload document. (Correlation ID: ${correlationId}). If you need MuniVendor technical support, please feel free to email vendorsupport@munivenor.com, or call us Monday through Friday, 9am until 5pm EST at (732) 354-1215. In your email, please make sure to include either a screenshot of the error, or the specific Correlation ID code in this error message.`,
                'Close',
                { verticalPosition: 'top', duration: 15000 }
              );
            }
          },
        });
    }
  }

  onNoClick(): void {
    this.dialogRef.close(false);
  }
}
