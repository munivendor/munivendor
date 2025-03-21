import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormArray, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';

import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Subject } from 'rxjs';
import { takeUntil, debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { VendorProfileService } from '../service/vendor-profile.service'; // Updated service name

@Component({
  selector: 'app-stockholder-information',
  templateUrl: './stockholder-information.component.html',
  styleUrls: ['./stockholder-information.component.scss'],
   standalone: true,
    imports: [
      CommonModule,
      ReactiveFormsModule,
      MatInputModule,
      MatSelectModule,
      MatButtonModule,
      MatCardModule,
      MatIconModule
    ]
})
export class StockholderInformationComponent implements OnInit, OnDestroy {
  stockholderForm!: FormGroup;
  yesNoOptions = [
    { value: 'yes', label: 'Yes' },
    { value: 'no', label: 'No' },
  ];
  private originalStockholderInformation: any = null; 
  private hasUnsavedChanges: boolean = false;
  private destroy$ = new Subject<void>();

  constructor(
    private fb: FormBuilder,
    private vendorProfileService: VendorProfileService, 
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    this.stockholderForm = this.fb.group({
      hasStockholders: ['', Validators.required],
      stockholders: this.fb.array([]),
    });

    // Load stockholder information if editing
    this.route.paramMap.pipe(takeUntil(this.destroy$)).subscribe((params) => {
      const id = params.get('stockholderId');
      if (id) {
        this.loadStockholderInformation(+id); // Updated method name
      }
    });

    // Auto-save logic
    this.stockholderForm.valueChanges
      .pipe(
        debounceTime(1000),
        distinctUntilChanged(),
        takeUntil(this.destroy$)
      )
      .subscribe((formValue) => {
        if (this.stockholderForm.valid) {
          this.hasUnsavedChanges = true;
          const validChangedFields = this.getValidChangedFields();
          if (Object.keys(validChangedFields).length > 0) {
            this.vendorProfileService.saveStockholderInformation(validChangedFields).subscribe({
              next: (response) => {
                console.log('Auto-saved stockholder information:', response);
              },
              error: (error) => {
                console.error('Error auto-saving stockholder information:', error);
              }
            });
          }
        }
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadStockholderInformation(stockholderId: number): void {
    this.vendorProfileService.getStockholderInformation(stockholderId).subscribe({
      next: (response) => {
        if (response.isSuccess && response.stockholderInformation) {
          this.originalStockholderInformation = response.stockholderInformation; 
          this.populateForm(response.stockholderInformation);
        }
      },
      error: (error) => {
        console.error('Error loading stockholder information:', error);
      }
    });
  }

  private populateForm(stockholderInformation: any): void {
    this.stockholderForm.patchValue({
      hasStockholders: stockholderInformation.hasStockholders,
    });

    if (stockholderInformation.stockholders && stockholderInformation.stockholders.length > 0) {
      stockholderInformation.stockholders.forEach((stockholder: any) => {
        this.addStockholderWithData(stockholder);
      });
    }
  }

  private addStockholderWithData(stockholder: any): void {
    const stockholderGroup = this.fb.group({
      type: [stockholder.type, Validators.required],
      firstName: [stockholder.firstName],
      lastName: [stockholder.lastName],
      organizationName: [stockholder.organizationName],
      isPubliclyTraded: [stockholder.isPubliclyTraded],
      address: [stockholder.address],
    });

    this.stockholders.push(stockholderGroup);
  }

  get stockholders(): FormArray {
    return this.stockholderForm.get('stockholders') as FormArray;
  }

  addStockholder(): void {
    const stockholderGroup = this.fb.group({
      type: ['', Validators.required],
      firstName: [''],
      lastName: [''],
      organizationName: [''],
      isPubliclyTraded: [''],
      address: [''],
    });

    this.stockholders.push(stockholderGroup);
  }

  removeStockholder(index: number): void {
    this.stockholders.removeAt(index);
  }

  onSubmit(): void {
    if (this.stockholderForm.valid) {
      const formValue = this.stockholderForm.value;
      this.vendorProfileService.saveStockholderInformation(formValue).subscribe({
        next: (response) => {
          console.log('Stockholder information saved successfully:', response);
        },
        error: (error) => {
          console.error('Error saving stockholder information:', error);
        }
      });
    }
  }

  private getValidChangedFields(): any {
    const validChangedFields: any = {};
    const formValue = this.stockholderForm.value;

    for (const key in formValue) {
      if (
        this.stockholderForm.get(key)?.valid &&
        this.originalStockholderInformation &&
        formValue[key] !== this.originalStockholderInformation[key]
      ) {
        validChangedFields[key] = formValue[key];
      }
    }

    return validChangedFields;
  }
}