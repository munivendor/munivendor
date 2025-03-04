import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { RequestService } from '../Request/services/request.service';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import {Request}  from '../Request/model/request.model'

@Component({
  selector: 'app-vendor-info',
  templateUrl: './response-basic.component.html',
  styleUrls: ['./response-basic.component.css'],
  standalone: true, 
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatTooltipModule,
    MatInputModule,
    MatFormFieldModule,
    MatCardModule,
    MatIconModule,
  ],
  providers: [RequestService]
})
export class ResponseBasicComponent implements OnInit {
  request: Request | undefined
  responseForm: FormGroup;

  constructor(
    private requestService: RequestService,
    private route: ActivatedRoute,
    private fb: FormBuilder
  ) {
    this.responseForm = this.fb.group({
      responseName: ['', Validators.required],
    });
  }

  ngOnInit(): void {
      const requestId = this.route.snapshot.paramMap.get('id');
      if (requestId) {
        this.requestService.GetRequestDetailsById(+requestId).subscribe((request) => {
          this.request = request;

          this.requestService.GetRequestTypes().subscribe((requestTypes) => {
            const requestType = requestTypes.find((type) => type.requestTypeId === this.request?.requestTypeId);
            this.request!.requestType = {
              requestTypeId: requestType!.requestTypeId,
              requestTypeDesc: requestType!.requestTypeDesc,
            };
          });
        });
    }
  }

  onContinue(): void {
    if (this.responseForm.invalid) {
      return; 
    }
    const sourceRequestId = 1;
    const responseName = this.responseForm.value.responseName;
    const request: Request = {
      requestName: responseName, requestTypeId: 4, soureceRequestId: sourceRequestId};

    this.requestService.CreateRequest(request).subscribe(
      (response) => {
        console.log('Response saved successfully:', response);
         
      },
      (error) => {
        console.error('Error saving response:', error);
        // Handle error
      }
    );
  }

}

  


  