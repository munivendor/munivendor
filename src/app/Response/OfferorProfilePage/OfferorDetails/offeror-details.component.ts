import {
  Component,
  Input,
  OnInit,
  ChangeDetectorRef,
  ViewEncapsulation,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  ReactiveFormsModule,
  FormBuilder,
  FormGroup,
  Validators,
  FormControl,
  AbstractControl,
  ValidationErrors,
} from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { State } from '../../../shared/model/state.model';
import { StateService } from '../../../Request/services/state.service';
import { OfferorProfileService } from '../../services/offeror-profile.service';
import { SnackbarNotificationService } from '../../../shared/service/snackbar-notification.service';
import { LoggingService } from '../../../exceptionhandling/logging.service';
import { OfferorDetails } from '../../model/offeror-details.model';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { map, Observable, startWith } from 'rxjs';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { usPhoneValidator } from '../../../shared/validators/us-phone.validator';
import { formatUsPhoneAsYouType } from '../../../shared/utils/us-phone.util';

/** Rejects strings that are blank or whitespace-only. */
function noWhitespaceValidator(
  control: AbstractControl,
): ValidationErrors | null {
  const val: string = control.value ?? '';
  return val.trim().length === 0 && val.length > 0
    ? { whitespace: true }
    : null;
}

@Component({
  selector: 'app-offeror-details',
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
    MatDatepickerModule,
    MatNativeDateModule,
    MatAutocompleteModule,
  ],
  templateUrl: './offeror-details.component.html',
  styleUrls: ['../../../shared/shared-profile-card.css'],
  encapsulation: ViewEncapsulation.None,
})
export class OfferorOrganizationDetailsComponent implements OnInit {
  @Input() organizationId: number | null = null;
  @Input() states: State[] = [];
  @Input() countries: State[] = [];
  stateFilter = new FormControl<State | null>(null);
  filteredStates$!: Observable<State[]>;

  readonly zipPattern = '^\\d{5}(-\\d{4})?$';
  readonly taxIdPattern = '^\\d{2}-\\d{7}$';
  readonly cityPattern = '^[a-zA-Z\\s\\-\\.]+$';
  readonly maxDate = new Date();

  organizationForm!: FormGroup;
  isLoading = false;
  isSaving = false;

  entityTypes: State[] = [];

  constructor(
    private fb: FormBuilder,
    private cdr: ChangeDetectorRef,
    private stateService: StateService,
    private offerorProfileService: OfferorProfileService,
    private snackbar: SnackbarNotificationService,
    private loggingService: LoggingService,
  ) {}

  ngOnInit(): void {
    this.buildForm();
    const orgId = this.organizationId ?? this.stateService.getOrganizationId();
    this.loadOrganizationSubTypes();
    this.initStateFilter();
    this.loadOrgDetails(orgId);
  }

  // ── Data Loading ──────────────────────────────────

  private initStateFilter(): void {
    this.filteredStates$ = this.stateFilter.valueChanges.pipe(
      startWith(this.stateFilter.value),
      map((val) => {
        const term = typeof val === 'string' ? val : (val?.codeDesc ?? '');
        return this.filterList(this.states, term, ['codeDesc', 'codeName']);
      }),
    );

    this.stateFilter.valueChanges.subscribe((val) => {
      if (!val) {
        this.organizationForm.get('stateId')?.setValue(null);
        this.organizationForm.get('stateId')?.markAsDirty();
      }
    });
  }

  private loadOrgDetails(orgId: number | null): void {
    if (!orgId) {
      this.applyDefaultCountry();
      return;
    }

    this.isLoading = true;
    this.offerorProfileService.GetOfferorOrganizationDetails(orgId).subscribe({
      next: (org) => {
        this.patchForm(org);
        this.isLoading = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.isLoading = false;
        this.loggingService.logException(
          new Error(`HTTP Error ${err.status}: ${err.statusText}`),
          3,
          {
            methodName: 'loadOrgDetails',
            className: 'OfferorOrganizationDetailsComponent',
            userId: this.stateService.getUserId(),
          },
        );
        this.cdr.detectChanges();
      },
    });
  }

