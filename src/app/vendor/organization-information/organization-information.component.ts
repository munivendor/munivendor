import { Component, OnInit } from '@angular/core';


import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDatepickerInputEvent, MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core'; 
import { ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { VendorProfileService } from '../service/vendor-profile.service';
import { ActivatedRoute, Router } from '@angular/router';
import { debounceTime, distinctUntilChanged, takeUntil } from 'rxjs/operators';
import { Subject } from 'rxjs';
import { ListDataService, Option } from '../../shared/service/listdata.service';




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
    MatCardModule,
    MatDatepickerModule,
     MatNativeDateModule
  ]
})
export class OrganizationInformationComponent implements OnInit {
  organizationInformationForm: FormGroup;
  organizationId: number | undefined;
  saveStatus: string = '';
  private originalOrganizationData: any = null;
  private destroy$ = new Subject<void>();

  organizationTypes: Option[] = [];
  states: Option[] = [];

  constructor(
    private fb: FormBuilder,
    private vendorProfileService: VendorProfileService,
    private listDataService: ListDataService,
    private route: ActivatedRoute,
    private router: Router
  ) {
    this.organizationInformationForm = this.fb.group({
      organizationName: ['', Validators.required],
      address: ['', Validators.required],
      address2: [''],
      city: ['', Validators.required],
      stateId: ['', Validators.required], 
      zipCode: ['', [Validators.required, Validators.pattern('^[0-9]{5}$')]],
      dateOfIncorporation: ['', Validators.required],
      organizationTypeId: ['', Validators.required],
      timeAtCurrentAddress: ['', [Validators.required, Validators.min(0), Validators.max(100)]],
      taxId: ['', Validators.required, Validators.pattern(/^\d{2}-\d{7}$/)],
      phone: ['', [Validators.required, Validators.pattern('^[0-9]{10}$')]],
      fax: ['',Validators.pattern('^[0-9]{10}$')],
    });
  }

  ngOnInit() {

    //this.setupFieldBlurHandlers();

    this.loadStates();
    this.loadOrganizationTypes();
    this.route.paramMap.pipe(takeUntil(this.destroy$)).subscribe((params) => {
      const id = 23;//params.get('organizationId');
      
      if (id) {
        this.organizationId = +id;
        this.loadOrganization(this.organizationId);
      }
    });
  }

  private loadStates() {
    this.listDataService.getStates().subscribe({
      next: (response) => {
        if (response) {
          this.states = response.map(state => ({
            codeId: state.codeId,
            codeDesc: state.codeDesc
          }));
        }
      },
      error: (error) => {
        console.error('Error loading states:', error);
      }
    });
  }

  private loadOrganizationTypes() {
    this.listDataService.getOrganizationTypes().subscribe({
      next: (response) => {
        if (response) {
          this.organizationTypes = response.map(type => ({
            codeId: type.codeId,
            codeDesc: type.codeDesc
          }));
        }
      },
      error: (error) => {
        console.error('Error loading organization types:', error);
      }
    });
  }

  private loadOrganization(organizationId: number) {
    this.vendorProfileService.getOrganization(organizationId).subscribe({
      next: (response) => {
        if (response) {
          this.originalOrganizationData = response;
          this.populateForm(response);
        }
      },
      error: (error) => {
        console.error('Error loading organization:', error);
        this.saveStatus = 'Error loading organization';
        setTimeout(() => this.saveStatus = '', 2000);
      }
    });
  }

  private populateForm(organization: any) {
    this.organizationInformationForm.patchValue({
      organizationName: organization.organizationName,
      address: organization.address,
      address2: organization.address2,
      city: organization.city,
      stateId: organization.stateId,
      zipCode: organization.zipCode,
      dateOfIncorporation: organization.dateOfIncorporation,
      organizationTypeId: organization.organizationTypeId,
      timeAtCurrentAddress: organization.duration,
      taxId: organization.taxId,
      phone: organization.phone,
      fax: organization.fax,
    });

    this.organizationInformationForm.markAsPristine();
  }

  onDateChanged(event: MatDatepickerInputEvent<Date>) {
    
    console.log('Date changed:', event.value);
    // You can call your existing blur handler if you want
    this.onFieldBlur('dateOfIncorporation');
  }
 
  onFieldBlur(fieldName: string) {
    const control = this.organizationInformationForm.get(fieldName);
    if (control && control.valid && control.dirty) {
      this.saveStatus = 'Saving...';
      this.saveField(fieldName, control.value);
    }
  }

  /*private setupFieldBlurHandlers() {
    Object.keys(this.organizationInformationForm.controls).forEach(fieldName => {
      const control = this.organizationInformationForm.get(fieldName);
      
      if (control) {
        control.valueChanges.pipe(
          debounceTime(500),
          distinctUntilChanged(),
          takeUntil(this.destroy$)
        ).subscribe(() => {
          if (control.valid && control.dirty) {
            this.saveField(fieldName, control.value);
          }
        });
      }
    });
  }*/

  private saveField(fieldName: string, value: any) {
    
    const organizationInfo = {
      organizationId: this.organizationId,
      [fieldName]: value
    };

    this.vendorProfileService.saveOrganization(organizationInfo, this.organizationId).subscribe({
      next: (response) => {
        if (response) {
          this.organizationId = response.organizationId;
          this.organizationInformationForm.get(fieldName)?.markAsPristine();
          this.saveStatus = 'Saved';
          //setTimeout(() => this.saveStatus = '', 2000);
        } else {
          this.saveStatus = 'Error saving';
          //setTimeout(() => this.saveStatus = '', 2000);
        }
      },
      error: (error) => {
        console.error(`Error saving ${fieldName}:`, error);
        this.saveStatus = 'Error saving';
       // setTimeout(() => this.saveStatus = '', 2000);
      }
    });
  }

  formatFein(event: Event) {
    const input = event.target as HTMLInputElement;
    let value = input.value.replace(/\D/g, ''); // Remove all non-digits
    
    // Format as XX-XXXXXXX
    if (value.length > 2) {
      value = value.substring(0, 2) + '-' + value.substring(2, 9);
    }
    
    // Update both the display value and form control value
    input.value = value;
    this.organizationInformationForm.get('taxId')?.setValue(value, { emitEvent: false });
  }

  /*private loadOrganization(organizationId: number) {
    this.vendorProfileService.getOrganization(organizationId).subscribe({
      next: (response) => {
        if (response.isSuccess && response.organization) {
          this.originalOrganizationData = response.organization;
          this.populateForm(response.organization);
        }
      },
      error: (error) => {
        console.error('Error loading organization:', error);
        this.saveStatus = 'Error loading organization';
        setTimeout(() => this.saveStatus = '', 2000);
      },
    });
  }

  private populateForm(organization: any) {
    this.organizationInformationForm.patchValue({
      organizationName: organization.organizationName,
      address: organization.address,
      address2: organization.address2,
      city: organization.city,
      state: organization.stateId,
      zipCode: organization.zipCode,
      dateOfIncorporation: organization.dateOfIncorporation,
      organizationTypeId: organization.organizationTypeId,
      taxId: organization.taxId,
      phone: organization.phone,
      fax: organization.fax,
    });

    // Mark all controls as pristine after initial load
    this.organizationInformationForm.markAllAsTouched();
  }*/

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }
}