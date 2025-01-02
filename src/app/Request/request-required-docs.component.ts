import { Component, OnInit, Output, EventEmitter, Input } from '@angular/core';
import { RouterModule } from '@angular/router';
import { FormGroup, ReactiveFormsModule, FormArray, FormBuilder } from '@angular/forms';
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
import { forkJoin, Observable, tap } from 'rxjs';


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

  requestDocumentsFormGroup!: FormGroup;
  optionalRequestDocuments: Document[] = [];
  municipalityRequestDocuments: Document[] = [];
  files: File[] = [];

  municipalityId = 1;
  municipalityDocuments: Document[] = [];
  documentId!: number;

  selectedOptionalStateDocs: Document[] = [];
  selectedMunicipalityDocs: Document[] = [];
  requestId: any;

  constructor(
private fb: FormBuilder, 
    private requestService: RequestService,
    public dialog: MatDialog) { }

    

  ngOnInit(): void {
    this.initializeRequestDocuments();
  }

  get requiredStateDocuments(): FormArray {
    return this.parentDocumentsFormGroup.get('requiredStateDocuments') as FormArray;
  }
  get optionalStateDocuments(): FormArray {
    return this.parentDocumentsFormGroup.get('optionalStateDocuments') as FormArray;
  }
  get optionalMunicipalityDocuments(): FormArray {
    return this.parentDocumentsFormGroup.get('optionalMunicipalityDocuments') as FormArray;
  }

  initializeRequestDocuments(): void {
    this.requestDocumentsFormGroup = this.fb.group({
      requiredStateDocuments: this.fb.array([]),
      optionalStateDocuments: this.fb.array([]),
      optionalMunicipalityDocuments: this.fb.array([]),
    });
    
    if (!this.requestId) {
      this.getAllDocumentTypes(this.municipalityId).subscribe({
        next: () => {
          console.log('Documents fetched and form initialized for creation.');
        },
        error: (error) => {
          console.error('Error fetching documents for creation:', error);
        },
      });
    } else {
      forkJoin({
        allDocuments: this.getAllDocumentTypes(this.municipalityId, this.requestId),
        requestDocuments: this.requestService.GetRequestRequiredDocumentsById(this.requestId),
      }).subscribe({
        next: ({ allDocuments, requestDocuments }) => {
          this.populateRequestDocuments(requestDocuments);
          this.mergeUnselectedDocuments(allDocuments);
          console.log('Documents fetched and form arrays initialized for editing.');
        },
        error: (error) => {
          console.error('Error fetching documents for editing:', error);
        },
      });
    }
  }

  populateRequestDocuments(requestDocuments: RequestDocument[]): void {
    requestDocuments.forEach((document: any) => {
      const documentFormGroup = this.fb.group({
        documentId: [document.documentId],
        documentName: [document.documentName],
        derived: [document.derived],
        documentRequired: [document.documentRequired],
        required: [document.required],
        selected: [document.selected],
      });
      if (document.derived) {
        this.optionalMunicipalityDocuments.push(documentFormGroup);
      } else if (document.required) {
        this.requiredStateDocuments.push(documentFormGroup);
      } else {
        this.optionalStateDocuments.push(documentFormGroup);
      }
    });
  }

  mergeUnselectedDocuments(allDocuments: any): void {
    const { requiredStateDocuments, optionalStateDocuments, optionalMunicipalityDocuments } = allDocuments;
    // filter and merge the two data responses based on two criterias:
    // display documents if selected are false from from getAllDocumentTypes
    // but do not display duplicates if getAllDocumentTypes has same documentId as getDocumentsByRequestId
    const filterUnselected = (documents: any[]) =>
      documents.filter((doc) => !this.isDocumentSelected(doc.documentId));
    this.populateFormArray(this.requiredStateDocuments, filterUnselected(requiredStateDocuments));
    this.populateFormArray(this.optionalStateDocuments, filterUnselected(optionalStateDocuments));
    this.populateFormArray(this.optionalMunicipalityDocuments, filterUnselected(optionalMunicipalityDocuments));
  }
  isDocumentSelected(documentId: number): boolean {
    return (
      this.requiredStateDocuments.value.some((doc: any) => doc.documentId === documentId) ||
      this.optionalStateDocuments.value.some((doc: any) => doc.documentId === documentId) ||
      this.optionalMunicipalityDocuments.value.some((doc: any) => doc.documentId === documentId)
    );
  }

  populateFormArray(formArray: FormArray, documents: any[]): void {
    documents.forEach((document) => {
      formArray.push(
        this.fb.group({
          documentId: [document.documentId],
          documentName: [document.documentName],
          documentRequired: [document.documentRequired],
          selected: [document.selected]
        })
      );
    });
  }
  getAllDocumentTypes(municipalityId: number, requestId?: number): Observable<any> {
    if (!requestId) {
      return forkJoin({
        requiredStateDocuments: this.requestService.GetRequiredDocuments(),
        optionalStateDocuments: this.requestService.GetOptionalDocuments(),
        optionalMunicipalityDocuments: this.requestService.GetMunicipalityDocuments(municipalityId),
      }).pipe(
        tap(({ requiredStateDocuments, optionalStateDocuments, optionalMunicipalityDocuments }) => {
          this.populateFormArray(this.requiredStateDocuments, requiredStateDocuments);
          this.populateFormArray(this.optionalStateDocuments, optionalStateDocuments);
          this.populateFormArray(this.optionalMunicipalityDocuments, optionalMunicipalityDocuments);
        })
      );
    } else {
      return forkJoin({
        requiredStateDocuments: this.requestService.GetRequiredDocuments(),
        optionalStateDocuments: this.requestService.GetOptionalDocuments(),
        optionalMunicipalityDocuments: this.requestService.GetMunicipalityDocuments(municipalityId),
      });
    }
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

  saveDocuments(requestId: number) {
    /*const documentIds: number[] = [
      ...this.requiredStateDocuments,
      ...this.optionalStateDocuments,
      ...this.municipalityDocuments
    ].map(documentId => documentId.documentId);

    this.requestService.SaveRequestDocuments(requestId, documentIds)
      .subscribe(response => {
        console.log('Documents saved successfully:', response);
      }, error => {
        console.error('Error saving documents:', error);
      });*/ // ML - Commented out so branch can be merged
  }
}
