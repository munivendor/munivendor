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
  ],
  templateUrl: './offeror-details.component.html',
  styleUrls: ['../../../shared/shared-profile-card.css'],
  encapsulation: ViewEncapsulation.None,
})
export class OfferorOrganizationDetailsComponent implements OnInit {
  @Input() organizationId: number | null = null;
  @Input() states: State[] = [];

  readonly phonePattern = '^\\(\\d{3}\\) \\d{3}-\\d{4}$';
  readonly zipPattern = '^\\d{5}(-\\d{4})?$';
  readonly taxIdPattern = '^\\d{2}-\\d{7}$';

  organizationForm!: FormGroup;
  isLoading = false;
  isSaving = false;
  displayPhone = '';
  displayFax = '';

  entityTypes = [
    { value: 'sole_proprietorship', label: 'Sole Proprietorship' },
    { value: 'partnership', label: 'Partnership' },
    { value: 'llc', label: 'LLC' },
    { value: 'corporation', label: 'Corporation' },
    { value: 's_corporation', label: 'S Corporation' },
    { value: 'nonprofit', label: 'Non-Profit Organization' },
    { value: 'government', label: 'Government Entity' },
    { value: 'other', label: 'Other' },
  ];

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
    if (orgId) {
      this.loadOrganizationInfo(orgId);
    }
  }

  // ── Data Loading ──────────────────────────────────

  private loadOrganizationInfo(organizationId: number): void {
    this.isLoading = true;
    this.offerorProfileService
      .GetOfferorOrganizationDetails(organizationId)
      .subscribe({
        next: (data: OfferorDetails) => {
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
              organizationId,
              methodName: 'loadOfferorOrganizationInfo',
              className: 'OfferorOrganizationInfoComponent',
              operation: 'GetOfferorOrganizationDetails',
              userId: this.stateService.getUserId(),
            },
          );
          this.cdr.detectChanges();
        },
      });
  }

  // ── Form ──────────────────────────────────────────

  private buildForm(): void {
    this.organizationForm = this.fb.group({
      organizationName: ['', Validators.required],
      address: ['', Validators.required],
      address2: [null],
      city: ['', Validators.required],
      stateId: [null, Validators.required],
      country: [''],
      zipCode: ['', [Validators.required, Validators.pattern(this.zipPattern)]],
      incorporationDate: [''],
      entityType: [null],
      timeAtAddress: [''],
      taxId: ['', [Validators.required, Validators.pattern(this.taxIdPattern)]],
      phone: ['', [Validators.required, Validators.pattern(this.phonePattern)]],
      fax: [''],
    });
  }

  private patchForm(data: OfferorDetails): void {
    if (data.phone) this.displayPhone = this.formatPhone(data.phone);
    if (data.fax) this.displayFax = this.formatPhone(data.fax);

    this.organizationForm.patchValue({
      organizationName: data.organizationName,
      address: data.address,
      address2: data.address2 ?? null,
      city: data.city,
      stateId: data.stateId,
      country: data.country ?? '',
      zipCode: data.zipCode,
      incorporationDate: data.incorporationDate ?? '',
      entityType: data.entityType ?? null,
      timeAtAddress: data.timeAtAddress ?? '',
      taxId: data.taxId ? this.formatTaxId(data.taxId) : '',
      phone: this.displayPhone,
      fax: this.displayFax,
    });
    this.organizationForm.markAsPristine();
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
      .get('incorporationDate')
      ?.setValue(formatted, { emitEvent: false });
    this.organizationForm.get('incorporationDate')?.markAsDirty();
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

  // ── Title Case ────────────────────────────────────

  titleCaseField(
    field: 'organizationName' | 'city' | 'address' | 'address2' | 'country',
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

    const { phone, fax, taxId, ...rest } = this.organizationForm.value;
    const orgId = this.organizationId ?? this.stateService.getOrganizationId();

    const payload: OfferorDetails = {
      ...rest,
      phone: phone.replace(/\D/g, ''),
      fax: fax ? fax.replace(/\D/g, '') : null,
      taxId: taxId.replace(/\D/g, ''),
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
          // If this was a new record, store the returned organizationId
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

  isFieldInvalid(field: string): boolean {
    const control = this.organizationForm.get(field);
    return !!(control && control.invalid && (control.dirty || control.touched));
  }
}
