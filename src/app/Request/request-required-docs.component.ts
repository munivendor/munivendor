import { Component, OnInit, Output, EventEmitter, Input } from '@angular/core';
import { RouterModule } from '@angular/router';
import { FormGroup, FormBuilder, ReactiveFormsModule, FormArray, FormControl } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { MatDialog } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCheckboxModule } from '@angular/material/checkbox';
// to be added as future update
// import { DragAndDropUploaderComponent } from './DragAndDrop/drag-and-drop.component';
import { FileUploadDialogComponent } from '../file-upload-dialog/file-upload-dialog.component';
import { RequestService } from './services/request.service';
import { Document } from './model/document.model';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { IRequestDocuments } from '../interfaces/IRequestDocuments';

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
    // DragAndDropUploaderComponent, 
    MatProgressSpinnerModule]
})
export class RequestRequiredDocumentsComponent implements OnInit {
  @Input() parentDocumentsFormGroup!: FormGroup;
  
  requestDocumentsForm!: FormGroup;
  requiredRequestDocuments!: Document[];
  optionalRequestDocuments: Document[] = [];
  municipalityRequestDocuments: Document[] = [];
  files: File[] = [];

  municipalityId = 1;
  requiredStateDocuments: Document[] = [];
  optionalStateDocuments: Document[] = [];
  municipalityDocuments: Document[] = [];
  documentId!: number;

  selectedOptionalStateDocs: Document[] = [];
  selectedMunicipalityDocs: Document[] = [];

  @Output() documentsUpdated = new EventEmitter<IRequestDocuments>();

  emitDocuments() {
    this.documentsUpdated.emit({
      required: this.requiredStateDocuments,
      optional: this.selectedOptionalStateDocs,
      municipality: this.municipalityDocuments
    });
  }

  constructor(private fb: FormBuilder,
    private requestService: RequestService,
    public dialog: MatDialog) { }

  ngOnInit(): void {

    this.requestDocumentsForm = this.fb.group({
      requireRequestDocumentItems: this.fb.array([]),
      optionalRequestDocumentItems: this.fb.array([]),
      municipalityRequestDocumentItems: this.fb.array([]),
      requiredStateDocuments: this.fb.array([]),
      optionalStateDocuments: this.fb.array([]),
      municipalityDocuments: this.fb.array([])
    });

      this.getRequiredDocuments();
      this.getOptionalDocuments();
      this.getMunicipalityDocuments(this.municipalityId)
  }

  getRequiredDocuments(): void {
    this.requestService.GetRequiredDocuments().subscribe({
      next: (requiredStateDocumentsArr: any[]) => {
        this.requiredStateDocuments = requiredStateDocumentsArr;
      },
      error: (error) => {
        console.error('Error fetching required documents:', error);
      },
      complete: () => {
        console.log('Required document fetching completed');
      }
    })

  }

  getOptionalDocuments(): void {
    this.requestService.GetOptionalDocuments().subscribe({
      next: (optionalStateDocumentsArr: any[]) => {
        this.optionalStateDocuments = optionalStateDocumentsArr;
      },
      error: (error) => {
        console.error('Error fetching optional documents:', error);
      },
      complete: () => {
        console.log('Optional document fetching completed');
      }
    })
  }

  getMunicipalityDocuments(municipalityId: number): void {
    this.requestService.GetMunicipalityDocuments(municipalityId).subscribe({
      next: (municipalityDocumentsArr: any[]) => {
        this.municipalityDocuments = municipalityDocumentsArr;
      },
      error: (error) => {
        console.error('Error fetching municipality documents:', error);
      },
      complete: () => {
        console.log('Municipality document fetching completed');
        this.selectedMunicipalityDocs = this.municipalityDocuments;
      }
    })
  }

  openFileUploadDialog(municipalityId: number): void {
    const dialogRef = this.dialog.open(FileUploadDialogComponent, {
      width: '400px',
      height: 'auto',
      data: { municipalityId,  municipalityDocuments: this.municipalityDocuments }
    });

  dialogRef.afterClosed().subscribe((documentId) => {
    if (documentId) {
      this.documentId = documentId
    }
  });
  }


  onOptionalStateDocsCheckboxChange(idx: number, event: any) {
    const isChecked = event.checked;

    // box just checked and needs to be added to list of selected
    if (isChecked) {
      const toBeAddedDoc = this.optionalStateDocuments[idx];
      if (toBeAddedDoc != null && this.selectedOptionalStateDocs.every(sd => sd.documentId !== toBeAddedDoc.documentId)) {
        this.selectedOptionalStateDocs.push(toBeAddedDoc);
      }
    }
    // box just unchecked and needs to be removed from list of selected 
    else {
      const toBeRemovedDoc = this.optionalStateDocuments[idx];
      if (toBeRemovedDoc != null) {
        const idxToRemove = this.selectedOptionalStateDocs.findIndex(sd => sd.documentId === toBeRemovedDoc.documentId);
        if (idxToRemove > -1) {
          this.selectedOptionalStateDocs.splice(idxToRemove, 1);
        }
      }
    }

    this.emitDocuments();
  }

  
  addNewMunicipalityRequestDocument(newDocument: Document): void {
    this.municipalityRequestDocuments.push(newDocument);
    const control = new FormControl(false);
    (this.requestDocumentsForm.get('additionalRequestDocumentItems') as FormArray).push(control);
  }

  deleteMunicipalityDocument(documentId: number): void {
    this.requestService.DeleteMunicipalityDocument(documentId).subscribe(
      () => {
        this.municipalityDocuments = this.municipalityDocuments.filter(
          document => document.documentId !== documentId
        );
        console.log('Document deleted successfully');
        const toBeDeletedIdx = this.selectedMunicipalityDocs.findIndex(d => d.documentId === documentId);
        if (toBeDeletedIdx > -1) {
          this.selectedMunicipalityDocs.splice(toBeDeletedIdx, 1);
        }
      },
      error => {
        console.error('Error deleting document:', error);
      }
    );
  }
}