  private applyDefaultCountry(): void {
    const usa = this.getDefaultUsa();
    if (usa) {
      this.organizationForm.get('countryId')?.setValue(usa.codeId);
    }

    const nj = this.getDefaultState();
    if (nj) {
      this.organizationForm.get('stateId')?.setValue(nj.codeId);
      this.stateFilter.setValue(nj, { emitEvent: false });
    }
    this.toggleAddressFieldsByCountry(usa?.codeId ?? null);
    this.organizationForm.markAsPristine();
  }

  private getDefaultState(): State | null {
    return (
      this.states.find(
        (s) =>
          s.codeDesc.toLowerCase() === 'new jersey' ||
          s.codeName?.toLowerCase() === 'nj',
      ) ?? null
    );
  }

  // entityType is actually organizationSubTypeId in the backend
  private loadOrganizationSubTypes(): void {
    this.offerorProfileService.GetOrganizationSubTypes().subscribe({
      next: (data) => {
        this.entityTypes = data;
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.loggingService.logException(
          new Error(`HTTP Error ${err.status}: ${err.statusText}`),
          3,
          {
            methodName: 'loadOrganizationSubTypes',
            className: 'OfferorOrganizationDetailsComponent',
            operation: 'GetEntityTypes',
            userId: this.stateService.getUserId(),
          },
        );
      },
    });
  }

  private filterList(
    list: State[],
    term: string,
    fields: (keyof State)[],
  ): State[] {
    const lower = term.toLowerCase();
    return list.filter((item) =>
      fields.some((f) =>
        (item[f] ?? '').toString().toLowerCase().includes(lower),
      ),
    );
  }

  // ── Form ──────────────────────────────────────────

  private buildForm(): void {
    this.organizationForm = this.fb.group({
      organizationName: ['', [Validators.required, noWhitespaceValidator]],
      address: ['', [Validators.required, noWhitespaceValidator]],
      address2: [null],
      city: [
        '',
        [
          Validators.required,
          noWhitespaceValidator,
          Validators.pattern(this.cityPattern),
        ],
      ],
      stateId: [null, Validators.required],
      countryId: [null],
      zipCode: ['', [Validators.required, Validators.pattern(this.zipPattern)]],
      dateOfIncorporation: [null],
      organizationSubTypeId: [null],
      yearsAtCurrentAddress: [null, [Validators.min(0), Validators.max(99)]],
      monthsAtCurrentAddress: [null, [Validators.min(0), Validators.max(11)]],
      taxId: ['', [Validators.pattern(this.taxIdPattern)]],
      phone: ['', [Validators.required, usPhoneValidator()]],
      fax: ['', [usPhoneValidator()]],
    });
  }

  private patchForm(data: OfferorDetails): void {
    const formattedPhone = data.phone ? this.formatPhone(data.phone) : '';
    const formattedFax = data.fax ? this.formatPhone(data.fax) : '';

    const resolvedCountry = data.countryId
      ? (this.countries.find((c) => c.codeId === data.countryId) ??
        this.getDefaultUsa())
      : this.getDefaultUsa();

    this.organizationForm.patchValue({
      organizationName: data.organizationName,
      address: data.address,
      address2: data.address2 ?? null,
      city: data.city,
      stateId: data.stateId,
      countryId: resolvedCountry?.codeId ?? null,
      zipCode: data.zipCode,
      dateOfIncorporation: data.dateOfIncorporation ?? null,
      organizationSubTypeId: data.organizationSubTypeId ?? null,
      yearsAtCurrentAddress: data.yearsAtCurrentAddress ?? null,
      monthsAtCurrentAddress: data.monthsAtCurrentAddress ?? null,
      taxId: data.taxId ? this.formatTaxId(data.taxId) : '',
      phone: formattedPhone,
      fax: formattedFax,
    });

    const state = data.stateId
      ? (this.states.find((s) => s.codeId === data.stateId) ??
        this.getDefaultState())
      : this.getDefaultState();

    if (state) {
      this.organizationForm.get('stateId')?.setValue(state.codeId);
      this.stateFilter.setValue(state, { emitEvent: false });
    }

    const usa = this.getDefaultUsa();
    this.organizationForm.get('countryId')?.setValue(usa?.codeId ?? null);
    this.organizationForm.markAsPristine();
  }

