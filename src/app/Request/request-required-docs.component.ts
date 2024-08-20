import { Component, OnInit } from '@angular/core';
import { Router, RouterLink, RouterModule } from '@angular/router';
import {  FormGroup,FormBuilder, ReactiveFormsModule, Validators, FormArray } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { SingleFileUploadComponent } from "../single-file-upload/single-file-upload.component";
import { Category } from './model/category.model';
import { RequestService } from './services/request.service';
import { StateService } from './services/state.service';
import { DocumentType } from './model/documenttype.model';

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

constructor (private fb: FormBuilder, private requestService: RequestService, private stateService: StateService, private router: Router) { 
    this.requestDocumentsForm = this.fb.group ({ 
         requestDocumentItems: this.fb.array([])
    });
   
}

  ngOnInit(): void {
    this.requestService.GetRequiredDocuments(1).subscribe (
        (requestDocuments: DocumentType [])=>{
            this.requestDocuments= requestDocuments;
          //  this.addCheckboxes();
            });   
  }

  private addCheckboxes() {
     this.requestDocuments.forEach(() => this.itemArray.push(this.fb.control(false)));
  }

  get itemArray() {
    return this.requestDocumentsForm.controls['requestDocumentItems'] as FormArray;
  }

  onSubmit() {
    const selectedItems = this.requestDocumentsForm.value.requestDocumentItems
    .map((checked: boolean, i: number) => checked ? this.requestDocuments[i] : null)
    .filter((v: any) => v !== null);
  console.log(selectedItems);
    
  }
  
}
