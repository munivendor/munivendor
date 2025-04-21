import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { VendorProfileService } from '../service/vendor-profile.service';
import { ActivatedRoute } from '@angular/router';
import { debounceTime, distinctUntilChanged, takeUntil } from 'rxjs/operators';
import { Subject } from 'rxjs';
import { ListDataService, Option } from '../../shared/service/listdata.service';

@Component({
  selector: 'app-contact-information',
  templateUrl: './contact-information.component.html',
  styleUrls: ['./contact-information.component.css'],
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatCardModule,
    MatCheckboxModule
  ]
})
export class ContactInformationComponent implements OnInit, OnDestroy {
  contactForm: FormGroup;
  contactId: number | undefined;
  saveStatus: string = '';
  private originalContactData: any = null;
  private destroy$ = new Subject<void>();

  counties: Option[] = [];
  states: Option[] = [];
  times: Option[] = [];

  constructor(
    private fb: FormBuilder,
    private vendorProfileService: VendorProfileService,
    private listDataService: ListDataService,
    private route: ActivatedRoute
  ) {
    this.contactForm = this.fb.group({
      firstName: ['', Validators.required],
      lastName: ['', Validators.required],
      title: [''],
      countyId: ['', Validators.required],
      streetAddress: [''],
      streetAddress2: [''],
      city: [''],
      stateId: [''],
      zipCode: ['', [Validators.pattern('^[0-9]{5}$')]],
      digitalSignatureConsent: [false, Validators.requiredTrue],
      email: ['', [Validators.required, Validators.email]],
      confirmEmail: ['', [Validators.required, Validators.email]],
      phone: ['', [Validators.required, Validators.pattern('^[0-9]{10}$')]],
      bestTimeToCallId: ['']
    }, { validator: this.emailMatchValidator });
  }

  ngOnInit() {
    this.loadCounties();
    this.loadStates();
    this.loadTimes();

    this.route.paramMap.pipe(takeUntil(this.destroy$)).subscribe((params) => {
      const id = params.get('contactId');
      if (id) {
        this.contactId = +id;
        this.loadContact(this.contactId);
      }
    });

    // Setup auto-saving on valid changes
    this.contactForm.valueChanges.pipe(
      debounceTime(500),
      distinctUntilChanged(),
      takeUntil(this.destroy$)
    ).subscribe(() => {
      if (this.contactForm.valid && this.contactForm.dirty) {
        this.saveChanges();
      }
    });
  }

  private emailMatchValidator(formGroup: FormGroup) {
    const email = formGroup.get('email')?.value;
    const confirmEmail = formGroup.get('confirmEmail')?.value;
    return email === confirmEmail ? null : { emailMismatch: true };
  }

  private loadCounties() {
    this.listDataService.getCounties().subscribe({
      next: (response) => {
        if (response) {
          this.counties = response.map(county => ({
            codeId: county.codeId,
            codeDesc: county.codeDesc
          }));
        }
      },
      error: (error) => {
        console.error('Error loading counties:', error);
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

  private loadTimes() {
    this.listDataService.getTimes().subscribe({
      next: (response) => {
        if (response) {
          this.times = response.map(time => ({
            codeId: time.codeId,
            codeDesc: time.codeDesc
          }));
        }
      },
      error: (error) => {
        console.error('Error loading times:', error);
      }
    });
  }

  private loadContact(contactId: number) {
    this.vendorProfileService.getContact(contactId).subscribe({
      next: (response) => {
        if (response) {
          this.originalContactData = response;
          this.populateForm(response);
        }
      },
      error: (error) => {
        console.error('Error loading contact:', error);
        this.saveStatus = 'Error loading contact';
      }
    });
  }

  private populateForm(contact: any) {
    this.contactForm.patchValue({
      firstName: contact.firstName,
      lastName: contact.lastName,
      title: contact.title,
      countyId: contact.countyId,
      streetAddress: contact.streetAddress,
      streetAddress2: contact.streetAddress2,
      city: contact.city,
      stateId: contact.stateId,
      zipCode: contact.zipCode,
      digitalSignatureConsent: contact.digitalSignatureConsent,
      email: contact.email,
      confirmEmail: contact.email, // Assuming same email for confirmation
      phone: contact.phone,
      bestTimeToCallId: contact.bestTimeToCallId
    });

    this.contactForm.markAsPristine();
  }

  onFieldBlur(fieldName: string) {
    const control = this.contactForm.get(fieldName);
    if (control && control.valid && control.dirty) {
      this.saveStatus = 'Saving...';
      this.saveField(fieldName, control.value);
    }
  }

  private saveField(fieldName: string, value: any) {
    const contactInfo = {
      contactId: this.contactId,
      [fieldName]: value
    };

    this.vendorProfileService.saveContact(contactInfo, this.contactId).subscribe({
      next: (response) => {
        if (response) {
          this.contactId = response.contactId;
          this.contactForm.get(fieldName)?.markAsPristine();
          this.saveStatus = 'Saved';
        } else {
          this.saveStatus = 'Error saving';
        }
      },
      error: (error) => {
        console.error(`Error saving ${fieldName}:`, error);
        this.saveStatus = 'Error saving';
      }
    });
  }

  private saveChanges() {
    const changedFields = this.getChangedFields();
    if (Object.keys(changedFields).length > 0) {
      const contactInfo = {
        contactId: this.contactId,
        ...changedFields
      };

      this.saveStatus = 'Saving...';
      this.vendorProfileService.saveContact(contactInfo, this.contactId).subscribe({
        next: (response) => {
          if (response) {
            this.contactId = response.contactId;
            this.originalContactData = { ...this.originalContactData, ...changedFields };
            this.contactForm.markAsPristine();
            this.saveStatus = 'Saved';
          } else {
            this.saveStatus = 'Error saving';
          }
        },
        error: (error) => {
          console.error('Error saving contact:', error);
          this.saveStatus = 'Error saving';
        }
      });
    }
  }

  private getChangedFields(): any {
    const changedFields: any = {};
    const formValue = this.contactForm.value;

    for (const key in formValue) {
      if (this.contactForm.get(key)?.dirty && 
          this.originalContactData && 
          formValue[key] !== this.originalContactData[key]) {
        changedFields[key] = formValue[key];
      }
    }

    return changedFields;
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }
}