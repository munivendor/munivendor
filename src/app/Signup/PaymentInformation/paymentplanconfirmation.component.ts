import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatToolbarModule } from '@angular/material/toolbar';
import { RouterModule } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { UserService } from '../../shared/service/user.service';
import { AuthService } from '../../authorization/auth.service';
import { User } from '../../shared/model/user.model';

@Component({
  selector: 'payment-plan-confirmation',
  templateUrl: './paymentplanconfirmation.component.html',
  styleUrls: ['./paymentplanconfirmation.component.css'],
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatCardModule, MatToolbarModule, RouterModule]
})

export class PaymentPlanConfirmationComponent implements OnInit {
  private destroy$ = new Subject<void>();
  organizationTypeId: number | undefined;

  allFeatures = [
    'Submissions',
    'Real-Time Alerts & Notifications',
    'Full Vendor Profile Page',
    'Automatic Data to Government Form Insertion',
    'Unlimited Vendor Data Storage',
    'Digital Notarization',
    'Guaranteed Submission Delivery'
  ];

  offerorPricingPlans = [
    {
      name: 'Pay As You Go',
      price: '$39/each',
      features: ['1 Submission', 'Feature 2'],
      includedFeatures: [0, 1, 2, 3, 4, 5, 6]
    },
    {
      name: 'Bronze',
      price: '$99/month',
      features: ['3 Submissions', 'Feature 2', 'Feature 3'],
      includedFeatures: [0, 1, 2, 3, 4, 5, 6]
    },
    {
      name: 'Silver',
      price: '$199/month',
      features: ['7 Submissions', 'Feature 2', 'Feature 3', 'Feature 4', 'Feature 5'],
      includedFeatures: [0, 1, 2, 3, 4, 5, 6]
    },
    {
      name: 'Gold',
      price: '$299/month',
      features: ['15 Submissions', 'Feature 2', 'Feature 3', 'Feature 4', 'Feature 5', 'Feature 6'],
      includedFeatures: [0, 1, 2, 3, 4, 5, 6]
    },
    {
      name: 'Platinum',
      price: '$399/month',
      features: ['Unlimited Submissions', 'Feature 2', 'Feature 3', 'Feature 4', 'Feature 5', 'Feature 6', 'Feature 7'],
      includedFeatures: [0, 1, 2, 3, 4, 5, 6]
    }
  ];

  constructor(
    private userService: UserService,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    this.authService.user$.pipe(
      takeUntil(this.destroy$)
    ).subscribe(user => {
      if (user) {
        const userId = user
        if (userId) {
          this.getUserDetails(userId);
        } else {
          console.error('No user ID available in authentication state');
        }
      } 
    });
  }

  getUserDetails(userId: number): void {
    this.userService.getUser(userId).subscribe(
      (user: User) => {
        this.organizationTypeId = user.organizationTypeId;
      },
      (error) => {
        console.error('Error fetching user data:', error);
      }
    );
  }
  
  getFeatureText(planIndex: number, featureIndex: number): string {
    if (featureIndex === 0) {
      if (planIndex === 0) return '1 Submission';
      if (planIndex === 1) return '3 Submissions';
      if (planIndex === 2) return '7 Submissions';
      if (planIndex === 3) return '15 Submissions';
      if (planIndex === 4) return 'Unlimited Submissions';
    }

    return this.allFeatures[featureIndex];
  }

  isFeatureIncluded(planIndex: number, featureIndex: number): boolean {
    return this.offerorPricingPlans[planIndex].includedFeatures.includes(featureIndex);
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}