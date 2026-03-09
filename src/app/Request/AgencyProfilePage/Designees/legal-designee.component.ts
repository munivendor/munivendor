import { Component, Input, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  ReactiveFormsModule,
  FormBuilder,
  FormGroup,
  Validators,
  AbstractControl,
  ValidationErrors,
} from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { of } from 'rxjs';
import { delay } from 'rxjs/operators';

// TODO: Replace with your real model path once created
// import { LegalDesignee } from '../model/legal-designee.model';
// TODO: Import your real service once API is ready
// import { AgencyProfileService } from '../services/agency-profile.service';
import { SnackbarNotificationService } from '../../../shared/service/snackbar-notification.service';
import { LoggingService } from '../../../exceptionhandling/logging.service';
import { StateService } from '../../../Request/services/state.service';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';

// ─── Temporary mock model — move to legal-designee.model.ts when ready ────────
export interface LegalDesignee {
  firstName: string;
  lastName: string | null;
  title: string;
  directPhone: string;
  email: string;
  confirmEmail: string;
  legalType: string;
}

// ─── TODO: Replace with real options from API or hardcoded list ───────────────
export interface DropdownOption {
  value: string;
  label: string;
}

// ─── Temporary mock data — remove once API is ready ──────────────────────────
const MOCK_LEGAL_DESIGNEE: LegalDesignee = {
  firstName: '',
  lastName: null,
  title: '',
  directPhone: '',
  email: '',
  confirmEmail: '',
  legalType: '',
};

function emailMatchValidator(group: AbstractControl): ValidationErrors | null {
  const email = group.get('email')?.value;
  const confirm = group.get('confirmEmail')?.value;
  if (confirm && email !== confirm) {
    group.get('confirmEmail')?.setErrors({ emailMismatch: true });
    return { emailMismatch: true };
  } else {
    const confirmControl = group.get('confirmEmail');
    if (confirmControl?.hasError('emailMismatch')) {
      confirmControl.setErrors(null);
    }
  }
  return null;
}

@Component({
  selector: 'app-legal-designee',
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
  templateUrl: './legal-designee.component.html',
  styleUrls: ['./designee-shared.component.css'],
})
export class LegalDesigneeComponent implements OnInit {
  @Input() organizationId: number | null = null;

  form!: FormGroup;
  isLoading = false;
  isSaving = false;

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
    this.loadLegalDesignee();
  }

  private buildForm(): void {
    this.form = this.fb.group(
      {
        firstName: ['', Validators.required],
        lastName: [null],
        title: ['', Validators.required],
        directPhone: ['', Validators.required],
        email: ['', [Validators.required, Validators.email]],
        confirmEmail: [''],
        legalType: ['', Validators.required],
      },
      { validators: emailMatchValidator },
    );
  }

  loadLegalDesignee(): void {
    this.isLoading = true;

    // ── TODO: Replace this mock with your real API call ──────────────────────
    // this.agencyProfileService
    //   .getLegalDesignee(this.organizationId ?? 0)
    //   .subscribe({ next: (data) => this.patchForm(data), error: ... });
    // ─────────────────────────────────────────────────────────────────────────

    of(MOCK_LEGAL_DESIGNEE)
      .pipe(delay(500))
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
              methodName: 'loadLegalDesignee',
              className: 'LegalDesigneeComponent',
              operation: 'getLegalDesignee',
              userId: this.stateService.getUserId(),
            },
          );
        },
      });
  }

  private patchForm(data: LegalDesignee): void {
    this.form.patchValue(data);
    this.form.markAsPristine();
  }

  onSave(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.isSaving = true;
    const payload: LegalDesignee = this.form.value;

    // ── TODO: Replace this mock with your real API call ──────────────────────
    // this.agencyProfileService
    //   .saveLegalDesignee(this.organizationId ?? 0, payload)
    //   .subscribe({ next: () => { ... }, error: () => { ... } });
    // ─────────────────────────────────────────────────────────────────────────

    of(null)
      .pipe(delay(800))
      .subscribe({
        next: () => {
          this.isSaving = false;
          this.form.markAsPristine();
          this.snackbar.showSnackbarSuccess(
            'Legal designee saved successfully.',
          );
          this.cdr.detectChanges();
        },
        error: (err) => {
          this.isSaving = false;
          this.snackbar.showSnackbarError('Failed to save legal designee.');
          this.loggingService.logException(
            new Error(`HTTP Error ${err.status}: ${err.statusText}`),
            3,
            {
              organizationId: this.organizationId,
              methodName: 'onSave',
              className: 'LegalDesigneeComponent',
              operation: 'saveLegalDesignee',
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
