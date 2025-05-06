import { FormBuilder, FormsModule } from '@angular/forms';
import { Component, Inject, ChangeDetectorRef } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { Document } from '../Request/model/document.model';
import { RequestService } from '../Request/services/request.service';
import { MatDialogActions, MatDialogContent, MatDialogRef, MatDialogTitle, MAT_DIALOG_DATA } from '@angular/material/dialog';
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
    MatDialogActions
  ],

})
export class FileUploadDialogComponent {
  selectedFile!: File;
  documentName: string = '';
  municipalityDocuments: Document[] = [];

  constructor(
    private fb: FormBuilder,
    private requestService: RequestService,
    private cdr: ChangeDetectorRef,
    public dialogRef: MatDialogRef<FileUploadDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { municipalityId: number; municipalityDocuments: any }
  ) { }

  onFileSelected(event: any): void {
    this.selectedFile = event.target.files[0];
  }

  onUpload(municipalityId: number): void {
    if (!this.selectedFile || !this.documentName) {
      console.error('File or document name is missing');
      return;
    }

    // save file name into database not only document name
    const municipalityDocument = {
      municipalityId: this.data.municipalityId,
      documentName: this.documentName,
      documentId: null,
    };

    this.requestService.SaveMunicipalityDocument(municipalityId, municipalityDocument, this.selectedFile).subscribe(
      (response) => {
        console.log('Document saved successfully:', response);
        this.data.municipalityDocuments.push(
          this.fb.group({
            documentId: [response.documentId],
            documentName: [municipalityDocument.documentName],
            documentRequired: [true],
            selected: [true]
          })

        );
        this.cdr.detectChanges();
        this.dialogRef.close(response.isSuccess);
        this.dialogRef.close(response.documentId);
      },
      (error) => {
        console.error('Error uploading and saving document', error);
      }
    );
  }

  onNoClick(): void {
    this.dialogRef.close(false);
  }
}

