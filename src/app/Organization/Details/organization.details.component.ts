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
import { FlowProgressService } from '../../shared/service/flow-progress.service';
import { LoggingService } from '../../exceptionhandling/logging.service';
import { AuthService } from '../../authorization/auth.service';
import { SnackbarNotificationService } from '../../shared/service/snackbar-notification.service';

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
  loginForm!: FormGroup;
  organizationDetailForm!: FormGroup;
  states: State[] = [];
  userId!: number | null;
  organizationId!: number | null;
  organizationTypeId!: number | null;
  private destroy$ = new Subject<void>();
  framePageNumber = 2;

  constructor(
    private fb: FormBuilder,
    private organizationService: OrganizationService,
    private router: Router,
    private stateService: StateService,
    private flowProgressService: FlowProgressService,
    private loggingService: LoggingService
  ) {
    this.organizationDetailForm = this.fb.group({});

    if (this.organizationDetailForm) {
      this.organizationDetailForm.patchValue({
        organizationId: this.organizationId,
        organizationTypeId: this.organizationTypeId,
      });
    }
  }

  ngOnInit(): void {
    this.userId = this.stateService.getUserId();
    this.organizationTypeId = this.stateService.getOrganizationTypeId();
    this.organizationId = this.stateService.getOrganizationId();
    this.initializeForm();

    this.organizationService
      .getStates()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (states) => {
          this.states = states;
        },
        error: (error) => {
          const correlationId = error?.error?.correlationId;

          this.loggingService.logException(
            new Error(`HTTP Error ${error.status}: ${error.statusText}`),
            3,
            {
              correlationId: correlationId,
              methodName: 'ngOnInit',
              className: 'OrganizationDetailsComponent',
              operation: 'getStates',
            }
          );
        },
      });
  }

  private initializeForm(): void {
    this.organizationDetailForm = this.fb.group({
      organizationId: [this.organizationId],
      organizationName: [
        '',
        [
          Validators.required,
          Validators.minLength(3),
          Validators.maxLength(100),
          Validators.pattern(/^[A-Za-z ]+$/),
        ],
      ],
      address: [
        '',
        [
          Validators.required,
          Validators.minLength(3),
          Validators.maxLength(200),
          Validators.pattern(/^[A-Za-z0-9\s.,#-]+$/),
        ],
      ],
      address2: [
        '',
        [
          Validators.minLength(3),
          Validators.maxLength(200),
          Validators.pattern(/^[A-Za-z0-9\s.,#-]+$/),
        ],
      ],
      city: [
        '',
        [
          Validators.required,
          Validators.minLength(2),
          Validators.maxLength(100),
          Validators.pattern(/^[A-Za-z ]+$/),
        ],
      ],
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
        switchMap((organizationId: any) => {
          // required where organizationId is [object Object] for agency/offeror grid API
          // backend returns { organizationId: number } instead of just a number
          let orgId: number;
          if (typeof organizationId === 'object' && organizationId !== null) {
            orgId = organizationId.organizationId;
          } else if (typeof organizationId === 'string') {
            orgId = Number(organizationId);
          } else {
            orgId = organizationId;
          }

          this.stateService.setOrganizationId(Number(orgId));

          return this.flowProgressService
            .saveFlowProgress(Number(this.userId), 1, this.framePageNumber)
            .pipe(
              tap(() => this.router.navigate(['/user-details'])),
              catchError((error) => {
                const correlationId = error?.error?.correlationId;

                this.loggingService.logException(
                  new Error(`HTTP Error ${error.status}: ${error.statusText}`),
                  3,
                  {
                    userId: this.userId,
                    framePageNumber: this.framePageNumber,
                    correlationId: correlationId,
                    methodName: 'onSubmit',
                    className: 'OrganizationDetailsComponent',
                    operation: 'saveFlowProgress',
                  }
                );

                return throwError(() => error);
              })
            );
        }),

        catchError((error) => {
          const correlationId = error?.error?.correlationId;

          this.loggingService.logException(
            new Error(`HTTP Error ${error.status}: ${error.statusText}`),
            3,
            {
              organization: organization,
              correlationId: correlationId,
              methodName: 'onSubmit',
              className: 'OrganizationDetailsComponent',
              operation: 'updateOrganization',
            }
          );

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
