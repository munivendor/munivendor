import { Component } from '@angular/core';
import { MatButtonModule } from '@angular/material/button'; 
import { MatCardModule } from '@angular/material/card';
import { MatToolbarModule } from '@angular/material/toolbar';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'payment-plan-confirmation',
  templateUrl: './paymentplanconfirmation.component.html',
  styleUrls: ['./paymentplanconfirmation.component.css'],
  standalone: true,
  imports: [ MatButtonModule, MatCardModule, MatToolbarModule, RouterModule ]
})
export class PaymentPlanConfirmationComponent { }
