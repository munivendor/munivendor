import { Component, OnInit } from '@angular/core';
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
    MatButtonModule,
    CommonModule
  ]
})
export class RoleVerificationComponent implements OnInit {
  private destroy$ = new Subject<void>();
  organizationId: number | undefined;
  
  constructor(
    private router: Router,
    private organizationService: OrganizationService,
    private authService: AuthService,
    private userService: UserService
  ) {}
  
  ngOnInit(): void {
    this.authService.user$.pipe(
      takeUntil(this.destroy$)
    ).subscribe(user => {
      if (user) {
        const userId = user;
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
  
  selectRole(role: 'offeror' | 'governmentAgency'): void {
    if (!this.organizationId) {
      return;
    }

    const organizationTypeId = role === 'governmentAgency' ? 1 : 2;
    
    const organization: Organization = {
      organizationId: this.organizationId,
      organizationTypeId: organizationTypeId,
    };
    
    this.organizationService.updateOrganization(organization).subscribe({
      next: (response) => {
        const route = role === 'governmentAgency' ? '/government-agency-details' : '/user-details';
        this.router.navigate([route]);
      },
      error: (error) => {
        console.log(`Error updating organization type to ${role}:`, error);
      }
    });
  }
  
  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}