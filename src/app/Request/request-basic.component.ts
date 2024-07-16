import { Component, OnInit } from '@angular/core';
import { RouterLink, RouterModule } from '@angular/router';
import {  FormGroup,FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { CommonModule } from '@angular/common';
 import { RequestService } from './services/request.service';
import { Observable } from 'rxjs';
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
decisionMakers1!: DecisionMaker [];
decisionMakers2!: DecisionMaker [];
decisionMakers3!: DecisionMaker [];
decisionMakers4!: DecisionMaker [];
categories!: Category[];
subcategories: SubCategory[] | undefined;
requestTypes: RequestType[] | undefined;
 
constructor (private fb: FormBuilder, private requestService: RequestService) {
  this.requestService.getCategories().subscribe ((categories: Category [])=>this.categories = categories);
  //this.subcategories//this.requestService.GetSubcategories();
   this.requestService.GetDecisionMakers().subscribe ((decisionmakers: DecisionMaker [])=>this.decisionMakers1 = decisionmakers);;
   this.requestService.GetDecisionMakers().subscribe ((decisionmakers: DecisionMaker [])=>this.decisionMakers2 = decisionmakers);;
 this.requestService.GetDecisionMakers().subscribe ((decisionmakers: DecisionMaker [])=>this.decisionMakers3 = decisionmakers);;
   this.requestService.GetDecisionMakers().subscribe ((decisionmakers: DecisionMaker [])=>this.decisionMakers4 = decisionmakers);
   this.requestService.GetRequestTypes().subscribe ((requestTypes: RequestType [])=>this.requestTypes= requestTypes);
}

ngOnInit(): void {
 
    this.basicRequestForm = this.fb.group ({ 
      
      category:['', [Validators.required]],
      subcategory:['', [Validators.required]],
      requestType:['', [Validators.required]],
      decisionMaker1:['', [Validators.required]],
      decisionMaker2:['', [Validators.required]],
      decisionMaker3:['', [Validators.required]],
      decisionMaker4:['', [Validators.required]],
      publishDate:'',
      publishTime:'',
      openDate:'',
      openTime:'',
      contractStartDate:'',
      contractEndDate:''
    })
  }

  onCategoryChange(event: Event) {
    const categoryIdString = (event.target as HTMLInputElement).value;
    const categoryId = parseInt (categoryIdString);
    this.requestService.GetSubcategories(categoryId).subscribe ((subcategories: SubCategory [])=>this.subcategories = subcategories);
    /*.subscribe(response => {
     this.subcategories = response.});*/
    }

  onSubmit() {
    // Handle form submission here
    if (this.basicRequestForm.valid) {
      console.log(this.basicRequestForm.value);
      // Additional logic to authenticate user or 
      // perform other actions
      ;
      let request = new Request();
      let requestResponse1 = new Request ();
       
      this.requestService.CreateRequest(request).subscribe ((requestResponse: Request)=>requestResponse1 = requestResponse)
    }
  }
  
}
