import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil, debounceTime, distinctUntilChanged } from 'rxjs/operators';

import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { CommonModule } from '@angular/common';
import { VendorProfileService } from '../service/vendor-profile.service'; // Updated service name

@Component({
  selector: 'app-contact-information',
  templateUrl: './contact-information.component.html',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
  ],
})
export class ContactInformationComponent implements OnInit, OnDestroy {
  contactForm!: FormGroup;
  counties: string[] = []; // Initialize as empty array
  states: string[] = []; // Initialize as empty array
  times: string[] = []; // Initialize as empty array

  private originalContactInformation: any = null;
  private hasUnsavedChanges: boolean = false;
  private destroy$ = new Subject<void>();

  constructor(
    private fb: FormBuilder,
    private vendorProfileService: VendorProfileService, // Updated service name
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    this.contactForm = this.fb.group({
      firstName: ['', Validators.required],
      lastName: ['', Validators.required],
      title: [''],
      county: ['', Validators.required],
      streetAddress: [''],
      streetAddress2: [''],
      city: [''],
      state: [''],
      zipCode: [''],
      email: ['', [Validators.required, Validators.email]],
      confirmEmail: ['', [Validators.required, Validators.email]],
      phone: ['', Validators.required],
      bestTimeToCall: [''],
    });

 
    this.getCounties();
    this.getStates();
    this.getTimes();

    // Load contact information if editing
    this.route.paramMap.pipe(takeUntil(this.destroy$)).subscribe((params) => {
      const id = params.get('contactId');
      if (id) {
        this.loadContactInformation(+id); // Updated method name
      }
    });

    // Auto-save logic
    this.contactForm.valueChanges
      .pipe(
        debounceTime(1000),
        distinctUntilChanged(),
        takeUntil(this.destroy$)
      )
      .subscribe((formValue) => {
        if (this.contactForm.valid) {
          this.hasUnsavedChanges = true;
          const validChangedFields = this.getValidChangedFields();
          if (Object.keys(validChangedFields).length > 0) {
            this.vendorProfileService.saveContactInformation(validChangedFields).subscribe({
              next: (response) => {
                console.log('Auto-saved contact information:', response);
              },
              error: (error) => {
                console.error('Error auto-saving contact information:', error);
              },
            });
          }
        }
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private getCounties(): void {
    this.vendorProfileService.getCounties().subscribe({
      next: (response) => {
        if (response.isSuccess && response.counties) {
          this.counties = response.counties; // Populate counties array
        }
      },
      error: (error) => {
        console.error('Error fetching counties:', error);
      },
    });
  }

  private getStates(): void {
    this.vendorProfileService.getStates().subscribe({
      next: (response) => {
        if (response.isSuccess && response.states) {
          this.states = response.states; // Populate states array
        }
      },
      error: (error) => {
        console.error('Error fetching states:', error);
      },
    });
  }

  private getTimes(): void {
    this.vendorProfileService.getTimes().subscribe({
      next: (response) => {
        if (response.isSuccess && response.times) {
          this.times = response.times; // Populate times array
        }
      },
      error: (error) => {
        console.error('Error fetching times:', error);
      },
    });
  }

  private loadContactInformation(contactId: number): void {
    this.vendorProfileService.getContactInformation(contactId).subscribe({
      next: (response) => {
        if (response.isSuccess && response.contactInformation) {
          this.originalContactInformation = response.contactInformation;
          this.populateForm(response.contactInformation);
        }
      },
      error: (error) => {
        console.error('Error loading contact information:', error);
      },
    });
  }

  private populateForm(contactInformation: any): void {
    this.contactForm.patchValue({
      firstName: contactInformation.firstName,
      lastName: contactInformation.lastName,
      title: contactInformation.title,
      county: contactInformation.county,
      streetAddress: contactInformation.streetAddress,
      streetAddress2: contactInformation.streetAddress2,
      city: contactInformation.city,
      state: contactInformation.state,
      zipCode: contactInformation.zipCode,
      email: contactInformation.email,
      confirmEmail: contactInformation.confirmEmail,
      phone: contactInformation.phone,
      bestTimeToCall: contactInformation.bestTimeToCall,
    });
  }

  onSubmit(): void {
    if (this.contactForm.valid) {
      const formValue = this.contactForm.value;
      this.vendorProfileService.saveContactInformation(formValue).subscribe({
        next: (response) => {
          console.log('Contact information saved successfully:', response);
        },
        error: (error) => {
          console.error('Error saving contact information:', error);
        },
      });
    }
  }

  private getValidChangedFields(): any {
    const validChangedFields: any = {};
    const formValue = this.contactForm.value;

    for (const key in formValue) {
      if (
        this.contactForm.get(key)?.valid &&
        this.originalContactInformation &&
        formValue[key] !== this.originalContactInformation[key]
      ) {
        validChangedFields[key] = formValue[key];
      }
    }

    return validChangedFields;
  }
}