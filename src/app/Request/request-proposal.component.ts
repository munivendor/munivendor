import { Component, OnInit } from '@angular/core';
import { RouterLink, RouterModule } from '@angular/router';
import {  FormGroup,FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { SingleFileUploadComponent } from "../single-file-upload/single-file-upload.component";

@Component({
    selector: 'app-signup',
    standalone: true,
    templateUrl: './request-proposal.component.html',
    styleUrls: ['./request-proposal.component.css'],
    imports: [ReactiveFormsModule, RouterModule, RouterLink, CommonModule, SingleFileUploadComponent]
})

export class RequestProposalComponent implements OnInit {
newRequestForm!: FormGroup;
decisionMakers: any = ['Javatpoint.com', 'HDTuto.com', 'Tutorialandexample.com'];
requestTypes: any = ['Javatpoint.com', 'HDTuto.com', 'Tutorialandexample.com'];
subcategories: any = ['Javatpoint.com', 'HDTuto.com', 'Tutorialandexample.com'];
specificRequestTypes: any = ['Javatpoint.com', 'HDTuto.com', 'Tutorialandexample.com'];
constructor (private fb: FormBuilder) {}
ngOnInit() {
    this.newRequestForm = this.fb.group ({ 
      
      requestType:['', [Validators.required]],
      lastname:['lastname (required)', [Validators.required, Validators.minLength(3)]],
      email:['email (required)', Validators.email],
      title:'',
      phoneNumber:'phone number (required)',
    })
  }

  onSubmit() {
    // Handle form submission here
    if (this.newRequestForm.valid) {
      console.log(this.newRequestForm.value);
      // Additional logic to authenticate user or 
      // perform other actions
      this.newRequestForm.controls["email"].value
    }
  }
  
}
