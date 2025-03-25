import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { VendorProfileService } from './service/vendor-profile.service';
import { ActivatedRoute, Router } from '@angular/router';
import { debounceTime, distinctUntilChanged, takeUntil, filter, switchMap } from 'rxjs/operators';
import { Organization } from './model/organization.model';
import { interval, Subject, of } from 'rxjs';

interface Option {
  id: number;
  description: string;
}

@Component({
  selector: 'organization-information',
  templateUrl: './organization-information.component.html',
  styleUrls: ['./organization-information.component.css'],
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatCardModule
  ]
})
export class OrganizationInformationComponent implements OnInit {
  organizationInformationForm: FormGroup;
  organizationId: number | null = null;
  private originalOrganizationData: any = null;
  private hasUnsavedChanges: boolean = false;
  private destroy$ = new Subject<void>();

  // Options for Organization Type and State
  organizationTypes: Option[] = [];
  states: Option[] = [];

  constructor(
    private fb: FormBuilder,
    private vendorProfileService: VendorProfileService,
    private route: ActivatedRoute
  ) {
    this.organizationInformationForm = this.fb.group({
      organizationName: ['', Validators.required],
      address: ['', Validators.required],
      address2: [''],
      city: ['', Validators.required],
      state: ['', Validators.required], // This will store the ID
      zipCode: ['', [Validators.required, Validators.pattern('^[0-9]{5}$')]],
      dateOfIncorporation: ['', Validators.required],
      organizationTypeId: ['', Validators.required], // This will store the ID
      taxId: ['', Validators.required],
      phone: ['', [Validators.required, Validators.pattern('^[0-9]{10}$')]],
      fax: [''],
    });
  }

  ngOnInit() {
    // Fetch Organization Types and States from the API
  /*  this.vendorProfileService.getOrganizationTypes().subscribe((types) => {
      this.organizationTypes = types;
    });

    this.vendorProfileService.getStates().subscribe((states) => {
      this.states = states;
    });*/

    // Load organization data if editing
    this.route.paramMap.pipe(takeUntil(this.destroy$)).subscribe((params) => {
      const id = params.get('organizationId');
      if (id) {
        this.organizationId = +id;
        this.loadOrganization(this.organizationId);
      }
    });

    // Auto-save logic (if needed)
    interval(5000)
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        if (this.hasUnsavedChanges) {
          const validChangedFields = this.getValidChangedFields();
          if (Object.keys(validChangedFields).length > 0) {
            this.vendorProfileService.saveOrganization(validChangedFields);
          }
        }
      });
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadOrganization(organizationId: number) {
    this.vendorProfileService.getOrganization(organizationId).subscribe({
      next: (response) => {
        if (response.isSuccess && response.organization) {
          this.originalOrganizationData = response.organization;
          this.populateForm(response.organization);
        }
      },
      error: (error) => {
        console.error('Error loading organization:', error);
      },
    });
  }

  private populateForm(organization: any) {
    this.organizationInformationForm.patchValue({
      organizationName: organization.organizationName,
      address: organization.address,
      address2: organization.address2,
      city: organization.city,
      state: organization.stateId, // Map to ID
      zipCode: organization.zipCode,
      dateOfIncorporation: organization.dateOfIncorporation,
      organizationTypeId: organization.organizationTypeId, // Map to ID
      taxId: organization.taxId,
      phone: organization.phone,
      fax: organization.fax,
    });
  }

  onSubmit() {
    if (this.organizationInformationForm.valid) {
      const formValue = this.organizationInformationForm.value;
      const payload = {
        ...formValue,
        stateId: formValue.state, // Map to ID
        organizationTypeId: formValue.organizationTypeId, // Map to ID
      };
      this.vendorProfileService.saveOrganization(payload).subscribe({
        next: (response) => {
          console.log('Organization saved successfully:', response);
        },
        error: (error) => {
          console.error('Error saving organization:', error);
        },
      });
    }
  }

  private getValidChangedFields(): any {
    const validChangedFields: any = {};
    const formValue = this.organizationInformationForm.value;

    for (const key in formValue) {
      if (
        this.organizationInformationForm.get(key)?.valid &&
        this.originalOrganizationData &&
        formValue[key] !== this.originalOrganizationData[key]
      ) {
        validChangedFields[key] = formValue[key];
      }
    }

    return validChangedFields;
  }
}