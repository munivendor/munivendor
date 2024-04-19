import { Component, OnInit } from '@angular/core';
import { RouterLink, RouterModule } from '@angular/router';
import {  FormGroup,FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { CommonModule } from '@angular/common';
 import { CountryService } from './request-type.service';
 import { DecisionMakerService } from './services/decisionmaker.service';

@Component({
    selector: 'request-basic',
    standalone: true,
    templateUrl: './request-basic.component.html',
    styleUrls: ['./request-basic.component.css'],
    imports: [ReactiveFormsModule, RouterModule, RouterLink, CommonModule]
})

export class BasicRequestComponent implements OnInit {
basicRequestForm!: FormGroup;
decisionMakers: any 
specificRequestTypes: any = ['Javatpoint.com', 'HDTuto.com', 'Tutorialandexample.com'];
requestTypes: any;
subcategories: any;

constructor (private fb: FormBuilder, private countryService: CountryService, private decisionMakerService: DecisionMakerService) {
  this.requestTypes = this.countryService.getCountries();
  this.decisionMakers;
}
ngOnInit() {
 
    this.basicRequestForm = this.fb.group ({ 
      
      requestType:['', [Validators.required]],
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
      term:'',
   
    })
  }
  onRequestTypeChange(event: Event) {
    const filterValue = (event.target as HTMLInputElement).value;
    this.subcategories=this.countryService.getStatesByCountry(filterValue);
   
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
