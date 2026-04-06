import {
  Component,
  OnInit,
  ViewEncapsulation,
  ElementRef,
  ViewChild,
  Input,
  ChangeDetectorRef,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
  FormGroupDirective,
  NgForm,
  FormControl,
  AbstractControl,
  ValidationErrors,
  ValidatorFn,
} from '@angular/forms';
import { ErrorStateMatcher } from '@angular/material/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { PhonePipe } from '../../../shared/pipes/phone.pipe';
import { StateService } from '../../../Request/services/state.service';
import { OfferorProfileService } from '../../services/offeror-profile.service';
import { LoggingService } from '../../../exceptionhandling/logging.service';
import { SnackbarNotificationService } from '../../../shared/service/snackbar-notification.service';
import { State } from '../../../shared/model/state.model';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatSortModule, MatSort } from '@angular/material/sort';
import { MatPaginatorModule, MatPaginator } from '@angular/material/paginator';
import { AfterViewInit } from '@angular/core';

// ── Custom validators ──────────────────────────────────────────────────────────

export function noNumbersValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const value = control.value;
    if (!value) return null;
    return /\d/.test(value) ? { hasNumbers: true } : null;
  };
}

export function emailMatchValidator(
  group: AbstractControl,
): ValidationErrors | null {
  const email = group.get('email')?.value?.trim().toLowerCase();
  const confirm = group.get('confirmEmail')?.value?.trim().toLowerCase();
  if (!email || !confirm) return null;
  return email === confirm ? null : { emailMismatch: true };
}

export function zipCodeValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const value = control.value;
    if (!value) return null;
    return /^\d{5}(-\d{4})?$/.test(value) ? null : { invalidZip: true };
  };
}

export class TouchedErrorStateMatcher implements ErrorStateMatcher {
  isErrorState(
    control: FormControl | null,
    form: FormGroupDirective | NgForm | null,
  ): boolean {
    return !!(control && control.invalid && control.touched);
  }
}

export interface AuthorizingOfficial {
  offerorAuthorizingOfficialId?: number;
  organizationId: number;
  firstName: string;
  lastName: string;
  title: string;
  email: string;
  phone?: string | null;
  notarizationCountyId?: number | null;
  address?: string | null;
  address2?: string | null;
  city?: string | null;
  stateId?: string | null;
  zipCode?: string | null;
  digitalSignatureConsented?: boolean | null;
  bestTimeToCallId?: number | null;
}

@Component({
  selector: 'app-authorizing-officials',
  templateUrl: './authorizing-officials.component.html',
  styleUrls: ['./authorizing-officials.component.css'],
  encapsulation: ViewEncapsulation.None,
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatCheckboxModule,
    MatFormFieldModule,
    MatSelectModule,
    MatIconModule,
    MatInputModule,
    MatProgressSpinnerModule,
    MatTableModule,
    MatTooltipModule,
    PhonePipe,
    MatSortModule,
    MatPaginatorModule,
  ],
  providers: [
    { provide: ErrorStateMatcher, useClass: TouchedErrorStateMatcher },
  ],
})
export class AuthorizingOfficialsComponent implements OnInit {
  @ViewChild('cardTop') cardTop!: ElementRef;

  officialForm!: FormGroup;
  isSaving = false;
  isLoading = false;

  dataSource = new MatTableDataSource<AuthorizingOfficial>([]);

  @ViewChild(MatSort) sort!: MatSort;
  @ViewChild(MatPaginator) paginator!: MatPaginator;

  get savedOfficials(): AuthorizingOfficial[] {
    return this.dataSource.data;
  }

  readonly tableColumns = ['name', 'title', 'email', 'phone', 'actions'];

  private organizationId: number | null = null;

  editingIndex: number | null = null;
  private isPatchingForm = false;

  // ── Display phone ─────────────────────────────────────────────────────────
  displayPhone = '';

  // ── Reference data ────────────────────────────────────────────────────────
  @Input() states: State[] = [];
  @Input() counties: State[] = [];
  bestTimeOptions: State[] = [];

  readonly emailPattern = /^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/;
  readonly phonePattern = /^\(\d{3}\) \d{3}-\d{4}$/;

