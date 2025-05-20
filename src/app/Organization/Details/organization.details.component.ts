import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { ReactiveFormsModule } from '@angular/forms'
import { MatSelectModule } from '@angular/material/select';
import { MatOptionModule } from '@angular/material/core';
import { StateService } from '../../Request/services/state.service';
import { OrganizationService } from "./services/organization.service"
import { Organization } from './model/organization.model';
import { Subject } from 'rxjs';
import { takeUntil, tap, catchError } from 'rxjs/operators';
import { State } from '../../shared/model/state.model';
import { AuthService } from '../../authorization/auth.service';

@Component({
  selector: 'app-organization-details',
  templateUrl: './organization.details.component.html',
  styleUrls: ['./organization.details.component.css'],
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatInputModule,
    MatFormFieldModule,
    MatButtonModule,
    MatCardModule,
    MatSelectModule,
    MatOptionModule,
    CommonModule],

})
export class GovernmentAgencyDetailsComponent implements OnInit {
  organizationDetailForm!: FormGroup;
  states: State[] = [];
  userId!: number;
  private destroy$ = new Subject<void>();

  constructor(
    private fb: FormBuilder,
    private organizationService: OrganizationService,
    private router: Router,
    private stateService: StateService,
    private authService: AuthService) {
    this.organizationDetailForm = this.fb.group({});
  }

  ngOnInit(): void {
    this.initializeForm();
    this.authService.user$.pipe(
      takeUntil(this.destroy$)
    ).subscribe(user => {
      if (user) {
        const userId = user
        if (userId) {
          this.userId = userId;
        } else {
          console.error('No user ID available in authentication state');
        }
      }
    });
    this.organizationService.getStates()
      .pipe(takeUntil(this.destroy$))
      .subscribe(states => {
        this.states = states;
      });
  }

  private initializeForm(): void {
    this.organizationDetailForm = this.fb.group({
      organizationName: ['', [Validators.required, Validators.minLength(3)]],
      address: ['', [Validators.required, Validators.minLength(3)]],
      address2: ['', [Validators.minLength(3)]],
      city: ['', [Validators.required, Validators.minLength(3)]],
      stateId: ['', Validators.required],
      zipCode: ['', [Validators.required, Validators.pattern(/^\d{5}(-\d{4})?$/)]],
    });
  }

  onSubmit(): void {
    if (this.organizationDetailForm.invalid) {
      return;
    }
    const organization: Organization = this.organizationDetailForm.value;

    this.organizationService.saveOrganization(organization).pipe(
      tap((organizationId: number) => {
        this.stateService.setOrganizationId(organizationId);
        this.router.navigate(['/user-details']);
      }),
      catchError(error => {
        console.error('Error saving organization:', error);
        throw error;
      }),
      takeUntil(this.destroy$)
    )
      .subscribe();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}