  private getDefaultUsa(): State | null {
    return (
      this.countries.find(
        (c) =>
          c.codeDesc.toLowerCase() === 'united states' ||
          c.codeDesc.toLowerCase() === 'united states of america' ||
          c.codeName?.toLowerCase() === 'us' ||
          c.codeName?.toLowerCase() === 'usa',
      ) ?? null
    );
  }

  // ── Phone ─────────────────────────────────────────

  onPhoneInput(value: string): void {
    const formatted = this.formatPhone(value);
    this.organizationForm
      .get('phone')
      ?.setValue(formatted, { emitEvent: false });
    this.organizationForm.get('phone')?.markAsDirty();
  }

  onFaxInput(value: string): void {
    const formatted = this.formatPhone(value);
    this.organizationForm.get('fax')?.setValue(formatted, { emitEvent: false });
    this.organizationForm.get('fax')?.markAsDirty();
  }
  formatPhone(digits: string): string {
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

  // ── Zip ───────────────────────────────────────────

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

  /**
   * Strips any character that isn't a digit or hyphen, then auto-inserts
   * the hyphen at position 5 when the user has typed all 9 raw digits.
   * This also covers paste events that bypass the keydown guard.
   */
  onZipInput(value: string): void {
    let sanitized = value.replace(/[^\d\-]/g, '');

    const digits = sanitized.replace(/-/g, '');
    if (digits.length >= 6 && !sanitized.includes('-')) {
      sanitized = `${digits.slice(0, 5)}-${digits.slice(5, 9)}`;
    } else if (digits.length > 9) {
      sanitized = `${digits.slice(0, 5)}-${digits.slice(5, 9)}`;
    }

    this.organizationForm
      .get('zipCode')
      ?.setValue(sanitized, { emitEvent: false });
    this.organizationForm.get('zipCode')?.markAsDirty();
    this.organizationForm.get('zipCode')?.updateValueAndValidity();
  }

  // ── Tax ID ────────────────────────────────────────

  formatTaxId(raw: string): string {
    const d = raw.replace(/\D/g, '').slice(0, 9);
    if (d.length <= 2) return d;
    return `${d.slice(0, 2)}-${d.slice(2)}`;
  }

  onTaxIdInput(value: string): void {
    const formatted = this.formatTaxId(value);
    this.organizationForm
      .get('taxId')
      ?.setValue(formatted, { emitEvent: false });
    this.organizationForm.get('taxId')?.markAsDirty();
  }

  onTaxIdKeydown(event: KeyboardEvent): void {
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

  // ── Incorporation Date ────────────────────────────

  onDateInput(value: string): void {
    const d = value.replace(/\D/g, '').slice(0, 8);
    let formatted = d;
    if (d.length > 2 && d.length <= 4)
      formatted = `${d.slice(0, 2)}/${d.slice(2)}`;
    else if (d.length > 4)
      formatted = `${d.slice(0, 2)}/${d.slice(2, 4)}/${d.slice(4)}`;
    this.organizationForm
      .get('dateOfIncorporation')
      ?.setValue(formatted, { emitEvent: false });
    this.organizationForm.get('dateOfIncorporation')?.markAsDirty();
  }

  onDateKeydown(event: KeyboardEvent): void {
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
    if (!/[\d\/]/.test(event.key)) event.preventDefault();
  }

  onDatepickerClosed(): void {
    const activeEl = document.activeElement as HTMLElement;
    activeEl?.blur();
  }

  // ── Title Case ────────────────────────────────────

  titleCaseField(
    field: 'organizationName' | 'city' | 'address' | 'address2' | 'countryId',
  ): void {
    const val = this.organizationForm.get(field)?.value;
    if (val) {
      this.organizationForm.get(field)?.setValue(
        val.trim().replace(/\b\w/g, (c: string) => c.toUpperCase()),
        { emitEvent: false },
      );
    }
  }

  // ── Save ──────────────────────────────────────────

  onSave(): void {
    if (this.organizationForm.invalid) {
      this.organizationForm.markAllAsTouched();
      return;
    }

    this.isSaving = true;

    const {
      phone,
      fax,
      taxId,
      yearsAtCurrentAddress,
      monthsAtCurrentAddress,
      ...rest
    } = this.organizationForm.getRawValue();
    const orgId = this.organizationId ?? this.stateService.getOrganizationId();

    const payload: OfferorDetails = {
      ...rest,
      phone: phone.replace(/\D/g, ''),
      fax: fax ? fax.replace(/\D/g, '') : null,
      taxId: taxId ? taxId.replace(/\D/g, '') : null,
      yearsAtCurrentAddress: yearsAtCurrentAddress ?? null,
      monthsAtCurrentAddress: monthsAtCurrentAddress ?? null,
      dateOfIncorporation: rest.dateOfIncorporation || null,
    };

    this.offerorProfileService
      .SaveOfferorOrganizationDetails(payload, orgId)
      .subscribe({
        next: (response) => {
          this.isSaving = false;
          this.organizationForm.markAsPristine();
          this.snackbar.showSnackbarSuccess(
            'Organization details saved successfully.',
          );
          if (!this.organizationId && response.organizationId) {
            this.organizationId = response.organizationId;
          }
          this.cdr.detectChanges();
        },
        error: (err) => {
          this.isSaving = false;
          this.snackbar.showSnackbarError(
            'Failed to save organization details.',
          );
          this.loggingService.logException(
            new Error(`HTTP Error ${err.status}: ${err.statusText}`),
            3,
            {
              organizationId: orgId,
              methodName: 'onSave',
              className: 'OfferorOrganizationInfoComponent',
              operation: 'SaveOfferorOrganizationDetails',
              userId: this.stateService.getUserId(),
            },
          );
          this.cdr.detectChanges();
        },
      });
  }

  // ── Helpers ───────────────────────────────────────

  isFieldInvalid(field: string): boolean {
    const control = this.organizationForm.get(field);
    return !!(control && control.invalid && (control.dirty || control.touched));
  }

  stateDisplayFn = (state: State | null): string => {
    if (!state) return '';
    return `${state.codeDesc} (${state.codeName})`;
  };
  onStateSelected(state: State): void {
    this.organizationForm.get('stateId')?.setValue(state.codeId);
    this.organizationForm.get('stateId')?.markAsDirty();
    this.organizationForm.get('stateId')?.markAsTouched();
  }
  onStateBlur(): void {
    const currentId = this.organizationForm.get('stateId')?.value;
    const state = currentId
      ? this.states.find((s) => s.codeId === currentId)
      : null;
    this.stateFilter.setValue(state ?? null, { emitEvent: false });
    this.organizationForm.get('stateId')?.markAsTouched();
  }

  displayCountryFn = (countryId: State | null): string => {
    return countryId?.codeDesc ?? '';
  };

  private toggleAddressFieldsByCountry(countryId: number | null): void {
    const usa = this.getDefaultUsa();
    const isUsa = !!usa && countryId === usa.codeId;
    const fields = ['address', 'address2', 'city', 'stateId', 'zipCode'];

    fields.forEach((field) => {
      const control = this.organizationForm.get(field);
      if (!control) return;
      if (isUsa) {
        control.enable();
      } else {
        control.disable();
        control.setValue(null);
      }
    });

    if (isUsa) {
      this.stateFilter.enable();
    } else {
      this.stateFilter.disable();
      this.stateFilter.setValue(null, { emitEvent: false });
    }
  }

  // ── Years / Months at Address ─────────────────────

  onYearsAtAddressInput(value: string): void {
    const digits = value.replace(/\D/g, '');
    let years = digits ? parseInt(digits, 10) : null;
    if (years !== null && years > 99) years = 99;
    this.organizationForm
      .get('yearsAtCurrentAddress')
      ?.setValue(years, { emitEvent: false });
    this.organizationForm.get('yearsAtCurrentAddress')?.markAsDirty();
  }

  onYearsAtAddressKeydown(event: KeyboardEvent): void {
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

  onMonthsAtAddressInput(value: string): void {
    const digits = value.replace(/\D/g, '');
    let months = digits ? parseInt(digits, 10) : null;
    if (months !== null && months > 11) months = 11;
    this.organizationForm
      .get('monthsAtCurrentAddress')
      ?.setValue(months, { emitEvent: false });
    this.organizationForm.get('monthsAtCurrentAddress')?.markAsDirty();
  }

  onMonthsAtAddressKeydown(event: KeyboardEvent): void {
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
}
