import { Component, Input, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  ReactiveFormsModule,
  FormBuilder,
  FormGroup,
  Validators,
} from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { AgencyDetails } from '../../model/agency-details.model';
import { AgencyProfileService } from '../../services/agency-profile.service';
import { SnackbarNotificationService } from '../../../shared/service/snackbar-notification.service';
import { LoggingService } from '../../../exceptionhandling/logging.service';
import { StateService } from '../../../Request/services/state.service';
import { State } from '../../../shared/model/state.model';
import { MatSelectModule } from '@angular/material/select';
import { usPhoneValidator } from '../../../shared/validators/us-phone.validator';
import { formatUsPhoneAsYouType } from '../../../shared/utils/us-phone.util';

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
    MatSelectModule,
  ],
  templateUrl: './agency-details.component.html',
  styleUrls: ['./agency-details.component.css'],
})
export class AgencyDetailsComponent implements OnInit {
  @Input() organizationId: number | null = null;
  @Input() isLoading = false;
  @Input() set agencyDetails(data: AgencyDetails | null) {
    if (data) this.patchForm(data);
  }
  states: State[] = [];

  readonly zipPattern = '^\\d{5}(-\\d{4})?$';

  form!: FormGroup;
  isSaving = false;
  displayPhone = '';

  // File upload state — kept for future logo feature
  // selectedFile: File | null = null;
  // selectedFileName: string | null = null;
  // existingLogoUrl: string | null = null;

  constructor(
    private fb: FormBuilder,
    private cdr: ChangeDetectorRef,
    private snackbar: SnackbarNotificationService,
    private loggingService: LoggingService,
    private stateService: StateService,
    private agencyProfileService: AgencyProfileService,
  ) {}

  ngOnInit(): void {
    this.buildForm();
    const orgId = this.organizationId ?? this.stateService.getOrganizationId();
    if (orgId) this.loadAgencyDetails(orgId);
    this.loadStates();
  }

  private buildForm(): void {
    this.form = this.fb.group({
      organizationName: ['', Validators.required],
      address: ['', Validators.required],
      address2: [null],
      city: ['', Validators.required],
      stateId: [null, Validators.required],
      zipCode: ['', [Validators.required, Validators.pattern(this.zipPattern)]],
      phone: ['', [Validators.required, usPhoneValidator()]],
    });
  }

  private loadAgencyDetails(organizationId: number): void {
    this.isLoading = true;
    this.agencyProfileService.GetAgencyDetails(organizationId).subscribe({
      next: (data) => {
        this.patchForm(data);
        this.isLoading = false;
      },
      error: (err) => {
        this.isLoading = false;
        // log error...
      },
    });
  }

  private loadStates(): void {
    this.agencyProfileService.GetStates().subscribe({
      next: (data) => {
        this.states = data;
      },
      error: (err) => {
        this.loggingService.logException(
          new Error(`HTTP Error ${err.status}: ${err.statusText}`),
          3,
          {
            methodName: 'loadStates',
            className: 'AgencyDetailsComponent',
            operation: 'GetStates',
            userId: this.stateService.getUserId(),
          },
        );
      },
    });
  }

  private patchForm(data: AgencyDetails): void {
    if (data.phone) {
      this.displayPhone = this.formatPhoneDisplay(data.phone);
    }
    this.form.patchValue({
      organizationName: data.organizationName,
      address: data.address,
      address2: data.address2 ?? null,
      city: data.city,
      stateId: data.stateId,
      zipCode: data.zipCode,
      phone: this.displayPhone,
    });
    this.form.markAsPristine();
  }

  onPhoneInput(value: string): void {
    const digits = value.replace(/\D/g, '').slice(0, 10);
    this.displayPhone = this.formatPhoneDisplay(digits);
    this.form.get('phone')?.setValue(this.displayPhone, { emitEvent: false });
  }

  formatPhoneDisplay(digits: string): string {
    return formatUsPhoneAsYouType(digits);
  }

  onPhoneKeydown(event: KeyboardEvent): void {
    const controlKeys = [
      'Backspace',
      'Delete',
      'ArrowLeft',
      'ArrowRight',
      'Tab',
      'Home',
      'End',
    ];
    if (controlKeys.includes(event.key)) return;
    if (!/^\d$/.test(event.key)) event.preventDefault();
  }

  titleCaseField(
    field: 'organizationName' | 'city' | 'address' | 'address2',
  ): void {
    const val = this.form.get(field)?.value;
    if (val) {
      this.form.get(field)?.setValue(
        val.trim().replace(/\b\w/g, (c: string) => c.toUpperCase()),
        { emitEvent: false },
      );
    }
  }

  onZipKeydown(event: KeyboardEvent): void {
    const controlKeys = [
      'Backspace',
      'Delete',
      'ArrowLeft',
      'ArrowRight',
      'Tab',
      'Home',
      'End',
    ];
    if (controlKeys.includes(event.key)) return;
    if (!/[\d\-]/.test(event.key)) event.preventDefault();
  }

  // — File upload — kept for future logo feature
  // onFileSelected(event: Event): void {
  //   const input = event.target as HTMLInputElement;
  //   if (!input.files?.length) return;
  //   const file = input.files[0];
  //   const maxSize = 50 * 1024 * 1024;
  //   if (file.size > maxSize) {
  //     this.snackbar.showSnackbarError('File size exceeds 50 MB limit.');
  //     return;
  //   }
  //   this.selectedFile = file;
  //   this.selectedFileName = file.name;
  //   this.form.markAsDirty();
  // }

  // onRemoveLogo(): void {
  //   this.existingLogoUrl = null;
  //   this.selectedFile = null;
  //   this.selectedFileName = null;
  //   this.form.markAsDirty();
  // }

  onSave(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.isSaving = true;

    const { phone, ...formFields } = this.form.value;
    const rawPhone = phone.replace(/\D/g, '');

    const payload: AgencyDetails = {
      ...formFields,
      phone: rawPhone,
      // logoUrl: this.existingLogoUrl,
    };

    this.agencyProfileService
      .SaveAgencyDetails(this.organizationId ?? 0, payload)
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
              operation: 'SaveAgencyDetails',
              userId: this.stateService.getUserId(),
            },
          );
          this.cdr.detectChanges();
        },
      });
  }

  isFieldInvalid(field: string): boolean {
    const control = this.form.get(field);
    return !!(control && control.invalid && (control.dirty || control.touched));
  }
}
