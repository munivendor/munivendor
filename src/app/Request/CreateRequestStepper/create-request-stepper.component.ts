import {Component} from '@angular/core';
import {FormBuilder, Validators, FormsModule, ReactiveFormsModule, FormGroup, FormControl} from '@angular/forms';
import {MatInputModule} from '@angular/material/input';
import {MatFormFieldModule} from '@angular/material/form-field';
import {MatStepperModule} from '@angular/material/stepper';
import {MatButtonModule} from '@angular/material/button';

import { BasicRequestComponent } from '../request-basic.component';
import { RequestOverviewComponent } from '../request-overview.component';
import { RequestRequiredDocumentsComponent } from '../request-required-docs.component';
import { RequestReviewComponent } from '../request-review.component';
import { RequestService } from '../services/request.service';

@Component({
  selector: 'create-request-stepper',
  templateUrl: 'create-request-stepper.component.html',
  standalone: true,
  imports: [
    MatButtonModule,
    MatStepperModule,
    FormsModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    BasicRequestComponent,
    RequestOverviewComponent,
    RequestRequiredDocumentsComponent,
    RequestReviewComponent
  ],
})

// comments are WIP for when validation is required before users
// are able to move onto the next step
// can save data for each step
// submit the final request data to database
export class CreateRequestStepper {

  basics!: FormGroup;
  proposalsOverview!: FormGroup;

  basicsFormGroup = this._formBuilder.group({
    // basics: ['', Validators.required],
  });
  proposalsOverviewFormGroup = this._formBuilder.group({
    // proposalsOverview: ['', Validators.required],
  });
  requestDocumentsFormGroup = this._formBuilder.group({
    // requestDocuments: ['', Validators.required],
  });
  finalReviewFormGroup = this._formBuilder.group({
    // finalReview: ['', Validators.required],
  });

  constructor(private _formBuilder: FormBuilder, private requestService: RequestService) {}

  ngOnInit() {
    // Initialize form groups with FormControl
    this.basics = this._formBuilder.group({
      // field1: new FormControl(this.requestService.getRequestData('step1')?.field1 || '')
    });
    this.proposalsOverview = this._formBuilder.group({
      // field2: new FormControl(this.requestService.getRequestData('step2')?.field2 || '')
    });
  }

  saveStep1() {
    // Save data from step 1
    // this.requestService.setRequestData('step1', this.formGroup1.value);
  }

  saveStep2() {
    // Save data from step 2
    // this.requestService.setRequestData('step2', this.proposalsOverview.value);
  }

  handleFormUpdate(updatedData: any) {
    // Update the relevant form group when child component emits the update
    if (updatedData.step1) {
      this.basics.patchValue(updatedData.step1);
    }
    if (updatedData.step2) {
      this.proposalsOverview.patchValue(updatedData.step2);
    }
  }

  submit() {
    // Do the final submission and clear the form data if needed
    // console.log('Request Data:', {
      // step1: this.requestService.getRequestData('step1'),
      // step2: this.requestService.getRequestData('step2')
    // });
    // this.requestService.clearRequestData();  // Clear if needed after submission
  }
}
