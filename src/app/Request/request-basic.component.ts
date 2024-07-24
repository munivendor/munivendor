import { Component, OnInit } from '@angular/core';
import { RouterLink, RouterModule } from '@angular/router';
import {  FormGroup,FormBuilder, FormArray, ReactiveFormsModule, Validators, FormControlName, FormControl, AbstractControl, ValidatorFn } from '@angular/forms';
import { CommonModule } from '@angular/common';


 import { RequestService } from './services/request.service';

import { SubCategory } from './model/subcategory.model';
import { Category } from './model/category.model';
import { DecisionMaker } from './model/decisionmaker.model';
import { RequestType } from './model/requesttype.model';
import {  Request } from './model/request.model';

@Component({
    selector: 'request-basic',
    standalone: true,
    templateUrl: './request-basic.component.html',
    styleUrls: ['./request-basic.component.css'],
    imports: [ReactiveFormsModule, RouterModule, RouterLink, CommonModule]
})

export class BasicRequestComponent implements OnInit {
  [x: string]: any;
basicRequestForm!: FormGroup;
decisionMakers!: DecisionMaker [];
decisionMakers2!: DecisionMaker [];
decisionMakers3!: DecisionMaker [];
decisionMakers4!: DecisionMaker [];
categories!: Category[];
subcategories: SubCategory[] | undefined;
requestTypes: RequestType[] | undefined;
 
constructor (private fb: FormBuilder, private requestService: RequestService) {
  this.requestService.getCategories().subscribe ((categories: Category [])=>this.categories = categories);
   this.requestService.GetDecisionMakers().subscribe ((decisionmakers: DecisionMaker [])=>this.decisionMakers = decisionmakers);;
   this.requestService.GetDecisionMakers().subscribe ((decisionmakers: DecisionMaker [])=>this.decisionMakers2 = decisionmakers);;
 this.requestService.GetDecisionMakers().subscribe ((decisionmakers: DecisionMaker [])=>this.decisionMakers3 = decisionmakers);;
   this.requestService.GetDecisionMakers().subscribe ((decisionmakers: DecisionMaker [])=>this.decisionMakers4 = decisionmakers);
   this.requestService.GetRequestTypes().subscribe ((requestTypes: RequestType [])=>this.requestTypes= requestTypes);
}

ngOnInit(): void {
 
    this.basicRequestForm = this.fb.group ({ 
      dropdowns: this.fb.array([]), // FormArray for dynamic dropdowns
      category:['', [Validators.required]],
      subcategory:['', [Validators.required]],
      requestType:['', [Validators.required]],
      publishDate:['', [Validators.required]],
      publishTime:['', [Validators.required]],
      openDate:['', [Validators.required]],
      openTime:['', [Validators.required]],
      contractStartDate:['', [Validators.required]],
      contractEndDate:['', [Validators.required]]
    })
  }

  onCategoryChange(event: Event) {
    const categoryIdString = (event.target as HTMLInputElement).value;
    const categoryId = parseInt (categoryIdString);
    this.requestService.GetSubcategories(categoryId).subscribe ((subcategories: SubCategory [])=>this.subcategories = subcategories);
    }

  addDropdown() {
    const dropdown = this.fb.control('',Validators.required );
   
    this.dropdowns.push(dropdown);
  }
  
  get dropdowns() {
    return this.basicRequestForm.get('dropdowns') as FormArray;
  }

  onSubmit() {
    
    if (this.basicRequestForm.valid) {
      console.log(this.basicRequestForm.value);
     
      let request = new Request();
      let requestResponse1 = new Request ();

      request.categoryId=this.basicRequestForm.controls["category"].value;
      request.subcategoryId=this.basicRequestForm.controls["subcategory"].value;
      request.requestTypeId=this.basicRequestForm.controls["requestType"].value;
      request.publishDate=  new Date(this.basicRequestForm.controls["publishDate"].value + ' ' + this.basicRequestForm.controls["publishTime"].value);
      request.openDate= new Date(this.basicRequestForm.controls["openDate"].value + ' ' + this.basicRequestForm.controls["openTime"].value);
      request.contractStart= new Date(this.basicRequestForm.controls["contractStartDate"].value);
      request.contractEnd= new Date (this.basicRequestForm.controls["contractEndDate"].value);
        
      request.decisionMakerSelections = this.dropdowns.controls.map((control, index) => ({
      decisionMakerNumber: index + 1,
      decisionMakerId: control.value
    }));
    
      this.requestService.CreateRequest(request).subscribe ((requestResponse: Request)=>requestResponse1 = requestResponse)

    }
  }
  
}