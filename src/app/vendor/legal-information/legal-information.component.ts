import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { VendorProfileService } from '../service/vendor-profile.service';
import { ActivatedRoute, Router } from '@angular/router';
import { debounceTime, distinctUntilChanged, takeUntil, filter, switchMap } from 'rxjs/operators';
import { interval, Subject, of } from 'rxjs';

interface Option {
  value: string;
  label: string;
}

@Component({
  selector: 'app-legal-details',
  templateUrl: './legal-details.component.html',
  styleUrls: ['./legal-details.component.scss'],
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
export class LegalDetailsComponent implements OnInit, OnDestroy {
  legalDetailsForm!: FormGroup;
  yesNoOptions: Option[] = [
    { value: 'yes', label: 'Yes' },
    { value: 'no', label: 'No' }
  ];
  private originalLegalData: any = null;
  private hasUnsavedChanges: boolean = false;
  private destroy$ = new Subject<void>();

  constructor(
    private fb: FormBuilder,
    private vendorProfileService: VendorProfileService,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    this.legalDetailsForm = this.fb.group({
      contractFailure: ['', Validators.required],
      liensLawsuits: ['', Validators.required],
      contractFailureDetails: [''],
      lienLawsuitDetails: ['']
    });

    // Load legal details data if editing
    this.route.paramMap.pipe(takeUntil(this.destroy$)).subscribe((params) => {
      const id = params.get('legalDetailsId');
      if (id) {
        this.loadLegalDetails(+id);
      }
    });

    // Auto-save logic
    this.legalDetailsForm.valueChanges
      .pipe(
        debounceTime(1000),
        distinctUntilChanged(),
        takeUntil(this.destroy$)
      )
      .subscribe((formValue) => {
        if (this.legalDetailsForm.valid) {
          this.hasUnsavedChanges = true;
          const validChangedFields = this.getValidChangedFields();
          if (Object.keys(validChangedFields).length > 0) {
            this.vendorProfileService.saveVendorLegalInformation(validChangedFields).subscribe({
              next: (response) => {
                console.log('Auto-saved legal details:', response);
              },
              error: (error) => {
                console.error('Error auto-saving legal details:', error);
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

  private loadLegalDetails(legalDetailsId: number): void {
    this.vendorProfileService.getVendorLegalInformation(legalDetailsId).subscribe({
      next: (response) => {
        if (response.isSuccess && response.vendorLegalInformation) {
          this.originalLegalData = response.vendorLegalInformation;
          this.populateForm(response.vendorLegalInformation);
        }
      },
      error: (error) => {
        console.error('Error loading legal details:', error);
      }
    });
  }

  private populateForm(legalDetails: any): void {
    this.legalDetailsForm.patchValue({
      contractFailure: legalDetails.contractFailure,
      liensLawsuits: legalDetails.liensLawsuits,
      contractFailureDetails: legalDetails.contractFailureDetails,
      lienLawsuitDetails: legalDetails.lienLawsuitDetails
    });
  }

  onSubmit(): void {
    if (this.legalDetailsForm.valid) {
      const formValue = this.legalDetailsForm.value;
      this.vendorProfileService.saveLegalDetails(formValue).subscribe({
        next: (response) => {
          console.log('Legal details saved successfully:', response);
        },
        error: (error) => {
          console.error('Error saving legal details:', error);
        }
      });
    }
  }

  private getValidChangedFields(): any {
    const validChangedFields: any = {};
    const formValue = this.legalDetailsForm.value;

    for (const key in formValue) {
      if (
        this.legalDetailsForm.get(key)?.valid &&
        this.originalLegalData &&
        formValue[key] !== this.originalLegalData[key]
      ) {
        validChangedFields[key] = formValue[key];
      }
    }

    return validChangedFields;
  }
}