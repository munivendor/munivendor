import {
  Component,
  OnInit,
  ViewEncapsulation,
  ElementRef,
  ViewChild,
  Input,
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
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Observable } from 'rxjs';
import { StateService } from '../../../Request/services/state.service';
import { OfferorProfileService } from '../../services/offeror-profile.service';
import { LoggingService } from '../../../exceptionhandling/logging.service';
import { SnackbarNotificationService } from '../../../shared/service/snackbar-notification.service';
import { OfferorStockholderInfo } from '../../model/offeror-stockholder-info.model';
import { State } from '../../../shared/model/state.model';
import { ChangeDetectorRef } from '@angular/core';

export function noNumbersValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const value = control.value;
    if (!value) return null;
    return /\d/.test(value) ? { hasNumbers: true } : null;
  };
}

export function urlValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const value = control.value;
    if (!value) return null;
    try {
      new URL(value);
      return null;
    } catch {
      return { invalidUrl: true };
    }
  };
}

export function zipCodeValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const value = control.value;
    if (!value) return null;

    return /^\d{5}(-\d{4})?$/.test(value) ? null : { invalidZip: true };
  };
}

/** Rejects strings that are blank or whitespace-only (e.g. "   "). */
export function noWhitespaceValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const val: string = control.value ?? '';
    return val.trim().length === 0 && val.length > 0
      ? { whitespace: true }
      : null;
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

@Component({
  selector: 'app-stockholder-information',
  templateUrl: './stockholder-information.component.html',
  styleUrls: ['./stockholder-information.component.css'],
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
    MatTableModule,
    MatTooltipModule,
  ],
  providers: [
    { provide: ErrorStateMatcher, useClass: TouchedErrorStateMatcher },
  ],
})
export class StockholderInformationComponent implements OnInit {
  @ViewChild('cardTop') cardTop!: ElementRef;

  stockholderForm!: FormGroup;
  isSavingStockholder = false;

  savedStockholders: OfferorStockholderInfo[] = [];
  readonly STOCKHOLDER_TYPE_PERSON = 396;
  readonly STOCKHOLDER_TYPE_ORG = 395;

  readonly tableColumns = [
    'type',
    'name',
    'publiclyTraded',
    'secFiling',
    'address',
    'actions',
  ];

  editingIndex: number | null = null;

  private organizationId: number | null = null;

  // ── Reference data ────────────────────────────────

  @Input() states: State[] = [];
  @Input() countries: State[] = [];
  stockholderTypes: State[] = [];

  constructor(
    private fb: FormBuilder,
    private stateService: StateService,
    private offerorProfileService: OfferorProfileService,
    private loggingService: LoggingService,
    private snackbar: SnackbarNotificationService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.organizationId = this.stateService.getOrganizationId();
    this.buildForm();
    this.subscribeToConditionalFields();
    this.loadStockholderTypes();

    if (this.organizationId) {
      this.loadAllStockholders();
    }
  }

  // ── Form builder ──────────────────────────────────

  private buildForm(): void {
    this.stockholderForm = this.fb.group({
      hasStockholders: [null, Validators.required],
      stockholderTypeId: [null],
      firstName: [null],
      lastName: [null],
      organizationName: [null],
      publiclyTraded: [null],
      secFilingWebsite: [null],
      address: [null],
      address2: [null],
      city: [null],
      stateId: [null],
      zipCode: [null],
      countryId: [null],
    });
  }

