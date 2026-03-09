import { Component, Input, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  ReactiveFormsModule,
  FormBuilder,
  FormGroup,
  Validators,
} from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { of } from 'rxjs';
import { delay } from 'rxjs/operators';

// TODO: Replace with your real model path once created
// import { AgencyDetails } from '../model/agency-details.model';
// TODO: Import your real service once API is ready
// import { AgencyProfileService } from '../services/agency-profile.service';
import { SnackbarNotificationService } from '../../../shared/service/snackbar-notification.service';
import { LoggingService } from '../../../exceptionhandling/logging.service';
import { StateService } from '../../../Request/services/state.service';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';

// ─── Temporary mock model — move to agency-details.model.ts when ready ───────
export interface AgencyDetails {
  agencyName: string;
  logoUrl: string | null;
  addressLine1: string;
  addressLine2: string | null;
  city: string;
  state: string;
  zipCode: string;
  mainPhoneNumber: string;
}

// ─── Temporary mock data — remove once API is ready ──────────────────────────
const MOCK_AGENCY_DETAILS: AgencyDetails = {
  agencyName: '',
  logoUrl: null,
  addressLine1: '',
  addressLine2: null,
  city: '',
  state: '',
  zipCode: '',
  mainPhoneNumber: '',
};

@Component({
  selector: 'app-agency-details',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatProgressSpinnerModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
  ],
  templateUrl: './agency-details.component.html',
  styleUrls: ['./agency-details.component.css'],
})
export class AgencyDetailsComponent implements OnInit {
  @Input() organizationId: number | null = null;

  form!: FormGroup;
  isLoading = false;
  isSaving = false;

  // File upload state
  selectedFile: File | null = null;
  selectedFileName: string | null = null;
  existingLogoUrl: string | null = null;

  constructor(
    private fb: FormBuilder,
    private cdr: ChangeDetectorRef,
    private snackbar: SnackbarNotificationService,
    private loggingService: LoggingService,
    private stateService: StateService,
    // TODO: Inject real service when ready
    // private agencyProfileService: AgencyProfileService,
  ) {}

  ngOnInit(): void {
    this.buildForm();
    this.loadAgencyDetails();
  }

  private buildForm(): void {
    this.form = this.fb.group({
      agencyName: ['', Validators.required],
      addressLine1: ['', Validators.required],
      addressLine2: [null],
      city: ['', Validators.required],
      state: ['', Validators.required],
      zipCode: ['', Validators.required],
      mainPhoneNumber: ['', Validators.required],
    });
  }

  loadAgencyDetails(): void {
    this.isLoading = true;

    // ── TODO: Replace this mock with your real API call ──────────────────────
    // this.agencyProfileService
    //   .getAgencyDetails(this.organizationId ?? 0)
    //   .subscribe({ next: (data) => this.patchForm(data), error: ... });
    // ─────────────────────────────────────────────────────────────────────────

    of(MOCK_AGENCY_DETAILS)
      .pipe(delay(500)) // simulates network latency — remove with real API
      .subscribe({
        next: (data) => {
          this.patchForm(data);
          this.isLoading = false;
          this.cdr.detectChanges();
        },
        error: (err) => {
          this.isLoading = false;
          this.loggingService.logException(
            new Error(`HTTP Error ${err.status}: ${err.statusText}`),
            3,
            {
              organizationId: this.organizationId,
              methodName: 'loadAgencyDetails',
              className: 'AgencyDetailsComponent',
              operation: 'getAgencyDetails',
              userId: this.stateService.getUserId(),
            },
          );
        },
      });
  }

  private patchForm(data: AgencyDetails): void {
    this.form.patchValue({
      agencyName: data.agencyName,
      addressLine1: data.addressLine1,
      addressLine2: data.addressLine2 ?? null,
      city: data.city,
      state: data.state,
      zipCode: data.zipCode,
      mainPhoneNumber: data.mainPhoneNumber,
    });
    this.existingLogoUrl = data.logoUrl;
    this.form.markAsPristine();
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files?.length) return;

    const file = input.files[0];
    const maxSize = 50 * 1024 * 1024; // 50 MB

    if (file.size > maxSize) {
      this.snackbar.showSnackbarError('File size exceeds 50 MB limit.');
      return;
    }

    this.selectedFile = file;
    this.selectedFileName = file.name;
    this.form.markAsDirty(); // enables Save button
  }

  onRemoveLogo(): void {
    this.existingLogoUrl = null;
    this.selectedFile = null;
    this.selectedFileName = null;
    this.form.markAsDirty();
  }

  onSave(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.isSaving = true;
    const payload: AgencyDetails = {
      ...this.form.value,
      logoUrl: this.existingLogoUrl,
    };

    // ── TODO: Replace this mock with your real API call ──────────────────────
    // const formData = new FormData();
    // if (this.selectedFile) formData.append('logo', this.selectedFile);
    // formData.append('data', JSON.stringify(payload));
    // this.agencyProfileService
    //   .saveAgencyDetails(this.organizationId ?? 0, formData)
    //   .subscribe({ next: () => { ... }, error: () => { ... } });
    // ─────────────────────────────────────────────────────────────────────────

    of(null)
      .pipe(delay(800)) // simulates network latency — remove with real API
      .subscribe({
        next: () => {
          this.isSaving = false;
          this.form.markAsPristine();
          this.snackbar.showSnackbarSuccess(
            'Agency details saved successfully.',
          );
          this.cdr.detectChanges();
        },
        error: (err) => {
          this.isSaving = false;
          this.snackbar.showSnackbarError('Failed to save agency details.');
          this.loggingService.logException(
            new Error(`HTTP Error ${err.status}: ${err.statusText}`),
            3,
            {
              organizationId: this.organizationId,
              methodName: 'onSave',
              className: 'AgencyDetailsComponent',
              operation: 'saveAgencyDetails',
              userId: this.stateService.getUserId(),
            },
          );
        },
      });
  }

  isFieldInvalid(field: string): boolean {
    const control = this.form.get(field);
    return !!(control && control.invalid && (control.dirty || control.touched));
  }
}
