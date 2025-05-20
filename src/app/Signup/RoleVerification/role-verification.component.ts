import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { OrganizationService } from '../../Organization/Details/services/organization.service';
import { AuthService } from '../../authorization/auth.service';
import { Subject, takeUntil } from 'rxjs';
import { UserService } from '../../shared/service/user.service';
import { Organization } from '../../Organization/Details/model/organization.model';
import { User } from '../../shared/model/user.model';
@Component({
  selector: 'role-verification',
  templateUrl: './role-verification.component.html',
  styleUrls: ['./role-verification.component.css'],
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatButtonModule,
    CommonModule
  ]
})
export class RoleVerificationComponent implements OnInit {
  roleVerificationForm!: FormGroup;
  private destroy$ = new Subject<void>();
  organizationId: number | undefined;

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private organizationService: OrganizationService,
    private authService: AuthService,
    private userService: UserService
  ) {
    this.roleVerificationForm = this.fb.group({
      userType: ['']
    });
  }

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
      } else {
        this.router.navigate(['/login']);
      }
    });
  }

  getUserDetails(userId: number): void {
    this.userService.getUser(userId).subscribe(
      (user: User) => {
        this.organizationId = user.organizationId;
      },
      (error) => {
        console.error('Error fetching user data:', error);
      }
    );
  }

  onSubmit(event: SubmitEvent): void {
    event.preventDefault();

    const submitter = event.submitter as HTMLButtonElement;
    const buttonName = submitter?.name;

    if (buttonName === 'governmentAgency') {
      const organization: Organization = {
        organizationId: this.organizationId,
        organizationTypeId: 1,
      }

      // Call the update API
      this.organizationService.updateOrganization(organization).subscribe({
        next: (response) => {
          this.roleVerificationForm.get('userType')?.setValue('governmentAgency');
          this.router.navigate(['/government-agency-details']);
        },
        error: (error) => {
          console.error('Error updating organization type:', error);
          // Handle error appropriately
        }
      });

    }
    else if (buttonName === 'offeror') {
      const organization: Organization = {
        organizationId: this.organizationId,
        organizationTypeId: 2,
      }

      // Call the update API
      this.organizationService.updateOrganization(organization).subscribe({
        next: (response) => {
          this.roleVerificationForm.get('userType')?.setValue('offeror');
          this.router.navigate(['/user-details']);
        },
        error: (error) => {
          console.error('Error updating organization type:', error);
          // Handle error appropriately
        }
      });

    }
  }
}