  private subscribeToConditionalFields(): void {
    this.stockholderForm
      .get('hasStockholders')
      ?.valueChanges.subscribe((hasStockholders) => {
        this.clearAllStockholderFields(false);
        this.editingIndex = null;

        if (hasStockholders === true) {
          this.stockholderForm
            .get('stockholderTypeId')
            ?.setValidators([Validators.required]);
          this.stockholderForm
            .get('stockholderTypeId')
            ?.updateValueAndValidity({ emitEvent: false });
        }
      });

    this.stockholderForm
      .get('stockholderTypeId')
      ?.valueChanges.subscribe((type) => {
        if (this.isPatchingForm) return;
        this.clearPersonFields(false);
        this.clearOrganizationFields(false);

        const isPerson = type === this.STOCKHOLDER_TYPE_PERSON;
        const isOrg = type === this.STOCKHOLDER_TYPE_ORG;

        if (isPerson) {
          this.setPersonValidators();
        }

        if (isOrg) {
          this.setOrganizationNameValidator();

          const ctrl = this.stockholderForm.get('publiclyTraded');
          ctrl?.setValidators([Validators.required]);
          ctrl?.updateValueAndValidity({ emitEvent: false });
          ctrl?.markAsUntouched();
          ctrl?.markAsPristine();

          this.setAddressValidators();
        }
      });

    this.stockholderForm
      .get('publiclyTraded')
      ?.valueChanges.subscribe((value) => {
        if (this.isPatchingForm) return;
        this.clearSecFilingField(false);

        if (value === true) {
          this.stockholderForm
            .get('secFilingWebsite')
            ?.setValidators([
              Validators.required,
              Validators.maxLength(300),
              urlValidator(),
            ]);
          this.stockholderForm
            .get('secFilingWebsite')
            ?.updateValueAndValidity({ emitEvent: false });
        }
      });
  }

  // ── Validator helpers ─────────────────────────────

  private setPersonValidators(): void {
    ['firstName', 'lastName'].forEach((f) => {
      const ctrl = this.stockholderForm.get(f);
      ctrl?.setValidators([
        Validators.required,
        noWhitespaceValidator(),
        Validators.maxLength(50),
        noNumbersValidator(),
      ]);
      ctrl?.updateValueAndValidity({ emitEvent: false });
      ctrl?.markAsUntouched();
      ctrl?.markAsPristine();
    });
    this.setAddressValidators();
  }

  private setOrganizationNameValidator(): void {
    const ctrl = this.stockholderForm.get('organizationName');
    ctrl?.setValidators([
      Validators.required,
      noWhitespaceValidator(),
      Validators.maxLength(100),
    ]);
    ctrl?.updateValueAndValidity({ emitEvent: false });
    ctrl?.markAsUntouched();
    ctrl?.markAsPristine();
  }

  private setAddressValidators(): void {
    ['address', 'city'].forEach((f) => {
      const ctrl = this.stockholderForm.get(f);
      ctrl?.setValidators([Validators.required, noWhitespaceValidator()]);
      ctrl?.updateValueAndValidity({ emitEvent: false });
      ctrl?.markAsUntouched();
      ctrl?.markAsPristine();
    });

    const stateCtrl = this.stockholderForm.get('stateId');
    stateCtrl?.setValidators([Validators.required]);
    if (!stateCtrl?.value) {
      stateCtrl?.setValue(this.getDefaultNjId(), { emitEvent: false });
    }
    stateCtrl?.updateValueAndValidity({ emitEvent: false });
    stateCtrl?.markAsUntouched();
    stateCtrl?.markAsPristine();

    const zipCtrl = this.stockholderForm.get('zipCode');
    zipCtrl?.setValidators([Validators.required, zipCodeValidator()]);
    zipCtrl?.updateValueAndValidity({ emitEvent: false });
    zipCtrl?.markAsUntouched();
    zipCtrl?.markAsPristine();
  }

  // ── Clear helpers ─────────────────────────────────

  /**
   * Clears all stockholder detail fields when the user switches
   * hasStockholders to No.
   */
  private clearAllStockholderFields(emitEvent = true): void {
    [
      'stockholderTypeId',
      'firstName',
      'lastName',
      'organizationName',
      'publiclyTraded',
      'secFilingWebsite',
      'address',
      'address2',
      'city',
      'stateId',
      'zipCode',
    ].forEach((f) => this.resetControl(f, null, emitEvent));
    this.resetControl('countryId', this.getDefaultUsaId(), emitEvent);
  }

  private clearPersonFields(emitEvent = true): void {
    ['firstName', 'lastName'].forEach((f) =>
      this.resetControl(f, null, emitEvent),
    );
    this.clearAddressFields(emitEvent);
  }

  private clearOrganizationFields(emitEvent = true): void {
    [
      'organizationName',
      'publiclyTraded',
      'secFilingWebsite',
      'address',
      'address2',
      'city',
      'stateId',
      'zipCode',
    ].forEach((f) => this.resetControl(f, null, emitEvent));
    this.resetControl('countryId', this.getDefaultUsaId(), emitEvent);
  }

