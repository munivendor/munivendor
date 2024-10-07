import { Component, OnInit } from '@angular/core';
import { Router, RouterLink, RouterModule } from '@angular/router';
import { FormGroup,FormBuilder, ReactiveFormsModule, Validators, FormArray, FormControl } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { MatDialog } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule} from '@angular/material/icon';

import { FileUploadDialogComponent } from '../file-upload-dialog/file-upload-dialog.component';

import { RequestService } from './services/request.service';
import { StateService } from './services/state.service';
import { DocumentType } from './model/documenttype.model';
import { Request } from './model/request.model';


@Component({
    selector: 'request-required-documents',
    standalone: true,
    templateUrl:'./request-required-docs.component.html',
    styleUrls: ['./request-required-docs.component.css'],
    imports: [ReactiveFormsModule, RouterModule, RouterLink, CommonModule, MatButtonModule, MatIconModule]
})

export class RequestRequiredDocumentsComponent implements OnInit {
requestDocumentsForm!: FormGroup;
requiredRequestDocuments!: DocumentType[];  
optionalRequestDocuments: DocumentType[] = [];  
municipalityRequestDocuments: DocumentType[] = [];  
 
constructor (private fb: FormBuilder, 
            private requestService: RequestService,
            private stateService: StateService, 
            private router: Router, 
            public dialog: MatDialog) 
  {}

  ngOnInit(): void {

    this.requestDocumentsForm = this.fb.group ({ 
      requireRequestDocumentItems: this.fb.array([]),
      optionalRequestDocumentItems: this.fb.array([]),
      municipalityRequestDocumentItems: this.fb.array([])   
    });
    this.loadRequiredRequestDocuments(1);
    this.loadOptionalRequestDocuments(1);
    this. loadMunicipalityRequestDocuments(1)
  }
  
  loadRequiredRequestDocuments(requestId: number): void {
    this.requestService.GetRequiredDocuments(requestId).subscribe({
      next: (requestDocuments: DocumentType[]) => {
        this.requiredRequestDocuments = requestDocuments;
        this.populateRequiredRequestDocumentFormArray();
      },
      error: (error) => {
        console.error('Error fetching required documents:', error);
      },
      complete: () => {
        console.log('Required Document fetching completed');
      }
    });
  }

  loadOptionalRequestDocuments(requestId: number): void {
    this.requestService.GetOptionalDocuments(requestId).subscribe({
      next: (requestDocuments: DocumentType[]) => {
        this.optionalRequestDocuments = requestDocuments;
        this.populateOptionalRequestDocumentFormArray();
      },
      error: (error) => {
        console.error('Error fetching documents:', error);
      },
      complete: () => {
        console.log('Document fetching completed');
      }
    });
  }

  loadMunicipalityRequestDocuments(requestId: number): void {
    this.requestService.GetMunicipalityDocuments(requestId).subscribe({
      next: (requestDocuments: DocumentType[]) => {
        this.municipalityRequestDocuments = requestDocuments;
        this.populateMunicipalityRequestDocumentsFormArray();
      },
      error: (error) => {
        console.error('Error fetching documents:', error);
      },
      complete: () => {
        console.log('Document fetching completed');
      }
    });
  }

  populateRequiredRequestDocumentFormArray(): void {
    const formArray = this.requestDocumentsForm.get('requiredRequestDocumentItems') as FormArray;
    this.requiredRequestDocuments.forEach(() => {
      formArray.push(new FormControl(false));
    });
  }

  populateOptionalRequestDocumentFormArray(): void {
    const formArray = this.requestDocumentsForm.get('optionalRequestDocumentItems') as FormArray;
    this.optionalRequestDocuments.forEach(() => {
      formArray.push(new FormControl(false));
    });
  }

  populateMunicipalityRequestDocumentsFormArray(): void {
    const formArray = this.requestDocumentsForm.get('municipalityRequestDocumentItems') as FormArray;
    this.municipalityRequestDocuments.forEach(() => {
      formArray.push(new FormControl(false));
    });
  }


  onSubmit() {
    const selectedOptionalRequestDocumentItems = this.requestDocumentsForm.value.optionalRequestDocumentItems
    .map((checked: boolean, i: number) => checked ? this.optionalRequestDocuments[i] : null)
    .filter((v: any) => v !== null);

    //var requestId= (this.stateService.getState() as Request).requestId;
    this.saveSelectedStateRequestDocuments(selectedOptionalRequestDocumentItems);

  }

  saveSelectedStateRequestDocuments(selectedOptionalRequestDocumentItems: DocumentType[]) {
    var requestId = 100;
    this.requestService.SaveRequiredDocuments(requestId, selectedOptionalRequestDocumentItems).subscribe(
      (success: boolean) => {
        if (success) {
          console.log('Documents saved successfully');
        } else {
          console.log('Failed to save documents');
        }
      },
      (error) => {
        console.error('Error saving documents:', error);
      }
    );
  }
  /*------------------------------------------------------------------------------------*/
  openDialog(): void {
    const dialogRef = this.dialog.open(FileUploadDialogComponent, {
      width: '270px',
      height: 'auto'
    });

      dialogRef.afterClosed().subscribe(result => {
        if (result) {
          this.addNewMunicipalityRequestDocument(result);
        }
      });

  }

  addNewMunicipalityRequestDocument(newDocument: DocumentType): void {
    this.municipalityRequestDocuments.push(newDocument);
    const control = new FormControl(false);
    (this.requestDocumentsForm.get('additionalRequestDocumentItems') as FormArray).push(control);
  }

  onDeleteMunicipalityRequestDocument(index: number): void {
    const additionalDocumentId = this.municipalityRequestDocuments[index].documentTypeId;
    //const requestId = (this.stateService.getState() as Request).requestId;
    const requestId= 0;

    this.municipalityRequestDocuments.splice(index, 1);
    (this.requestDocumentsForm.get('municipalityRequestDocumentItems') as FormArray).removeAt(index);
    this.requestService.DeleteMunicipalityRequestDocument (requestId, additionalDocumentId).subscribe(
      response => {
          console.log('Delete successful', response);
      },
      error => {
          console.error('Delete failed', error);
      })
    }
}
