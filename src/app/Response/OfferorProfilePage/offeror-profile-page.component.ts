import { Component, OnInit, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { StateService } from '../../Request/services/state.service';
import { OfferorProfileService } from '../services/offeror-profile.service';
import { LoggingService } from '../../exceptionhandling/logging.service';
import { SnackbarNotificationService } from '../../shared/service/snackbar-notification.service';
import { AuthorizingOfficialsComponent } from './AuthorizingOfficials/authorizing-officials.component';
import { OfferorOrganizationDetailsComponent } from './OfferorDetails/offeror-details.component';
import { OfferorLegalInfo } from '../model/offeror-legal-info.model';

@Component({
  selector: 'offeror-profile-page',
  templateUrl: './offeror-profile-page.component.html',
  styleUrls: [
    '../../shared/shared-profile-card.css',
    './offeror-profile-page.component.css',
  ],
  encapsulation: ViewEncapsulation.None,
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatFormFieldModule,
    MatSelectModule,
    MatIconModule,
    MatProgressSpinnerModule,
    AuthorizingOfficialsComponent,
    OfferorOrganizationDetailsComponent,
  ],
})
export class OfferorProfilePageComponent implements OnInit {
  // ── Legal ─────────────────────────────────────────
  legalForm!: FormGroup;
  isLoadingLegal = false;
  isSavingLegal = false;
  // Null means no record exists yet → POST; non-null → PUT
  private legalInformationId: number | null = null;

  // ── Stockholder ───────────────────────────────────
  // Add stockholderForm here when you have the stockholder API endpoints
  // stockholderForm!: FormGroup;
  // isLoadingStockholder = false;
  // isSavingStockholder = false;

  private organizationId: number | null = null;

  constructor(
    private fb: FormBuilder,
    private stateService: StateService,
    private offerorProfileService: OfferorProfileService,
    private loggingService: LoggingService,
    private snackbar: SnackbarNotificationService,
  ) {}

  ngOnInit(): void {
    this.organizationId = this.stateService.getOrganizationId();
    this.buildForms();

    if (this.organizationId) {
      // Legal is loaded by its ID, which you may need to look up
      // via a separate endpoint (e.g. GET by organizationId).
      // If you have that endpoint, call loadLegalInfo(id) here.
      // For now, the form stays empty until a record is saved for the first time.
    }
  }

  // ── Form builders ─────────────────────────────────

  private buildForms(): void {
    this.legalForm = this.fb.group({
      contractFailure: [null, Validators.required],
      liensLawsuits: [null, Validators.required],
    });
  }

  // ── Legal load ────────────────────────────────────

  /**
   * Call this once you know the offerorLegalInformationId for this org,
   * e.g. from a lookup endpoint or after first save.
   */
  loadLegalInfo(offerorLegalInformationId: number): void {
    this.isLoadingLegal = true;
    this.offerorProfileService
      .GetLegalInfo(offerorLegalInformationId)
      .subscribe({
        next: (data: OfferorLegalInfo) => {
          this.legalInformationId = data.offerorLegalInformationId ?? null;
          this.legalForm.patchValue({
            contractFailure: data.contractFailure,
            liensLawsuits: data.liensLawsuits,
          });
          this.legalForm.markAsPristine();
          this.isLoadingLegal = false;
        },
        error: (err) => {
          this.isLoadingLegal = false;
          this.loggingService.logException(
            new Error(`HTTP Error ${err.status}: ${err.statusText}`),
            3,
            {
              offerorLegalInformationId,
              methodName: 'loadLegalInfo',
              className: 'OfferorProfilePageComponent',
              operation: 'GetLegalInfo',
              userId: this.stateService.getUserId(),
            },
          );
        },
      });
  }

  // ── Legal save ────────────────────────────────────

  onSaveLegal(): void {
    if (this.legalForm.invalid) {
      this.legalForm.markAllAsTouched();
      return;
    }

    this.isSavingLegal = true;

    const payload: OfferorLegalInfo = {
      offerorLegalInformationId: this.legalInformationId ?? 0, // 0 for new records
      organizationId: this.organizationId,
      contractFailure: this.legalForm.value.contractFailure,
      liensLawsuits: this.legalForm.value.liensLawsuits,
      contractFailureDetails: null,
      liensLawsuitsDetails: null,
    };

    // POST if no record yet, PUT if one already exists
    const request$ = this.legalInformationId
      ? this.offerorProfileService.UpdateLegalInfo(
          this.legalInformationId,
          payload,
        )
      : this.offerorProfileService.CreateLegalInfo(payload);

    request$.subscribe({
      next: (response) => {
        this.isSavingLegal = false;
        this.legalForm.markAsPristine();
        // Store the ID so subsequent saves use PUT
        if (!this.legalInformationId) {
          this.legalInformationId = response.OfferorLegalInformationId;
        }
        this.snackbar.showSnackbarSuccess(
          'Legal information saved successfully.',
        );
      },
      error: (err) => {
        this.isSavingLegal = false;
        this.snackbar.showSnackbarError('Failed to save legal information.');
        this.loggingService.logException(
          new Error(`HTTP Error ${err.status}: ${err.statusText}`),
          3,
          {
            organizationId: this.organizationId,
            methodName: 'onSaveLegal',
            className: 'OfferorProfilePageComponent',
            operation: this.legalInformationId
              ? 'UpdateLegalInfo'
              : 'CreateLegalInfo',
            userId: this.stateService.getUserId(),
          },
        );
      },
    });
  }

  // ── Helpers ───────────────────────────────────────

  // Expose for template
  get isLegalFieldInvalid(): (field: string) => boolean {
    return (field: string) => {
      const control = this.legalForm.get(field);
      return !!(
        control &&
        control.invalid &&
        (control.dirty || control.touched)
      );
    };
  }
}