  private clearSecFilingField(emitEvent = true): void {
    this.resetControl('secFilingWebsite', null, emitEvent);
  }

  private clearAddressFields(emitEvent = true): void {
    ['address', 'address2', 'city', 'zipCode'].forEach((f) =>
      this.resetControl(f, null, emitEvent),
    );
    this.resetControl('stateId', this.getDefaultNjId(), emitEvent);
    this.resetControl('countryId', this.getDefaultUsaId(), emitEvent);
  }

  private resetControl(
    name: string,
    value: any = null,
    emitEvent = true,
  ): void {
    const ctrl = this.stockholderForm.get(name);
    ctrl?.clearValidators();
    ctrl?.setValue(value, { emitEvent });
    ctrl?.updateValueAndValidity({ emitEvent });
    ctrl?.markAsUntouched();
    ctrl?.markAsPristine();
  }

  // ── Load ──────────────────────────────────────────

  private loadStockholderTypes(): void {
    this.offerorProfileService.GetStockholderTypes().subscribe({
      next: (types) => (this.stockholderTypes = types),
      error: (err) => {
        this.loggingService.logException(
          new Error(`HTTP Error ${err.status}: ${err.statusText}`),
          3,
          {
            organizationId: this.organizationId,
            methodName: 'loadStockholderTypes',
            className: 'StockholderInformationComponent',
            operation: 'GetStockholderTypes',
            userId: this.stateService.getUserId(),
          },
        );
      },
    });
  }

  loadAllStockholders(): void {
    this.offerorProfileService
      .GetAllStockholderInfo(this.organizationId!)
      .subscribe({
        next: (data: OfferorStockholderInfo[]) => {
          this.savedStockholders = data ?? [];

          // If records exist, pre-select Yes for the ownership question
          if (this.savedStockholders.length > 0) {
            this.stockholderForm
              .get('hasStockholders')
              ?.setValue(true, { emitEvent: false });
            this.stockholderForm
              .get('stockholderTypeId')
              ?.setValidators([Validators.required]);
            this.stockholderForm
              .get('stockholderTypeId')
              ?.updateValueAndValidity({ emitEvent: false });
            this.stockholderForm.get('stockholderTypeId')?.markAsUntouched();
            this.stockholderForm.get('stockholderTypeId')?.markAsPristine();
            this.stockholderForm.markAsPristine();
          }
        },
        error: (err) => {
          this.loggingService.logException(
            new Error(`HTTP Error ${err.status}: ${err.statusText}`),
            3,
            {
              organizationId: this.organizationId,
              methodName: 'loadAllStockholders',
              className: 'StockholderInformationComponent',
              operation: 'GetAllStockholderInfo',
              userId: this.stateService.getUserId(),
            },
          );
        },
      });
  }

  // ── Save / Update ─────────────────────────────────

  onSaveStockholder(): void {
    const hasStockholders = this.stockholderForm.get('hasStockholders')?.value;
    if (hasStockholders === false) {
      this.stockholderForm.markAsPristine();
      this.snackbar.showSnackbarSuccess('Stockholder information saved.');
      return;
    }

    if (this.stockholderForm.invalid) {
      this.stockholderForm.markAllAsTouched();
      return;
    }

    this.isSavingStockholder = true;

    const payload = this.buildPayload();
    const isEdit = this.editingIndex !== null;
    const existingId = isEdit
      ? this.savedStockholders[this.editingIndex!].stockholderId
      : null;

    const request$: Observable<any> =
      existingId !== null && existingId !== undefined
        ? this.offerorProfileService.UpdateStockholderInfo(
            this.organizationId!,
            existingId,
            payload,
          )
        : this.offerorProfileService.CreateStockholderInfo(
            this.organizationId!,
            payload,
          );

    request$.subscribe({
      next: (response) => {
        this.isSavingStockholder = false;

        if (isEdit) {
          this.savedStockholders[this.editingIndex!] = {
            ...payload,
            stockholderId: existingId!,
          };
          this.savedStockholders = [...this.savedStockholders];
          this.snackbar.showSnackbarSuccess(
            'Stockholder updated successfully.',
          );
          this.editingIndex = null;
        } else {
          const newId = (response as { retStockholderId: number })
            .retStockholderId;
          this.savedStockholders = [
            ...this.savedStockholders,
            { ...payload, stockholderId: newId },
          ];
          this.snackbar.showSnackbarSuccess('Stockholder saved successfully.');
        }

        // Reset form fields below hasStockholders, keep Yes selected
        this.resetEntryFields();
      },
      error: (err) => {
        this.isSavingStockholder = false;
        this.snackbar.showSnackbarError(
          'Failed to save stockholder information.',
        );
        this.loggingService.logException(
          new Error(`HTTP Error ${err.status}: ${err.statusText}`),
          3,
          {
            organizationId: this.organizationId,
            methodName: 'onSaveStockholder',
            className: 'StockholderInformationComponent',
            operation: existingId
              ? 'UpdateStockholderInfo'
              : 'CreateStockholderInfo',
            userId: this.stateService.getUserId(),
          },
        );
      },
    });
  }

