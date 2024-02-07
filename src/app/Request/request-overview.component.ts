import { Component, OnInit } from '@angular/core';
import { RouterLink, RouterModule } from '@angular/router';
import {  FormGroup,FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';

import { SingleFileUploadComponent } from "../single-file-upload/single-file-upload.component";
import { RequestOverview } from './RequestOverview';
import { RequestService } from './request.service';
import { request } from 'http';

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
requestTypes: any = ['Javatpoint.com', 'HDTuto.com', 'Tutorialandexample.com'];
subcategories: any = ['Javatpoint.com', 'HDTuto.com', 'Tutorialandexample.com'];
specificRequestTypes: any = ['Javatpoint.com', 'HDTuto.com', 'Tutorialandexample.com'];
  
  requestOverview!: RequestOverview;
constructor (private fb: FormBuilder,  private route: ActivatedRoute, private requestService: RequestService ) {
  
  }
  ngOnInit() {
    this.requestOverview=this.requestService.getRequestOverview(2);
    this.requestOverviewForm = this.fb.group ({ 
      
      requestType:['', [Validators.required]],
      lastname:['lastname (required)', [Validators.required, Validators.minLength(3)]],
      email:['email (required)', Validators.email],
      title:'',
      phoneNumber:'phone number (required)',
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
