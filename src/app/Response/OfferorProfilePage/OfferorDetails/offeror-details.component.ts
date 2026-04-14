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
  countryFilter = new FormControl<State | null>(null, Validators.required);
  filteredStates$!: Observable<State[]>;
  filteredCountries$!: Observable<State[]>;

  readonly phonePattern = '^\\(\\d{3}\\) \\d{3}-\\d{4}$';
  readonly zipPattern = '^\\d{5}(-\\d{4})?$';
  readonly taxIdPattern = '^\\d{2}-\\d{7}$';

  organizationForm!: FormGroup;
  isLoading = false;
  isSaving = false;
  displayPhone = '';
  displayFax = '';

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
    this.initCountryFilter();
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

  private initCountryFilter(): void {
    this.filteredCountries$ = this.countryFilter.valueChanges.pipe(
      startWith(this.countryFilter.value),
      map((val) => {
        const term = typeof val === 'string' ? val : (val?.codeDesc ?? '');

        if (!val) {
          this.organizationForm.get('countryId')?.setValue(null);
          this.organizationForm.get('countryId')?.markAsDirty();
        }

        return this.filterList(this.countries, term, ['codeDesc', 'codeName']);
      }),
    );
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
      this.countryFilter.setValue(usa, { emitEvent: false });
    }

    const nj = this.getDefaultState();
    if (nj) {
      this.organizationForm.get('stateId')?.setValue(nj.codeId);
      this.stateFilter.setValue(nj, { emitEvent: false });
    }

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
      organizationName: ['', Validators.required],
      address: ['', Validators.required],
      address2: [null],
      city: ['', Validators.required],
      stateId: [null, Validators.required],
      countryId: [null],
      zipCode: ['', [Validators.required, Validators.pattern(this.zipPattern)]],
      dateOfIncorporation: [''],
      organizationSubTypeId: [null],
      yearsAtCurrentAddress: [null],
      monthsAtCurrentAddress: [null],
      taxId: ['', [Validators.required, Validators.pattern(this.taxIdPattern)]],
      phone: ['', [Validators.required, Validators.pattern(this.phonePattern)]],
      fax: [''],
    });
  }

  private patchForm(data: OfferorDetails): void {
    if (data.phone) this.displayPhone = this.formatPhone(data.phone);
    if (data.fax) this.displayFax = this.formatPhone(data.fax);

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
      dateOfIncorporation: data.dateOfIncorporation ?? '',
      organizationSubTypeId: data.organizationSubTypeId ?? null,
      yearsAtCurrentAddress: data.yearsAtCurrentAddress ?? null,
      monthsAtCurrentAddress: data.monthsAtCurrentAddress ?? null,
      taxId: data.taxId ? this.formatTaxId(data.taxId) : '',
      phone: this.displayPhone,
      fax: this.displayFax,
    });

    const state = data.stateId
      ? (this.states.find((s) => s.codeId === data.stateId) ??
        this.getDefaultState())
      : this.getDefaultState();

    if (state) {
      this.organizationForm.get('stateId')?.setValue(state.codeId);
      this.stateFilter.setValue(state, { emitEvent: false });
    }

    if (resolvedCountry) {
      this.countryFilter.setValue(resolvedCountry, { emitEvent: false });
    }

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
    this.displayPhone = this.formatPhone(value);
    this.organizationForm
      .get('phone')
      ?.setValue(this.displayPhone, { emitEvent: false });
    this.organizationForm.get('phone')?.markAsDirty();
  }

  onFaxInput(value: string): void {
    this.displayFax = this.formatPhone(value);
    this.organizationForm
      .get('fax')
      ?.setValue(this.displayFax, { emitEvent: false });
    this.organizationForm.get('fax')?.markAsDirty();
  }

  formatPhone(digits: string): string {
    const d = digits.replace(/\D/g, '').slice(0, 10);
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
    } = this.organizationForm.value;
    const orgId = this.organizationId ?? this.stateService.getOrganizationId();

    const payload: OfferorDetails = {
      ...rest,
      phone: phone.replace(/\D/g, ''),
      fax: fax ? fax.replace(/\D/g, '') : null,
      taxId: taxId.replace(/\D/g, ''),
      yearsAtCurrentAddress: yearsAtCurrentAddress ?? null,
      monthsAtCurrentAddress: monthsAtCurrentAddress ?? null,
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

  onCountryBlur(): void {
    const current = this.organizationForm.get('countryId')?.value;
    const country = current
      ? this.countries.find((c) => c.codeId === current)
      : null;
    this.countryFilter.setValue(country ?? null, { emitEvent: false });
    this.countryFilter.markAsTouched();
  }

  displayCountryFn = (countryId: State | null): string => {
    return countryId?.codeDesc ?? '';
  };

  onCountrySelected(countryId: State): void {
    this.organizationForm.get('countryId')?.setValue(countryId.codeId);
    this.organizationForm.get('countryId')?.markAsDirty();
  }

  // ── Years / Months at Address ─────────────────────

  onYearsAtAddressInput(value: string): void {
    const digits = value.replace(/\D/g, '');
    this.organizationForm
      .get('yearsAtCurrentAddress')
      ?.setValue(digits ? parseInt(digits, 10) : null, { emitEvent: false });
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
