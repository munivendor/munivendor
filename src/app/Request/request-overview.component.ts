import { Component, OnInit } from '@angular/core';
import { RouterLink, RouterModule } from '@angular/router';
import {  FormGroup,FormBuilder, ReactiveFormsModule, Validators, FormArray, FormControl } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';

import { SingleFileUploadComponent } from "../single-file-upload/single-file-upload.component";
//import { RequestOverview } from './RequestOverview';
import { RequestService } from './services/request.service';
import { of } from 'rxjs';

@Component({
    selector: 'request-overview',
    standalone: true,
    templateUrl: './request-overview.component.html',
    styleUrls: ['./request-overview.component.css'],
    imports: [ReactiveFormsModule, RouterModule, RouterLink, CommonModule, SingleFileUploadComponent]
})

export class RequestOverviewComponent implements OnInit {
requestOverviewForm!: FormGroup;
decisionMakers: any = ['Javatpoint.com', 'HDTuto.com', 'Tutorialandexample.com'];
requestTypes =['Javatpoint.com', 'HDTuto.com', 'Tutorialandexample.com'];
subcategories = [{ id: 1, name: 'test1' },{ id: 2, name: 'test2' },{ id: 3, name: 'test13' }];
specificRequestTypes: any = ['Javatpoint.com', 'HDTuto.com', 'Tutorialandexample.com'];
cities = ["Mohali", "Chandigarih", "ludhiana", "amritsar"]

//requestOverview!: RequestOverview;
constructor (private fb: FormBuilder,  private route: ActivatedRoute, private requestService: RequestService ) {}
  ngOnInit() {
    //this.cities=this.requestService.getRequestOverview (null).requiredDocuments;
    this.requestOverviewForm = this.fb.group ({ 
      cities: this.fb.array([false, "Chandigarih", "ludhiana", "amritsar"]),
      
      subcategory:[2, [Validators.required]],
      publishDate:['', [Validators.required]],
      publishTime:['', [Validators.required]],
      openDate:['', [Validators.required]],
      openTime:['', [Validators.required]],
      term:['', [Validators.required]],
      decisionMaker:['', [Validators.required]],
      specificRequestType:['', [Validators.required]],
      requestType:['', [Validators.required]],
   
      })
      
    }

     
   


  onSubmit() {
    // Handle form submission here
    if (this.requestOverviewForm.valid) {
      console.log(this.requestOverviewForm.value);
      // Additional logic to authenticate user or 
      // perform other actions
      this.requestOverviewForm.controls["email"].value
    }
  }
  
}