  private buildPayload(): OfferorStockholderInfo {
    const v = this.stockholderForm.value;
    const isPerson = v.stockholderTypeId === this.STOCKHOLDER_TYPE_PERSON;
    const isOrg = v.stockholderTypeId === this.STOCKHOLDER_TYPE_ORG;
    const isPubliclyTraded = v.publiclyTraded === true;

    return {
      stockholderId: 0,
      organizationId: this.organizationId,
      stockholderTypeId: v.stockholderTypeId,
      firstName: isPerson ? v.firstName : null,
      lastName: isPerson ? v.lastName : null,
      organizationName: isOrg ? v.organizationName : null,
      publiclyTraded: isOrg ? v.publiclyTraded : null,
      secFilingWebsite: isOrg && isPubliclyTraded ? v.secFilingWebsite : null,
      // Address always included for org and for person
      address: isPerson || isOrg ? v.address : null,
      address2: isPerson || isOrg ? v.address2 : null,
      city: isPerson || isOrg ? v.city : null,
      stateId: isPerson || isOrg ? v.stateId : null,
      zipCode: isPerson || isOrg ? v.zipCode : null,
      countryId: isPerson || isOrg ? v.countryId : null,
    };
  }

  // ── Table actions ─────────────────────────────────

  private isPatchingForm = false;

  editStockholder(index: number): void {
    this.isPatchingForm = true;
    this.patchFormFromEntry(this.savedStockholders[index]);
    this.isPatchingForm = false;
    this.editingIndex = index;
    this.stockholderForm.markAsDirty();
    this.cdr.detectChanges();
    this.scrollToTop();
  }

  removeStockholder(index: number): void {
    console.log('Removing stockholder at index', index);
    const entry = this.savedStockholders[index];
    if (!entry.stockholderId) {
      this.savedStockholders = this.savedStockholders.filter(
        (_, i) => i !== index,
      );
      return;
    }

    this.offerorProfileService
      .DeleteStockholderInfo(entry.stockholderId)
      .subscribe({
        next: () => {
          this.savedStockholders = this.savedStockholders.filter(
            (_, i) => i !== index,
          );
          this.snackbar.showSnackbarSuccess('Stockholder removed.');
        },
        error: (err) => {
          this.snackbar.showSnackbarError('Failed to remove stockholder.');
          this.loggingService.logException(
            new Error(`HTTP Error ${err.status}: ${err.statusText}`),
            3,
            {
              organizationId: this.organizationId,
              methodName: 'removeStockholder',
              className: 'StockholderInformationComponent',
              operation: 'DeleteStockholderInfo',
              userId: this.stateService.getUserId(),
            },
          );
        },
      });
  }

  cancelEdit(): void {
    this.editingIndex = null;
    this.resetEntryFields();
  }

  // ── Helpers ───────────────────────────────────────

  /**
   * Resets only the stockholder detail fields (below hasStockholders),
   * leaving the Yes/No answer intact.
   */
  private resetEntryFields(): void {
    this.clearAllStockholderFields(false);
    // Re-apply required validator on stockholderTypeId since hasStockholders = Yes
    this.stockholderForm
      .get('stockholderTypeId')
      ?.setValidators([Validators.required]);
    this.stockholderForm
      .get('stockholderTypeId')
      ?.updateValueAndValidity({ emitEvent: false });
    this.stockholderForm.get('stockholderTypeId')?.markAsUntouched();
    this.stockholderForm.get('stockholderTypeId')?.markAsPristine();
    this.stockholderForm.markAsPristine();
    this.stockholderForm.markAsUntouched();
  }

