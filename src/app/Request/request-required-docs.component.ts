import { Component, OnInit } from '@angular/core';
import { Router, RouterLink, RouterModule } from '@angular/router';
import {  FormGroup,FormBuilder, ReactiveFormsModule, Validators, FormArray, FormControl } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { MatDialog } from '@angular/material/dialog';

import { FileUploadDialogComponent } from '../file-upload-dialog/file-upload-dialog.component';
import { SingleFileUploadComponent } from "../single-file-upload/single-file-upload.component";

import { Category } from './model/category.model';
import { RequestService } from './services/request.service';
import { StateService } from './services/state.service';
import { DocumentType } from './model/documenttype.model';
import { Request } from './model/request.model';


@Component({
    selector: 'app-signup',
    standalone: true,
    templateUrl:'./request-required-docs.component.html',
    styleUrls: ['./request-required-docs.component.css'],
    imports: [ReactiveFormsModule, RouterModule, RouterLink, CommonModule, SingleFileUploadComponent]
})

export class RequestRequiredDocumentsComponent implements OnInit {
requestDocumentsForm!: FormGroup;
requestDocuments!: DocumentType[];  

constructor (private fb: FormBuilder, private requestService: RequestService, private stateService: StateService, private router: Router, public dialog: MatDialog) {}

  ngOnInit(): void {
    this.requestService.GetRequiredDocuments(1).subscribe (
        (requestDocuments: DocumentType [])=>{
            this.requestDocuments= requestDocuments;

            this.requestDocumentsForm = this.fb.group ({ 
              requestDocumentItems: this.fb.array(this.requestDocuments.map(() => new FormControl(false)))
            });
         });   
  }
  
  onSubmit() {
    const selectedItems = this.requestDocumentsForm.value.requestDocumentItems
    .map((checked: boolean, i: number) => checked ? this.requestDocuments[i] : null)
    .filter((v: any) => v !== null);

    var requestId= (this.stateService.getState() as Request).requestId;
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

  console.log(selectedItems);
  }

  openDialog(): void {
    const dialogRef = this.dialog.open(FileUploadDialogComponent, {
      width: '270px',
      height: 'auto'
    });

    dialogRef.afterClosed().subscribe(result => {
      console.log('The dialog was closed');
    });

  }
  

 /* private addCheckboxes() {
     this.requestDocuments.forEach(() => this.itemArray.push(this.fb.control(false)));
  }

  get itemArray() {
    return this.requestDocumentsForm.controls['requestDocumentItems'] as FormArray;
  }*/
  
}
