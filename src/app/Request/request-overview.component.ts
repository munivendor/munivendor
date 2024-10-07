import { Component, OnInit } from '@angular/core';
import { RouterLink, RouterModule } from '@angular/router';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { SingleFileUploadComponent } from "../single-file-upload/single-file-upload.component";
import { StateService } from './services/state.service';
import { Request } from './model/request.model';

@Component({
    selector: 'request-overview',
    standalone: true,
    templateUrl:'./request-overview.component.html',
    styleUrls: ['./request-overview.component.css'],
    imports: [ReactiveFormsModule, RouterModule, RouterLink, CommonModule, SingleFileUploadComponent, FormsModule]
})

export class RequestOverviewComponent implements OnInit {
 
  overviewText: string = '';
  isFileUploaded: boolean = false;
  requestId: number | undefined;

  constructor(private state: StateService) { }
  ngOnInit() {
     
      var request = this.state.getState () as Request;   
      this.requestId= request.requestId;
   }

  isTextareaEmpty(): boolean {
    return this.overviewText.trim().length === 0;
  }

  onFileUploaded(isUploaded: boolean) {
    this.isFileUploaded = isUploaded;
  }

}