  private patchFormFromEntry(entry: OfferorStockholderInfo): void {
    this.stockholderForm.patchValue({
      hasStockholders: true,
      stockholderTypeId: entry.stockholderTypeId,
      firstName: entry.firstName,
      lastName: entry.lastName,
      organizationName: entry.organizationName,
      publiclyTraded: entry.publiclyTraded,
      secFilingWebsite: entry.secFilingWebsite,
      address: entry.address,
      address2: entry.address2,
      city: entry.city,
      stateId: entry.stateId,
      zipCode: entry.zipCode,
      countryId: entry.countryId ?? this.getDefaultUsaId(),
    });
  }

  private scrollToTop(): void {
    this.cardTop?.nativeElement?.scrollIntoView({
      behavior: 'smooth',
      block: 'start',
    });
  }

  getDisplayName(entry: OfferorStockholderInfo): string {
    if (entry.stockholderTypeId === this.STOCKHOLDER_TYPE_PERSON) {
      return [entry.firstName, entry.lastName].filter(Boolean).join(' ') || '—';
    }
    return entry.organizationName || '—';
  }

  getDisplayAddress(entry: OfferorStockholderInfo): string {
    const stateLabel =
      this.states.find(
        (s) => s.codeId?.toString() === entry.stateId?.toString(),
      )?.codeDesc ?? null;
    const countryLabel =
      this.countries.find(
        (c) => c.codeId?.toString() === entry.countryId?.toString(),
      )?.codeDesc ?? null;

    const parts = [
      entry.address,
      entry.address2,
      entry.city,
      stateLabel,
      entry.zipCode,
      countryLabel,
    ].filter(Boolean);

    return parts.join(', ') || '—';
  }

  isFieldInvalid(field: string): boolean {
    const control = this.stockholderForm.get(field);
    return !!(control && control.invalid && (control.dirty || control.touched));
  }

  // ── Input transformers ────────────────────────────────────────────────────────

  /** Auto-capitalizes first letter, strips digits */
  capitalizeInput(event: Event, controlName: string): void {
    const input = event.target as HTMLInputElement;
    let value = input.value.replace(/[0-9]/g, '');
    if (value.length > 0) {
      value = value.charAt(0).toUpperCase() + value.slice(1);
    }
    input.value = value;
    this.stockholderForm
      .get(controlName)
      ?.setValue(value, { emitEvent: false });
    this.stockholderForm.get(controlName)?.updateValueAndValidity();
  }

  /** Strips non-numeric/hyphen characters from ZIP, auto-formats */
  formatZipCode(event: Event): void {
    const input = event.target as HTMLInputElement;
    let value = input.value.replace(/[^0-9-]/g, '');

    if (value.length > 5 && !value.includes('-')) {
      value = value.slice(0, 5) + '-' + value.slice(5, 9);
    } else if (value.length > 9) {
      value = value.slice(0, 10);
    }

    input.value = value;
    this.stockholderForm.get('zipCode')?.setValue(value, { emitEvent: false });
    this.stockholderForm.get('zipCode')?.updateValueAndValidity();
  }

  /** Trims whitespace on blur */
  trimOnBlur(controlName: string): void {
    const ctrl = this.stockholderForm.get(controlName);
    const trimmed = ctrl?.value?.trim();
    if (trimmed !== ctrl?.value) {
      ctrl?.setValue(trimmed);
    }
  }

  private getDefaultUsaId(): number | null {
    return (
      this.countries.find(
        (c) =>
          c.codeName?.toLowerCase() === 'us' ||
          c.codeName?.toLowerCase() === 'usa' ||
          c.codeDesc.toLowerCase() === 'united states' ||
          c.codeDesc.toLowerCase() === 'united states of america',
      )?.codeId ?? null
    );
  }

  private getDefaultNjId(): number | null {
    return (
      this.states.find(
        (s) =>
          s.codeName?.toLowerCase() === 'nj' ||
          s.codeDesc.toLowerCase() === 'new jersey',
      )?.codeId ?? null
    );
  }
}
