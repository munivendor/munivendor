import {
  Component,
  OnInit,
  ViewEncapsulation,
  ElementRef,
  ViewChild,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
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

@Component({
  selector: 'app-stockholder-information',
  templateUrl: './stockholder-information.component.html',
  styleUrls: [
    '../../../shared/shared-profile-card.css',
    './stockholder-information.component.css',
  ],
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
})
export class StockholderInformationComponent implements OnInit {
  @ViewChild('cardTop') cardTop!: ElementRef;

  stockholderForm!: FormGroup;
  isSavingStockholder = false;

  savedStockholders: OfferorStockholderInfo[] = [];

  readonly tableColumns = [
    'index',
    'type',
    'name',
    'publiclyTraded',
    'detail',
    'actions',
  ];

  editingIndex: number | null = null;

  private organizationId: number | null = null;

  // ── Reference data ────────────────────────────────

  readonly usStates: { code: string; name: string }[] = [
    { code: 'AL', name: 'Alabama' },
    { code: 'AK', name: 'Alaska' },
    { code: 'AZ', name: 'Arizona' },
    { code: 'AR', name: 'Arkansas' },
    { code: 'CA', name: 'California' },
    { code: 'CO', name: 'Colorado' },
    { code: 'CT', name: 'Connecticut' },
    { code: 'DE', name: 'Delaware' },
    { code: 'FL', name: 'Florida' },
    { code: 'GA', name: 'Georgia' },
    { code: 'HI', name: 'Hawaii' },
    { code: 'ID', name: 'Idaho' },
    { code: 'IL', name: 'Illinois' },
    { code: 'IN', name: 'Indiana' },
    { code: 'IA', name: 'Iowa' },
    { code: 'KS', name: 'Kansas' },
    { code: 'KY', name: 'Kentucky' },
    { code: 'LA', name: 'Louisiana' },
    { code: 'ME', name: 'Maine' },
    { code: 'MD', name: 'Maryland' },
    { code: 'MA', name: 'Massachusetts' },
    { code: 'MI', name: 'Michigan' },
    { code: 'MN', name: 'Minnesota' },
    { code: 'MS', name: 'Mississippi' },
    { code: 'MO', name: 'Missouri' },
    { code: 'MT', name: 'Montana' },
    { code: 'NE', name: 'Nebraska' },
    { code: 'NV', name: 'Nevada' },
    { code: 'NH', name: 'New Hampshire' },
    { code: 'NJ', name: 'New Jersey' },
    { code: 'NM', name: 'New Mexico' },
    { code: 'NY', name: 'New York' },
    { code: 'NC', name: 'North Carolina' },
    { code: 'ND', name: 'North Dakota' },
    { code: 'OH', name: 'Ohio' },
    { code: 'OK', name: 'Oklahoma' },
    { code: 'OR', name: 'Oregon' },
    { code: 'PA', name: 'Pennsylvania' },
    { code: 'RI', name: 'Rhode Island' },
    { code: 'SC', name: 'South Carolina' },
    { code: 'SD', name: 'South Dakota' },
    { code: 'TN', name: 'Tennessee' },
    { code: 'TX', name: 'Texas' },
    { code: 'UT', name: 'Utah' },
    { code: 'VT', name: 'Vermont' },
    { code: 'VA', name: 'Virginia' },
    { code: 'WA', name: 'Washington' },
    { code: 'WV', name: 'West Virginia' },
    { code: 'WI', name: 'Wisconsin' },
    { code: 'WY', name: 'Wyoming' },
    { code: 'DC', name: 'District of Columbia' },
  ];

  readonly countries: { code: string; name: string }[] = [
    { code: 'US', name: 'United States' },
    { code: 'CA', name: 'Canada' },
    { code: 'MX', name: 'Mexico' },
    { code: 'GB', name: 'United Kingdom' },
    { code: 'DE', name: 'Germany' },
    { code: 'FR', name: 'France' },
    { code: 'AU', name: 'Australia' },
    { code: 'JP', name: 'Japan' },
    { code: 'CN', name: 'China' },
    { code: 'IN', name: 'India' },
  ];

  constructor(
    private fb: FormBuilder,
    private stateService: StateService,
    private offerorProfileService: OfferorProfileService,
    private loggingService: LoggingService,
    private snackbar: SnackbarNotificationService,
  ) {}

  ngOnInit(): void {
    this.organizationId = this.stateService.getOrganizationId();
    this.buildForm();
    this.subscribeToConditionalFields();

    if (this.organizationId) {
      this.loadAllStockholders();
    }
  }

  // ── Form builder ──────────────────────────────────

  private buildForm(): void {
    this.stockholderForm = this.fb.group({
      hasStockholders: [null, Validators.required],
      stockholderType: [null],
      firstName: [null],
      lastName: [null],
      organizationName: [null],
      publiclyTraded: [null],
      secFilingWebsite: [null],
      addressLine1: [null],
      addressLine2: [null],
      city: [null],
      state: [null],
      zipCode: [null],
      country: ['US'],
    });
  }

  private subscribeToConditionalFields(): void {
    // When hasStockholders changes, clear and re-validate downstream fields
    this.stockholderForm
      .get('hasStockholders')
      ?.valueChanges.subscribe((hasStockholders) => {
        this.clearAllStockholderFields();
        this.editingIndex = null;

        if (hasStockholders === true) {
          this.stockholderForm
            .get('stockholderType')
            ?.setValidators([Validators.required]);
          this.stockholderForm.get('stockholderType')?.updateValueAndValidity();
        }
      });

    this.stockholderForm
      .get('stockholderType')
      ?.valueChanges.subscribe((type) => {
        this.clearPersonFields();
        this.clearOrganizationFields();

        if (type === 'Person') {
          this.setPersonValidators();
        } else if (type === 'Organization') {
          this.setOrganizationNameValidator();
          this.stockholderForm
            .get('publiclyTraded')
            ?.setValidators([Validators.required]);
          this.stockholderForm.get('publiclyTraded')?.updateValueAndValidity();
        }
      });

    this.stockholderForm
      .get('publiclyTraded')
      ?.valueChanges.subscribe((value) => {
        this.clearAddressFields();
        this.clearSecFilingField();

        if (value === true) {
          this.stockholderForm
            .get('secFilingWebsite')
            ?.setValidators([Validators.required, Validators.maxLength(300)]);
          this.stockholderForm
            .get('secFilingWebsite')
            ?.updateValueAndValidity();
        } else if (value === false) {
          this.setAddressValidators();
        }
      });
  }

  // ── Validator helpers ─────────────────────────────

  private setPersonValidators(): void {
    ['firstName', 'lastName'].forEach((f) => {
      this.stockholderForm
        .get(f)
        ?.setValidators([Validators.required, Validators.maxLength(50)]);
      this.stockholderForm.get(f)?.updateValueAndValidity();
    });
  }

  private setOrganizationNameValidator(): void {
    this.stockholderForm
      .get('organizationName')
      ?.setValidators([Validators.required, Validators.maxLength(100)]);
    this.stockholderForm.get('organizationName')?.updateValueAndValidity();
  }

  private setAddressValidators(): void {
    ['addressLine1', 'city', 'state', 'zipCode', 'country'].forEach((f) => {
      this.stockholderForm.get(f)?.setValidators([Validators.required]);
      this.stockholderForm.get(f)?.updateValueAndValidity();
    });
  }

  // ── Clear helpers ─────────────────────────────────

  /**
   * Clears all stockholder detail fields when the user switches
   * hasStockholders to No.
   */
  private clearAllStockholderFields(): void {
    [
      'stockholderType',
      'firstName',
      'lastName',
      'organizationName',
      'publiclyTraded',
      'secFilingWebsite',
      'addressLine1',
      'addressLine2',
      'city',
      'state',
      'zipCode',
    ].forEach((f) => this.resetControl(f));
    this.resetControl('country', 'US');
  }

  private clearPersonFields(): void {
    ['firstName', 'lastName'].forEach((f) => this.resetControl(f));
  }

  private clearOrganizationFields(): void {
    [
      'organizationName',
      'publiclyTraded',
      'secFilingWebsite',
      'addressLine1',
      'addressLine2',
      'city',
      'state',
      'zipCode',
      'country',
    ].forEach((f) => this.resetControl(f, f === 'country' ? 'US' : null));
  }

  private clearSecFilingField(): void {
    this.resetControl('secFilingWebsite');
  }

  private clearAddressFields(): void {
    [
      'addressLine1',
      'addressLine2',
      'city',
      'state',
      'zipCode',
      'country',
    ].forEach((f) => this.resetControl(f, f === 'country' ? 'US' : null));
  }

  private resetControl(name: string, value: any = null): void {
    const ctrl = this.stockholderForm.get(name);
    ctrl?.clearValidators();
    ctrl?.setValue(value);
    ctrl?.markAsUntouched();
    ctrl?.markAsPristine();
    ctrl?.updateValueAndValidity();
  }

  // ── Load ──────────────────────────────────────────

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
              .get('stockholderType')
              ?.setValidators([Validators.required]);
            this.stockholderForm
              .get('stockholderType')
              ?.updateValueAndValidity();
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

    // "No" path — just persist the answer, no stockholder detail needed
    if (hasStockholders === false) {
      this.isSavingStockholder = true;
      // TODO: call your API to persist hasStockholders = false if needed
      // For now we just mark pristine and show success
      this.isSavingStockholder = false;
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
      ? this.savedStockholders[this.editingIndex!]
          .offerorStockholderInformationId
      : null;

    const request$: Observable<any> = existingId
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
            offerorStockholderInformationId: existingId!,
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
            { ...payload, offerorStockholderInformationId: newId },
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
    const isPerson = v.stockholderType === 'Person';
    const isOrg = v.stockholderType === 'Organization';
    const isPubliclyTraded = v.publiclyTraded === true;

    return {
      offerorStockholderInformationId: 0,
      organizationId: this.organizationId,
      stockholderType: v.stockholderType,
      firstName: isPerson ? v.firstName : null,
      lastName: isPerson ? v.lastName : null,
      organizationName: isOrg ? v.organizationName : null,
      publiclyTraded: isOrg ? v.publiclyTraded : null,
      secFilingWebsite: isOrg && isPubliclyTraded ? v.secFilingWebsite : null,
      addressLine1: isOrg && !isPubliclyTraded ? v.addressLine1 : null,
      addressLine2: isOrg && !isPubliclyTraded ? v.addressLine2 : null,
      city: isOrg && !isPubliclyTraded ? v.city : null,
      state: isOrg && !isPubliclyTraded ? v.state : null,
      zipCode: isOrg && !isPubliclyTraded ? v.zipCode : null,
      country: isOrg && !isPubliclyTraded ? v.country : null,
    };
  }

  // ── Table actions ─────────────────────────────────

  editStockholder(index: number): void {
    this.editingIndex = index;
    this.patchFormFromEntry(this.savedStockholders[index]);
    this.stockholderForm.markAsPristine();
    this.scrollToTop();
  }

  removeStockholder(index: number): void {
    const entry = this.savedStockholders[index];
    if (!entry.offerorStockholderInformationId) {
      this.savedStockholders = this.savedStockholders.filter(
        (_, i) => i !== index,
      );
      return;
    }

    this.offerorProfileService
      .DeleteStockholderInfo(entry.offerorStockholderInformationId)
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
    this.clearAllStockholderFields();
    // Re-apply required validator on stockholderType since hasStockholders = Yes
    this.stockholderForm
      .get('stockholderType')
      ?.setValidators([Validators.required]);
    this.stockholderForm.get('stockholderType')?.updateValueAndValidity();
    this.stockholderForm.markAsPristine();
    this.stockholderForm.markAsUntouched();
  }

  private patchFormFromEntry(entry: OfferorStockholderInfo): void {
    this.stockholderForm.patchValue({
      hasStockholders: true,
      stockholderType: entry.stockholderType,
      firstName: entry.firstName,
      lastName: entry.lastName,
      organizationName: entry.organizationName,
      publiclyTraded: entry.publiclyTraded,
      secFilingWebsite: entry.secFilingWebsite,
      addressLine1: entry.addressLine1,
      addressLine2: entry.addressLine2,
      city: entry.city,
      state: entry.state,
      zipCode: entry.zipCode,
      country: entry.country ?? 'US',
    });
  }

  private scrollToTop(): void {
    this.cardTop?.nativeElement?.scrollIntoView({
      behavior: 'smooth',
      block: 'start',
    });
  }

  getDisplayName(entry: OfferorStockholderInfo): string {
    if (entry.stockholderType === 'Person') {
      return [entry.firstName, entry.lastName].filter(Boolean).join(' ') || '—';
    }
    return entry.organizationName || '—';
  }

  getDisplayAddress(entry: OfferorStockholderInfo): string {
    const parts = [
      entry.addressLine1,
      entry.addressLine2,
      entry.city,
      entry.state,
      entry.zipCode,
    ].filter(Boolean);
    return parts.join(', ') || '—';
  }

  isFieldInvalid(field: string): boolean {
    const control = this.stockholderForm.get(field);
    return !!(control && control.invalid && (control.dirty || control.touched));
  }
}
