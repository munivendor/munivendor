import { Component, OnInit } from '@angular/core';
import { RouterLink, RouterModule } from '@angular/router';
import { FormGroup, FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { MatCheckbox } from '@angular/material/checkbox';
import { MatFormField } from '@angular/material/form-field';
import { MatLabel } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';

import { SingleFileUploadComponent } from "../single-file-upload/single-file-upload.component";
import { RequestService } from './services/request.service';

@Component({
  selector: 'request-review',
  standalone: true,
  templateUrl: './request-review.component.html',
  styleUrls: ['./request-review.component.css'],
  imports: [ReactiveFormsModule, RouterModule, RouterLink, CommonModule, SingleFileUploadComponent, MatCheckbox, MatFormField, MatLabel, MatInputModule]
})

export class RequestReviewComponent implements OnInit {
  requestFinalReviewDetailsForm!: FormGroup;

  // data should come from state service instead of API calls
  requestFinalReviewDetails = {
    category: "Technology",
    requestType: "Request for Information",
    subcategory: "IT",
    requestName: "Example Name",
    publishDate: "10/27/2024",
    publishTime: "11:00AM",
    openDate: "11/27/2024",
    openTime: "11:00AM",
    contractStart: "01/01/2025",
    contractEnd: "12/31/2025",
    decisionMakers: [
      { name: "Chris" },
      { name: "Josh" },
      { name: "Eli" }
    ],
    requiredDocuments: ["Document 1", "Document 2", "Document 3", "Document 4"]
  }

  constructor(private fb: FormBuilder, private route: ActivatedRoute, private requestService: RequestService) { }
  ngOnInit() {
  }


  onSubmit() {
    // Handle form submission here
    if (this.requestFinalReviewDetailsForm.valid) {
      console.log(this.requestFinalReviewDetailsForm.value);
      this.requestFinalReviewDetailsForm.controls["email"].value
    }
  }

}
