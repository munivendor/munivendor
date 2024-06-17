import { Component, OnInit } from '@angular/core';
import { RouterLink, RouterModule } from '@angular/router';
import {  FormGroup,FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { CommonModule } from '@angular/common';
 import { RequestService } from './services/request.service';
import { Observable } from 'rxjs';
import { SubCategory } from './model/subcategory.model';

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
decisionMakers1: any;
decisionMakers2: any;
decisionMakers3: any;
decisionMakers4: any;
categories: any;
subcategories: Observable<SubCategory[]> | undefined;
requestTypes: any;
 
constructor (private fb: FormBuilder, private requestService: RequestService) {
  this.categories = this.requestService.getCategories();
  //this.subcategories//this.requestService.GetSubcategories();
  this.decisionMakers1 = this.requestService.GetDecisionMakers();
  this.requestTypes = this.requestService.GetRequestTypes();
  this.decisionMakers2 = this.decisionMakers1;
  this.decisionMakers3 = this.decisionMakers1;
  this.decisionMakers1= this.decisionMakers1;
}

ngOnInit(): void {
 
    this.basicRequestForm = this.fb.group ({ 
      
      category:['', [Validators.required]],
      subcategory:['', [Validators.required]],
      decisionMaker1:['', [Validators.required]],
      decisionMaker2:['', [Validators.required]],
      decisionMaker3:['', [Validators.required]],
      decisionMaker4:['', [Validators.required]],
      specificRequestType:['', [Validators.required]],
      lastname:['lastname (required)', [Validators.required, Validators.minLength(3)]],
      email:['email (required)', Validators.email],
      title:'',
      phoneNumber:'phone number (required)',
      publishDate:'',
      publishTime:'',
      openDate:'',
      openTime:'',
      contractStartDate:'',
      contractEndDate:''
    })
  }

  onCategoryChange(event: Event) {
    const categoryId = (event.target as HTMLInputElement).value;
    this.subcategories=this.requestService.GetSubcategories(parseInt(categoryId))
    /*.subscribe(response => {
     this.subcategories = response.});*/
    }

  onSubmit() {
    // Handle form submission here
    if (this.basicRequestForm.valid) {
      console.log(this.basicRequestForm.value);
      // Additional logic to authenticate user or 
      // perform other actions
      this.basicRequestForm.controls["email"].value
    }
  }
  
}
