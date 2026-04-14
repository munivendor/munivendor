import {
  Component,
  Input,
  OnInit,
  ChangeDetectorRef,
  OnChanges,
} from '@angular/core';
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
import { switchMap } from 'rxjs/operators';
import { AgencyProfileService } from '../../services/agency-profile.service';
import { SnackbarNotificationService } from '../../../shared/service/snackbar-notification.service';
import { LoggingService } from '../../../exceptionhandling/logging.service';
import { StateService } from '../../../Request/services/state.service';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { UserDesignation } from '../../model/user-designation.model';
import { Observable } from 'rxjs';

function emailMatchValidator(group: AbstractControl): ValidationErrors | null {
  const email = group.get('workEmail')?.value;
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
export class LegalDesigneeComponent implements OnInit, OnChanges {
  @Input() organizationId: number | null = null;
  @Input() existingDesignee: UserDesignation | null = null;
  @Input() isLoadingDesignees = false;

  readonly phonePattern = '^\\(\\d{3}\\) \\d{3}-\\d{4}$';
  readonly emailPattern =
    '^[a-zA-Z0-9._%+\\-]+@[a-zA-Z0-9.\\-]+\\.[a-zA-Z]{2,}$';

  form!: FormGroup;
  isSaving = false;
  displayPhone = '';

  constructor(
    private fb: FormBuilder,
    private cdr: ChangeDetectorRef,
    private snackbar: SnackbarNotificationService,
    private loggingService: LoggingService,
    private stateService: StateService,
    private agencyProfileService: AgencyProfileService,
  ) {}

  get isLoading(): boolean {
    return this.isLoadingDesignees;
  }

  ngOnInit(): void {
    this.buildForm();
  }

  ngOnChanges(): void {
    if (this.existingDesignee && this.form) {
      this.patchForm(this.existingDesignee);
    }
  }

  private buildForm(): void {
    this.form = this.fb.group(
      {
        firstName: ['', [Validators.required]],
        lastName: ['', [Validators.required]],
        title: ['', Validators.required],
        workPhoneNumber: [
          '',
          [Validators.required, Validators.pattern(this.phonePattern)],
        ],
        workEmail: [
          '',
          [Validators.required, Validators.pattern(this.emailPattern)],
        ],
        confirmEmail: ['', [Validators.required]],
        receivesEmailSolicitations: [null, Validators.required],
      },
      { validators: emailMatchValidator },
    );
  }

  private patchForm(data: UserDesignation): void {
    if (data.workPhoneNumber) {
      this.displayPhone = this.formatPhoneDisplay(data.workPhoneNumber);
    }
    this.form.patchValue({
      ...data,
      workPhoneNumber: this.displayPhone,
      confirmEmail: data.workEmail ?? '',
    });
    this.form.markAsPristine();
  }

  // — Phone handlers —
  onPhoneInput(value: string): void {
    const digits = value.replace(/\D/g, '').slice(0, 10);
    this.displayPhone = this.formatPhoneDisplay(digits);
    this.form
      .get('workPhoneNumber')
      ?.setValue(this.displayPhone, { emitEvent: false });
  }

  formatPhoneDisplay(digits: string): string {
    const d = digits.replace(/\D/g, '');
    if (d.length === 0) return '';
    if (d.length <= 3) return `(${d}`;
    if (d.length <= 6) return `(${d.slice(0, 3)}) ${d.slice(3)}`;
    return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6, 10)}`;
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

  titleCaseField(field: 'firstName' | 'lastName'): void {
    const val = this.form.get(field)?.value;
    if (val) {
      this.form.get(field)?.setValue(
        val.trim().replace(/\b\w/g, (c: string) => c.toUpperCase()),
        { emitEvent: false },
      );
    }
  }

  onNameKeydown(event: KeyboardEvent): void {
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
    if (!/^[a-zA-Z\s\-'.]$/.test(event.key)) event.preventDefault();
  }

  normalizeEmail(): void {
    const val = this.form.get('workEmail')?.value;
    if (val) {
      this.form
        .get('workEmail')
        ?.setValue(val.trim().toLowerCase(), { emitEvent: false });
    }
  }

  onSave(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.isSaving = true;

    const { confirmEmail, workPhoneNumber, ...formFields } = this.form.value;
    const rawPhone = workPhoneNumber.replace(/\D/g, '');
    const isExistingUser =
      this.existingDesignee != null && this.existingDesignee.userId != null;
    const userPayload = {
      ...formFields,
      workPhoneNumber: rawPhone,
      organizationId: this.organizationId,
      ...(isExistingUser && { userId: this.existingDesignee!.userId }),
    };

    const save$ = (
      isExistingUser
        ? this.agencyProfileService.CreateUser(userPayload)
        : this.agencyProfileService
            .CreateUser(userPayload)
            .pipe(
              switchMap((newUserId: number) =>
                this.agencyProfileService.SaveUserDesignations(newUserId, [1]),
              ),
            )
    ) as Observable<unknown>;

    save$.subscribe({
      next: () => {
        this.isSaving = false;
        this.form.markAsPristine();
        this.snackbar.showSnackbarSuccess('Legal designee saved successfully.');
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
        this.cdr.detectChanges();
      },
    });
  }

  isFieldInvalid(field: string): boolean {
    const control = this.form.get(field);
    return !!(control && control.invalid && (control.dirty || control.touched));
  }
}
