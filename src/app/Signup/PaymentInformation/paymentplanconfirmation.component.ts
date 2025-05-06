import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button'; 
import { MatCardModule } from '@angular/material/card';
import { MatToolbarModule } from '@angular/material/toolbar';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'payment-plan-confirmation',
  templateUrl: './paymentplanconfirmation.component.html',
  styleUrls: ['./paymentplanconfirmation.component.css'],
  standalone: true,
  imports: [ CommonModule, MatButtonModule, MatCardModule, MatToolbarModule, RouterModule ]
})
export class PaymentPlanConfirmationComponent { 
    // All possible features across all plans
    allFeatures = [
      'Submissions',
      'Real-Time Alerts & Notifications',
      'Full Vendor Profile Page',
      'Automatic Data to Government Form Insertion',
      'Unlimited Vendor Data Storage',
      'Digital Notarization',
      'Guaranteed Submission Delivery'
    ];
    
    pricingPlans = [
      {
        name: 'Pay As You Go',
        price: '$39/each',
        features: ['1 Submission', 'Feature 2'],
        includedFeatures: [0, 1, 2, 3, 4, 5, 6] // indices of included features
      },
      {
        name: 'Bronze',
        price: '$99/month',
        features: ['3 Submissions', 'Feature 2', 'Feature 3'],
        includedFeatures: [0, 1, 2, 3, 4, 5, 6] // indices of included features
      },
      {
        name: 'Silver',
        price: '$199/month',
        features: ['7 Submissions', 'Feature 2', 'Feature 3', 'Feature 4', 'Feature 5'],
        includedFeatures: [0, 1, 2, 3, 4, 5, 6] // indices of included features
      },
      {
        name: 'Gold',
        price: '$299/month',
        features: ['15 Submissions', 'Feature 2', 'Feature 3', 'Feature 4', 'Feature 5', 'Feature 6'],
        includedFeatures: [0, 1, 2, 3, 4, 5, 6] // indices of included features
      },
      {
        name: 'Platinum',
        price: '$399/month',
        features: ['Unlimited Submissions', 'Feature 2', 'Feature 3', 'Feature 4', 'Feature 5', 'Feature 6', 'Feature 7'],
        includedFeatures: [0, 1, 2, 3, 4, 5, 6] // indices of included features
      }
    ];
  
    // Custom text for submissions based on plan
    getFeatureText(planIndex: number, featureIndex: number): string {
      // Special case for submissions which varies by plan
      if (featureIndex === 0) {
        if (planIndex === 0) return '1 Submission';
        if (planIndex === 1) return '3 Submissions';
        if (planIndex === 2) return '7 Submissions';
        if (planIndex === 3) return '15 Submissions';
        if (planIndex === 4) return 'Unlimited Submissions';
      }
      
      return this.allFeatures[featureIndex];
    }
  
    // Check if a feature is included in a specific plan
    isFeatureIncluded(planIndex: number, featureIndex: number): boolean {
      return this.pricingPlans[planIndex].includedFeatures.includes(featureIndex);
    }
  }