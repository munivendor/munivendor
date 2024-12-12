import { Component, OnInit, Output, EventEmitter, Input } from '@angular/core';
import { RouterModule } from '@angular/router';
import { FormGroup, ReactiveFormsModule, FormArray } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { MatDialog } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { FileUploadDialogComponent } from '../file-upload-dialog/file-upload-dialog.component';
import { RequestService } from './services/request.service';
import { Document } from './model/document.model';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { RequestDocument } from './model/requestdocument.model';

@Component({
  selector: 'request-required-documents',
  standalone: true,
  templateUrl: './request-required-docs.component.html',
  styleUrls: ['./request-required-docs.component.css'],
  imports: [
    ReactiveFormsModule,
    RouterModule,
    CommonModule,
    MatButtonModule,
    MatIconModule,
    MatCheckboxModule,
    MatProgressSpinnerModule]
})
export class RequestRequiredDocumentsComponent implements OnInit {
  @Input() parentDocumentsFormGroup!: FormGroup;
  @Output() documentsData = new EventEmitter<RequestDocument>();

  requestDocumentsForm!: FormGroup;
  optionalRequestDocuments: Document[] = [];
  municipalityRequestDocuments: Document[] = [];
  files: File[] = [];

  municipalityId = 1;
  municipalityDocuments: Document[] = [];
  documentId!: number;

  selectedOptionalStateDocs: Document[] = [];
  selectedMunicipalityDocs: Document[] = [];

  constructor(
    private requestService: RequestService,
    public dialog: MatDialog) { }

  ngOnInit(): void {}

  get requiredStateDocuments(): FormArray {
    return this.parentDocumentsFormGroup.get('requiredStateDocuments') as FormArray;
  }
  get optionalStateDocuments(): FormArray {
    return this.parentDocumentsFormGroup.get('optionalStateDocuments') as FormArray;
  }
  get optionalMunicipalityDocuments(): FormArray {
    return this.parentDocumentsFormGroup.get('optionalMunicipalityDocuments') as FormArray;
  }

  openFileUploadDialog(municipalityId: number): void {
    const dialogRef = this.dialog.open(FileUploadDialogComponent, {
      width: '400px',
      height: 'auto',
      data: { 
        municipalityId, 
        municipalityDocuments: this.optionalMunicipalityDocuments
      }
    });
    dialogRef.afterClosed().subscribe((response) => {
      if (response) {
        console.log('File uploaded successfully:', response);
      }
    });
  }

  onCheckboxChange(formArray: FormArray, idx: number, isChecked: boolean) {
    const documentControl = formArray.at(idx) as FormGroup;
    documentControl.patchValue({ selected: isChecked });
    this.emitDocuments();
  }

  emitDocuments(): void {
    const updatedRequiredStateDocuments = this.requiredStateDocuments.controls
      .filter((control) => control.value.selected)
      .map((control) => control.value);

    const updatedOptionalStateDocuments = this.optionalStateDocuments.controls
      .filter((control) => control.value.selected)
      .map((control) => control.value);

    const updatedOptionalMunicipalityDocuments = this.optionalMunicipalityDocuments.controls
      .filter((control) => control.value.selected)
      .map((control) => control.value);

    this.documentsData.emit({
      required: updatedRequiredStateDocuments,
      optional: updatedOptionalStateDocuments,
      municipality: updatedOptionalMunicipalityDocuments,
    });
  }
  
  deleteMunicipalityDocument(documentId: number): void {
    this.requestService.DeleteMunicipalityDocument(documentId).subscribe(
      () => {
        const formArray = this.optionalMunicipalityDocuments;
        const indexToDelete = formArray.controls.findIndex(
          (control) => control.get('documentId')?.value === documentId
        );
  
        if (indexToDelete > -1) {
          formArray.removeAt(indexToDelete);
          console.log(`Optional municipality document id ${documentId} deleted successfully`);
        }
      },
      (error) => {
        console.error('Error deleting optional municipality document:', error);
      }
    );
  }
  
  
}
