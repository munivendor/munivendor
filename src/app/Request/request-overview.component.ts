import { Component, OnInit } from '@angular/core';
import { RouterLink, RouterModule } from '@angular/router';
import {  FormGroup,FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { SingleFileUploadComponent } from "../single-file-upload/single-file-upload.component";

@Component({
    selector: 'app-signup',
    standalone: true,
    templateUrl:'./request-overview.component.html',
    styleUrls: ['./request-overview.component.css'],
    imports: [ReactiveFormsModule, RouterModule, RouterLink, CommonModule, SingleFileUploadComponent]
})

export class RequestOverviewComponent implements OnInit {
 
  overviewText: any;

  constructor() { }
  ngOnInit() { }

  isTextareaNotEmpty(): boolean {
    return this.overviewText.trim().length > 0;
  }

}
