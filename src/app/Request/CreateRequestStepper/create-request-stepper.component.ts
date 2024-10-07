import {Component} from '@angular/core';
import {FormBuilder, Validators, FormsModule, ReactiveFormsModule} from '@angular/forms';
import {MatInputModule} from '@angular/material/input';
import {MatFormFieldModule} from '@angular/material/form-field';
import {MatStepperModule} from '@angular/material/stepper';
import {MatButtonModule} from '@angular/material/button';

import { BasicRequestComponent } from '../request-basic.component';
import { RequestOverviewComponent } from '../request-overview.component';
import { RequestRequiredDocumentsComponent } from '../request-required-docs.component';
import { RequestReviewComponent } from '../request-review.component';

@Component({
  selector: 'create-request-stepper',
  templateUrl: 'create-request-stepper.component.html',
  styleUrl: 'create-request-stepper.component.css',
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
export class CreateRequestStepper {
  firstFormGroup = this._formBuilder.group({
    // firstCtrl: ['', Validators.required],
  });
  secondFormGroup = this._formBuilder.group({
    // secondCtrl: ['', Validators.required],
  });
  thirdFormGroup = this._formBuilder.group({
    // thirdCtrl: ['', Validators.required],
  });
  fourthFormGroup = this._formBuilder.group({
    // thirdCtrl: ['', Validators.required],
  });
  fifthFormGroup = this._formBuilder.group({
    // thirdCtrl: ['', Validators.required],
  });
  isLinear = false;

  constructor(private _formBuilder: FormBuilder) {}
}
