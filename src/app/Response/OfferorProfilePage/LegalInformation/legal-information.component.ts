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
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { StateService } from '../../../Request/services/state.service';
import { OfferorProfileService } from '../../services/offeror-profile.service';
import { LoggingService } from '../../../exceptionhandling/logging.service';
import { SnackbarNotificationService } from '../../../shared/service/snackbar-notification.service';
import { OfferorLegalInfo } from '../../model/offeror-legal-info.model';

@Component({
  selector: 'app-legal-information',
  templateUrl: './legal-information.component.html',
  styleUrls: [
    '../../../shared/shared-profile-card.css',
    './legal-information.component.css',
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
    MatInputModule,
    MatProgressSpinnerModule,
  ],
})
export class LegalInformationComponent implements OnInit {
  legalForm!: FormGroup;
  isLoadingLegal = false;
  isSavingLegal = false;

  private legalInformationId: number | null = null;
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
    this.buildForm();
    this.subscribeToConditionalFields();

    if (this.organizationId) {
      this.loadLegalInfo();
    }
  }

  // ── Form builder ──────────────────────────────────

  private buildForm(): void {
    this.legalForm = this.fb.group({
      contractFailure: [null, Validators.required],
      contractFailureDetails: [null],
      liensLawsuits: [null, Validators.required],
      liensLawsuitsDetails: [null],
    });
  }

  /**
   * Adds/removes validators on the detail fields based on their
   * corresponding dropdown value. Also clears the detail value when
   * the user switches back to "No" so stale text isn't submitted.
   */
  private subscribeToConditionalFields(): void {
    this.legalForm.get('contractFailure')?.valueChanges.subscribe((value) => {
      const detailsControl = this.legalForm.get('contractFailureDetails');
      if (value === true) {
        detailsControl?.setValidators([
          Validators.required,
          Validators.maxLength(5000),
        ]);
      } else {
        detailsControl?.clearValidators();
        detailsControl?.setValue(null);
      }
      detailsControl?.updateValueAndValidity();
    });

    this.legalForm.get('liensLawsuits')?.valueChanges.subscribe((value) => {
      const detailsControl = this.legalForm.get('liensLawsuitsDetails');
      if (value === true) {
        detailsControl?.setValidators([
          Validators.required,
          Validators.maxLength(1000),
        ]);
      } else {
        detailsControl?.clearValidators();
        detailsControl?.setValue(null);
      }
      detailsControl?.updateValueAndValidity();
    });
  }

  // ── Load ──────────────────────────────────────────

  loadLegalInfo(offerorLegalInformationId?: number): void {
    this.isLoadingLegal = true;
    this.offerorProfileService
      .GetLegalInfo(this.organizationId!, offerorLegalInformationId)
      .subscribe({
        next: (data: OfferorLegalInfo) => {
          this.legalInformationId = data.offerorLegalInformationId ?? null;
          this.legalForm.patchValue({
            contractFailure: data.contractFailure,
            contractFailureDetails: data.contractFailureDetails,
            liensLawsuits: data.liensLawsuits,
            liensLawsuitsDetails: data.liensLawsuitsDetails,
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
              organizationId: this.organizationId,
              methodName: 'loadLegalInfo',
              className: 'OfferorLegalComponent',
              operation: 'GetLegalInfo',
              userId: this.stateService.getUserId(),
            },
          );
        },
      });
  }

  // ── Save ──────────────────────────────────────────

  onSaveLegal(): void {
    if (this.legalForm.invalid) {
      this.legalForm.markAllAsTouched();
      return;
    }

    this.isSavingLegal = true;

    const formValue = this.legalForm.value;

    const payload: OfferorLegalInfo = {
      offerorLegalInformationId: this.legalInformationId ?? 0,
      organizationId: this.organizationId,
      contractFailure: formValue.contractFailure,
      contractFailureDetails:
        formValue.contractFailure === true
          ? formValue.contractFailureDetails
          : null,
      liensLawsuits: formValue.liensLawsuits,
      liensLawsuitsDetails:
        formValue.liensLawsuits === true
          ? formValue.liensLawsuitsDetails
          : null,
    };

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
            className: 'OfferorLegalComponent',
            operation: this.legalInformationId
              ? 'UpdateLegalInfo'
              : 'CreateLegalInfo',
            userId: this.stateService.getUserId(),
          },
        );
      },
    });
  }

  // ── Template helpers ──────────────────────────────

  isFieldInvalid(field: string): boolean {
    const control = this.legalForm.get(field);
    return !!(control && control.invalid && (control.dirty || control.touched));
  }
}
