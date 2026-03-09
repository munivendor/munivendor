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
// import { ClerkDesignee } from '../model/clerk-designee.model';
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

// ─── Temporary mock model — move to clerk-designee.model.ts when ready ────────
export interface ClerkDesignee {
  firstName: string;
  lastName: string | null;
  title: string;
  directPhone: string;
  email: string;
  confirmEmail: string;
  clerkType: string;
}

// ─── TODO: Replace with real options from API or hardcoded list ───────────────
export interface DropdownOption {
  value: string;
  label: string;
}

// ─── Temporary mock data — remove once API is ready ──────────────────────────
const MOCK_CLERK_DESIGNEE: ClerkDesignee = {
  firstName: '',
  lastName: null,
  title: '',
  directPhone: '',
  email: '',
  confirmEmail: '',
  clerkType: '',
};

// ─── Custom validator: confirm email must match email ─────────────────────────
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
  selector: 'app-clerk-designee',
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
  templateUrl: './clerk-designee.component.html',
  styleUrls: ['./designee-shared.component.css'],
})
export class ClerkDesigneeComponent implements OnInit {
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
    this.loadClerkDesignee();
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
        clerkType: ['', Validators.required],
      },
      { validators: emailMatchValidator },
    );
  }

  loadClerkDesignee(): void {
    this.isLoading = true;

    // ── TODO: Replace this mock with your real API call ──────────────────────
    // this.agencyProfileService
    //   .getClerkDesignee(this.organizationId ?? 0)
    //   .subscribe({ next: (data) => this.patchForm(data), error: ... });
    // ─────────────────────────────────────────────────────────────────────────

    of(MOCK_CLERK_DESIGNEE)
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
              methodName: 'loadClerkDesignee',
              className: 'ClerkDesigneeComponent',
              operation: 'getClerkDesignee',
              userId: this.stateService.getUserId(),
            },
          );
        },
      });
  }

  private patchForm(data: ClerkDesignee): void {
    this.form.patchValue(data);
    this.form.markAsPristine();
  }

  onSave(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.isSaving = true;
    const payload: ClerkDesignee = this.form.value;

    // ── TODO: Replace this mock with your real API call ──────────────────────
    // this.agencyProfileService
    //   .saveClerkDesignee(this.organizationId ?? 0, payload)
    //   .subscribe({ next: () => { ... }, error: () => { ... } });
    // ─────────────────────────────────────────────────────────────────────────

    of(null)
      .pipe(delay(800))
      .subscribe({
        next: () => {
          this.isSaving = false;
          this.form.markAsPristine();
          this.snackbar.showSnackbarSuccess(
            'Clerk designee saved successfully.',
          );
          this.cdr.detectChanges();
        },
        error: (err) => {
          this.isSaving = false;
          this.snackbar.showSnackbarError('Failed to save clerk designee.');
          this.loggingService.logException(
            new Error(`HTTP Error ${err.status}: ${err.statusText}`),
            3,
            {
              organizationId: this.organizationId,
              methodName: 'onSave',
              className: 'ClerkDesigneeComponent',
              operation: 'saveClerkDesignee',
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