  constructor(
    private fb: FormBuilder,
    private stateService: StateService,
    private offerorProfileService: OfferorProfileService,
    private loggingService: LoggingService,
    private snackbar: SnackbarNotificationService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngAfterViewInit(): void {
    this.dataSource.sort = this.sort;
    this.dataSource.paginator = this.paginator;
    this.dataSource.sortingDataAccessor = (item, property) => {
      switch (property) {
        case 'name':
          return `${item.firstName} ${item.lastName}`.toLowerCase();
        case 'title':
          return item.title?.toLowerCase() ?? '';
        case 'email':
          return item.email?.toLowerCase() ?? '';
        case 'phone':
          return item.phone ?? '';
        default:
          return '';
      }
    };
  }

  ngOnInit(): void {
    this.organizationId = this.stateService.getOrganizationId();
    this.buildForm();
    this.loadTimeOptions();
    if (this.organizationId) {
      this.loadOfficials();
    }
  }

  // ── Form ──────────────────────────────────────────────────────────────────

  private buildForm(): void {
    this.officialForm = this.fb.group(
      {
        firstName: [
          null,
          [Validators.required, Validators.maxLength(50), noNumbersValidator()],
        ],
        lastName: [
          null,
          [Validators.required, Validators.maxLength(50), noNumbersValidator()],
        ],
        title: [null, [Validators.required, Validators.maxLength(100)]],
        notarizationCountyId: [null, Validators.required],
        address: [null, Validators.required],
        address2: [null],
        city: [null, Validators.required],
        stateId: [null, Validators.required],
        zipCode: [null, [Validators.required, zipCodeValidator()]],
        email: [
          null,
          [
            Validators.required,
            Validators.maxLength(255),
            Validators.pattern(this.emailPattern),
          ],
        ],
        confirmEmail: [null, [Validators.required]],
        phone: [null, [Validators.pattern(this.phonePattern)]],
        bestTimeToCallId: [null, Validators.required],
        digitalSignatureConsented: [false],
      },
      { validators: emailMatchValidator },
    );
  }

  // ── Input handlers ────────────────────────────────────────────────────────

  capitalizeInput(event: Event, controlName: string): void {
    const input = event.target as HTMLInputElement;
    let value = input.value.replace(/[0-9]/g, '');
    if (value.length > 0) {
      value = value.charAt(0).toUpperCase() + value.slice(1);
    }
    input.value = value;
    this.officialForm.get(controlName)?.setValue(value, { emitEvent: false });
    this.officialForm.get(controlName)?.updateValueAndValidity();
  }

  trimOnBlur(controlName: string): void {
    const ctrl = this.officialForm.get(controlName);
    const trimmed = ctrl?.value?.trim();
    if (trimmed !== ctrl?.value) ctrl?.setValue(trimmed);
  }

  normalizeEmail(): void {
    const ctrl = this.officialForm.get('email');
    if (ctrl?.value) ctrl.setValue(ctrl.value.trim().toLowerCase());
    this.officialForm.get('confirmEmail')?.updateValueAndValidity();
  }

  normalizeConfirmEmail(): void {
    const ctrl = this.officialForm.get('confirmEmail');
    if (ctrl?.value) ctrl.setValue(ctrl.value.trim().toLowerCase());
  }

  onPhoneInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    const digits = input.value.replace(/\D/g, '').slice(0, 10);
    const formatted = this.formatPhoneDisplay(digits);
    this.displayPhone = formatted;
    input.value = formatted;
    this.officialForm.get('phone')?.setValue(formatted, { emitEvent: false });
    this.officialForm.get('phone')?.updateValueAndValidity();
    this.officialForm.get('phone')?.markAsDirty();
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

  formatPhoneDisplay(digits: string): string {
    const d = digits.replace(/\D/g, '');
    if (d.length === 0) return '';
    if (d.length <= 3) return `(${d}`;
    if (d.length <= 6) return `(${d.slice(0, 3)}) ${d.slice(3)}`;
    return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6, 10)}`;
  }

  formatZipCode(event: Event): void {
    const input = event.target as HTMLInputElement;
    let value = input.value.replace(/[^0-9-]/g, '');
    if (value.length > 5 && !value.includes('-')) {
      value = value.slice(0, 5) + '-' + value.slice(5, 9);
    } else if (value.length > 10) {
      value = value.slice(0, 10);
    }
    input.value = value;
    this.officialForm.get('zipCode')?.setValue(value, { emitEvent: false });
    this.officialForm.get('zipCode')?.updateValueAndValidity();
  }

  // ── Load ──────────────────────────────────────────────────────────────────

  private loadTimeOptions(): void {
    this.offerorProfileService.GetTimeOptions().subscribe({
      next: (options) => (this.bestTimeOptions = options),
      error: (err) => {
        this.loggingService.logException(
          new Error(`HTTP Error ${err.status}: ${err.statusText}`),
          3,
          {
            organizationId: this.organizationId,
            methodName: 'loadTimeOptions',
            className: 'AuthorizingOfficialsComponent',
            operation: 'GetTimeOptions',
            userId: this.stateService.getUserId(),
          },
        );
      },
    });
  }

  private loadOfficials(): void {
    this.isLoading = true;
    this.offerorProfileService
      .GetOfferorAuthorizingOfficials(this.organizationId!)
      .subscribe({
        next: (data: AuthorizingOfficial[]) => {
          this.dataSource.data = data ?? [];

          this.isLoading = false;
          this.cdr.detectChanges();
          this.dataSource.paginator = this.paginator;
          this.dataSource.sort = this.sort;
        },
        error: (err) => {
          this.isLoading = false;
          this.loggingService.logException(
            new Error(`HTTP Error ${err.status}: ${err.statusText}`),
            3,
            {
              organizationId: this.organizationId,
              methodName: 'loadOfficials',
              className: 'AuthorizingOfficialsComponent',
              operation: 'GetOfferorAuthorizingOfficials',
              userId: this.stateService.getUserId(),
            },
          );
        },
      });
  }

  // ── Save ──────────────────────────────────────────────────────────────────

  onSave(): void {
    this.officialForm.markAllAsTouched();
    if (this.officialForm.invalid) return;

    this.isSaving = true;
    const payload = this.buildPayload();
    const isEdit = this.editingIndex !== null;
    const existingId = isEdit
      ? this.savedOfficials[this.editingIndex!].offerorAuthorizingOfficialId
      : null;

    if (isEdit && !existingId) {
      this.isSaving = false;
      this.snackbar.showSnackbarError('Unable to update: missing record ID.');
      return;
    }

    const request$ = isEdit
      ? this.offerorProfileService.UpdateOfferorAuthorizingOfficial(
          existingId!,
          payload,
        )
      : this.offerorProfileService.SaveOfferorAuthorizingOfficial(payload);

    request$.subscribe({
      next: (_response) => {
        this.isSaving = false;
        this.snackbar.showSnackbarSuccess(
          isEdit
            ? 'Authorizing official updated successfully.'
            : 'Authorizing official added successfully.',
        );
        if (isEdit) this.editingIndex = null;
        this.loadOfficials();
        this.resetForm();
      },
      error: (err) => {
        this.isSaving = false;
        this.snackbar.showSnackbarError('Failed to save authorizing official.');
        this.loggingService.logException(
          new Error(`HTTP Error ${err.status}: ${err.statusText}`),
          3,
          {
            organizationId: this.organizationId,
            methodName: 'onSave',
            className: 'AuthorizingOfficialsComponent',
            operation: isEdit
              ? 'UpdateOfferorAuthorizingOfficial'
              : 'SaveOfferorAuthorizingOfficial',
            userId: this.stateService.getUserId(),
          },
        );
      },
    });
  }

  editOfficial(index: number): void {
    this.isPatchingForm = true;
    this.patchFormFromEntry(this.dataSource.data[index]);
    this.isPatchingForm = false;
    this.editingIndex = index;
    this.officialForm.markAsDirty();
    this.cdr.detectChanges();
    this.scrollToTop();
  }

  cancelEdit(): void {
    this.editingIndex = null;
    this.resetForm();
  }

  private patchFormFromEntry(entry: AuthorizingOfficial): void {
    this.officialForm.patchValue({
      firstName: entry.firstName,
      lastName: entry.lastName,
      title: entry.title,
      notarizationCountyId: entry.notarizationCountyId,
      address: entry.address,
      address2: entry.address2,
      city: entry.city,
      stateId: entry.stateId,
      zipCode: entry.zipCode,
      email: entry.email,
      confirmEmail: entry.email,
      phone: entry.phone ?? null,
      bestTimeToCallId: entry.bestTimeToCallId,
      digitalSignatureConsented: entry.digitalSignatureConsented ?? false,
    });

    if (entry.phone) {
      this.displayPhone = this.formatPhoneDisplay(
        entry.phone.replace(/\D/g, ''),
      );
    } else {
      this.displayPhone = '';
    }
  }

  private buildPayload(): AuthorizingOfficial {
    const v = this.officialForm.value;
    return {
      organizationId: this.organizationId!,
      firstName: v.firstName,
      lastName: v.lastName,
      title: v.title,
      email: v.email,
      phone: v.phone ? v.phone.replace(/\D/g, '') : null,
      notarizationCountyId: v.notarizationCountyId,
      address: v.address,
      address2: v.address2 || null,
      city: v.city,
      stateId: v.stateId,
      zipCode: v.zipCode,
      bestTimeToCallId: v.bestTimeToCallId,
      digitalSignatureConsented: v.digitalSignatureConsented ?? false,
    };
  }

  private resetForm(): void {
    this.officialForm.reset({ digitalSignatureConsented: false });
    this.displayPhone = '';
    this.officialForm.markAsPristine();
    this.officialForm.markAsUntouched();
    this.scrollToTop();
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  get confirmEmailMismatch(): boolean {
    return !!(
      this.officialForm.errors?.['emailMismatch'] &&
      this.officialForm.get('confirmEmail')?.touched
    );
  }

  isFieldInvalid(field: string): boolean {
    const control = this.officialForm.get(field);
    return !!(control && control.invalid && (control.dirty || control.touched));
  }

  getDisplayAddress(entry: AuthorizingOfficial): string {
    const stateLabel =
      this.states.find(
        (s) => s.codeId?.toString() === entry.stateId?.toString(),
      )?.codeDesc ?? null;
    const parts = [
      entry.address,
      entry.address2,
      entry.city,
      stateLabel,
      entry.zipCode,
    ].filter(Boolean);
    return parts.join(', ') || '—';
  }

  private scrollToTop(): void {
    this.cardTop?.nativeElement?.scrollIntoView({
      behavior: 'smooth',
      block: 'start',
    });
  }
}
