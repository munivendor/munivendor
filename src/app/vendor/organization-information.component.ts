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
import { debounceTime, distinctUntilChanged, takeUntil } from 'rxjs/operators';
import { Organization } from './model/organization.model';
import { interval, Subject } from 'rxjs'; 

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
  private originalOrganizationData: Organization | null = null; 
  private hasUnsavedChanges: boolean = false;
  private destroy$ = new Subject<void>();

  constructor(
    private fb: FormBuilder,
    private vendorProfileService: VendorProfileService,
    private route: ActivatedRoute,
    private router: Router
  ) {
    this.organizationInformationForm = this.fb.group({
      organizationName: ['', Validators.required],
      address: ['', Validators.required],
      address2: [''],
      city: ['', Validators.required],
      state: ['', Validators.required],
      zipCode: ['', [Validators.required, Validators.pattern('^[0-9]{5}$')]],
      dateOfIncorporation: ['', Validators.required],
      organizationTypeId: ['', Validators.required],
      taxId: ['', Validators.required],
      phone: ['', [Validators.required, Validators.pattern('^[0-9]{10}$')]],
      fax: ['']
    });
  }



  ngOnInit() {
    // Read the organizationId from the route
    this.route.paramMap
      .pipe(takeUntil(this.destroy$)) // Unsubscribe when destroy$ emits
      .subscribe(params => {
        const id = params.get('organizationId');
        if (id) {
          this.organizationId = +id; // Convert to number
          this.loadOrganization(this.organizationId);
        }
      });
  
    // Listen to form value changes
    this.organizationInformationForm.valueChanges
      .pipe(
        debounceTime(500),
        distinctUntilChanged(),
        takeUntil(this.destroy$) // Unsubscribe when destroy$ emits
      )
      .subscribe(() => {
        this.hasUnsavedChanges = true;
      });
  
    // Auto-save every 5 seconds
    interval(5000)
      .pipe(takeUntil(this.destroy$)) // Unsubscribe when destroy$ emits
      .subscribe(() => {
        if (this.hasUnsavedChanges) {
          const validChangedFields = this.getValidChangedFields();
  
          if (Object.keys(validChangedFields).length > 0) {
            this.saveOrganization(validChangedFields);
          } else {
            console.log('No valid changes detected. Skipping save.');
          }
  
          this.hasUnsavedChanges = false;
        }
      });
  }
  
  ngOnDestroy() {
    this.destroy$.next(); // Emit a value to trigger unsubscribe
    this.destroy$.complete(); // Complete the subject
  }

   private getValidChangedFields(): Partial<Organization> {
    const validChangedFields: Partial<Organization> = {};
    const formValue = this.organizationInformationForm.value;
  
    for (const key in formValue) {
      if (
        this.organizationInformationForm.get(key)?.valid && // Check if the field is valid
        this.originalOrganizationData && // Ensure original data exists
        formValue[key] !== this.originalOrganizationData[key as keyof Organization] // Check if the field has changed
      ) {
        validChangedFields[key as keyof Organization] = formValue[key];
      }
    }
  
    return validChangedFields;
  }
/*
  private getInvalidControls(): string[] {
    const invalidControls: string[] = [];
    const controls = this.organizationInformationForm.controls;

    for (const controlName in controls) {
      if (controls[controlName].invalid) {
        invalidControls.push(controlName);
      }
    }

    return invalidControls;
  } */

  private loadOrganization(organizationId: number) {
    this.vendorProfileService.getOrganization(organizationId).subscribe({
      next: (response) => {
        if (response.isSuccess && response.organization) {
          this.originalOrganizationData = response.organization; // Store the original data
          this.populateForm(response.organization);
        } else {
          console.error('Failed to load organization:', response.message);
        }
      },
      error: (error) => {
        console.error('Error loading organization:', error);
      }
    });
  }

  private populateForm(organization: Organization) {
    this.organizationInformationForm.patchValue({
      organizationName: organization.organizationName,
      address: organization.address,
      address2: organization.address2,
      city: organization.city,
      state: organization.state,
      zipCode: organization.zipCode,
      dateOfIncorporation: organization.dateOfIncorporation,
      organizationTypeId: organization.organizationTypeId,
      taxId: organization.taxId,
      phone: organization.phone,
      fax: organization.fax
    });
  }

  onSubmit() {
    if (this.organizationInformationForm.valid) {
      //this.saveOrganization();
    } else {
      console.log('Form is invalid');
    }
  }

  private saveOrganization(changedFields: Partial<Organization>) {
    if (!this.organizationId) {
      console.log('Organization ID is missing. Cannot save.');
      return;
    }
  
    // Include organizationId in the payload
    const organizationData: Organization = {
      ...changedFields,
      organizationId: this.organizationId
    };
  
    // Send only the valid and changed fields to the backend
    this.vendorProfileService.saveOrganization(organizationData).subscribe({
      next: (response) => {
        if (response.isSuccess) {
          console.log('Organization saved successfully:', response.vendorProfileId);
          this.originalOrganizationData = { ...this.originalOrganizationData, ...changedFields }; // Update the original data
          this.hasUnsavedChanges = false; // Reset the flag after saving
        } else {
          console.error('Failed to save organization:', response.message);
        }
      },
      error: (error) => {
        console.error('Error saving organization:', error);
      }
    });
  }

  private hasChanges(formValue: any): boolean {
    if (!this.originalOrganizationData) {
      return true; // If no original data, assume changes exist
    }

    // Compare each field in the form with the original data
    return (
      formValue.organizationName !== this.originalOrganizationData.organizationName ||
      formValue.address !== this.originalOrganizationData.address ||
      formValue.address2 !== this.originalOrganizationData.address2 ||
      formValue.city !== this.originalOrganizationData.city ||
      formValue.state !== this.originalOrganizationData.state ||
      formValue.zipCode !== this.originalOrganizationData.zipCode ||
      formValue.dateOfIncorporation !== this.originalOrganizationData.dateOfIncorporation ||
      formValue.organizationTypeId !== this.originalOrganizationData.organizationTypeId ||
      formValue.taxId !== this.originalOrganizationData.taxId ||
      formValue.phone !== this.originalOrganizationData.phone ||
      formValue.fax !== this.originalOrganizationData.fax
    );
  }

  private getChangedFields(formValue: any): Partial<Organization> {
    const changedFields: Partial<Organization> = {};

    for (const key in formValue) {
      if (
        this.originalOrganizationData &&
        formValue[key] !== this.originalOrganizationData[key as keyof Organization] &&
        this.organizationInformationForm.get(key)?.valid // Ensure the field is valid
      ) {
        changedFields[key as keyof Organization] = formValue[key];
      }
    }

    return changedFields;
  }
}