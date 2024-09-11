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
    selector: 'app-signup',
    standalone: true,
    templateUrl:'./request-required-docs.component.html',
    styleUrls: ['./request-required-docs.component.css'],
    imports: [ReactiveFormsModule, RouterModule, RouterLink, CommonModule, MatButtonModule, MatIconModule]
})

export class RequestRequiredDocumentsComponent implements OnInit {
requestDocumentsForm!: FormGroup;
requestDocuments!: DocumentType[];  
additionalRequestDocuments!: DocumentType[];  

constructor (private fb: FormBuilder, 
            private requestService: RequestService,
            private stateService: StateService, 
            private router: Router, 
            public dialog: MatDialog) 
  {}

  ngOnInit(): void {

    this.requestDocumentsForm = this.fb.group ({ 
      requestDocumentItems: this.fb.array([]),
      additionalRequestDocumentItems: this.fb.array([])
    });

    this.requestService.GetRequiredDocuments(1).subscribe (
        (requestDocuments: DocumentType [])=>{
            this.requestDocuments= requestDocuments;
            this.requestDocuments.forEach(() => {
              (this.requestDocumentsForm.get('requestDocumentItems') as FormArray).push(new FormControl(false));
            });
         });   
  }
  
  onSubmit() {
    const selectedItems = this.requestDocumentsForm.value.requestDocumentItems
    .map((checked: boolean, i: number) => checked ? this.requestDocuments[i] : null)
    .filter((v: any) => v !== null);

    //var requestId= (this.stateService.getState() as Request).requestId;
    var requestId= 100;
    this.requestService.SaveRequiredDocuments(requestId, selectedItems).subscribe(
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
        this.addNewDocument(result);
      }
    });

  }

  addNewDocument(newDocument: DocumentType): void {
    this. additionalRequestDocuments.push(newDocument);
    const control = new FormControl(false);
    (this.requestDocumentsForm.get('additionalRequestDocumentItems') as FormArray).push(control);
  }
}
