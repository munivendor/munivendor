import { Component } from '@angular/core';
import { MatButtonModule } from '@angular/material/button'; 
import { MatCardModule } from '@angular/material/card';
 import { MatToolbarModule } from '@angular/material/toolbar';

@Component({
  selector: 'app-payment-plan',
  templateUrl: './paymentplanconfirmation.component.html',
  styleUrls: ['./paymentplanconfirmation.component.css'],
  standalone: true,
  imports: [ MatButtonModule, MatCardModule, MatToolbarModule ]
})
export class PaymentPlanConfirmationComponent { }
