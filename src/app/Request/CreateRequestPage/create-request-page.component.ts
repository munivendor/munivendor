import { CreateRequestStepper } from '../CreateRequestStepper/create-request-stepper.component';
import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'create-request-page',
  templateUrl: './create-request-page.component.html',
  standalone: true,
  imports: [CommonModule, CreateRequestStepper],
  
})
export class CreateRequestPage {
  
}
