import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { ReactiveFormsModule } from '@angular/forms';
import { MatSelectModule } from '@angular/material/select';
import { MatOptionModule } from '@angular/material/core';
import { StateService } from '../../Request/services/state.service';
import { OrganizationService } from './services/organization.service';
import { Organization } from './model/organization.model';
import { Subject, throwError } from 'rxjs';
import { takeUntil, tap, catchError, switchMap } from 'rxjs/operators';
import { State } from '../../shared/model/state.model';
import { AuthService } from '../../authorization/auth.service';
import { UserService } from '../../shared/service/user.service';
import { User } from '../../shared/model/user.model';
import { FlowProgressService } from '../../shared/service/flow-progress.service';
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
    CommonModule,
  ],
})
export class OrganizationDetailsComponent implements OnInit {
  organizationDetailForm!: FormGroup;
  states: State[] = [];
  userId!: number;
  organizationId!: number | undefined;
  organizationTypeId!: number | null;
  private destroy$ = new Subject<void>();
  framePageNumber = 2;

  constructor(
    private fb: FormBuilder,
    private organizationService: OrganizationService,
    private router: Router,
    private stateService: StateService,
    private authService: AuthService,
    private userService: UserService,
    private flowProgressService: FlowProgressService
  ) {
    this.organizationDetailForm = this.fb.group({});
  }

  ngOnInit(): void {
    this.initializeForm();
    this.authService.user$.pipe(takeUntil(this.destroy$)).subscribe((user) => {
      if (user) {
        const userId = user;
        if (userId) {
          this.userId = userId;
          this.getUserDetails(userId);
        } else {
          console.error('No user ID available in authentication state');
        }
      }
    });
    this.organizationService
      .getStates()
      .pipe(takeUntil(this.destroy$))
      .subscribe((states) => {
        this.states = states;
      });
  }

  getUserDetails(userId: number): void {
    this.userService.getUser(userId).subscribe(
      (user: User) => {
        this.organizationId = user.organizationId;
        this.organizationTypeId = user.organizationTypeId ?? null;

        if (this.organizationDetailForm) {
          this.organizationDetailForm.patchValue({
            organizationId: this.organizationId,
          });
        }
      },
      (error) => {
        console.error('Error fetching user data:', error);
      }
    );
  }

  private initializeForm(): void {
    this.organizationDetailForm = this.fb.group({
      organizationId: [this.organizationId],
      organizationName: ['', [Validators.required, Validators.minLength(3)]],
      address: ['', [Validators.required, Validators.minLength(3)]],
      address2: ['', [Validators.minLength(3)]],
      city: ['', [Validators.required, Validators.minLength(3)]],
      stateId: ['', Validators.required],
      zipCode: [
        '',
        [Validators.required, Validators.pattern(/^\d{5}(-\d{4})?$/)],
      ],
    });
  }

  onSubmit(): void {
    if (this.organizationDetailForm.invalid) {
      return;
    }

    const organization: Organization = this.organizationDetailForm.value;

    this.organizationService
      .updateOrganization(organization)
      .pipe(
        switchMap((organizationId: number) => {
          this.stateService.setOrganizationId(organizationId);

          return this.flowProgressService
            .saveFlowProgress(this.userId, 1, this.framePageNumber)
            .pipe(tap(() => this.router.navigate(['/user-details'])));
        }),

        catchError((error) => {
          console.error('Error saving organization or flow progress:', error);
          return throwError(() => error);
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
