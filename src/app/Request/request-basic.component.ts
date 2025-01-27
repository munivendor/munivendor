import { Component, OnInit, Input, Output, EventEmitter, ChangeDetectorRef } from '@angular/core';
import { RouterModule } from '@angular/router';
import { FormGroup, FormBuilder, FormArray, ReactiveFormsModule, Validators, FormControl, FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { RequestService } from './services/request.service';
import { StateService } from './services/state.service';
import { SubCategory } from './model/subcategory.model';
import { Category } from './model/category.model';
import { DecisionMaker } from './model/decisionmaker.model';
import { RequestType } from './model/requesttype.model';
import { Request } from './model/request.model';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatSelectChange } from '@angular/material/select';
import { MatDatepickerInputEvent, MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { NgxMatTimepickerModule } from 'ngx-mat-timepicker';
import { MatIconModule } from '@angular/material/icon';
import { forkJoin } from 'rxjs';

@Component({
  selector: 'request-basic',
  standalone: true,
  templateUrl: './request-basic.component.html',
  styleUrls: ['./request-basic.component.css'],
  imports: [
    ReactiveFormsModule,
    RouterModule,
    CommonModule,
    MatSelectModule,
    FormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatDatepickerModule,
    MatNativeDateModule,
    NgxMatTimepickerModule,
    MatIconModule
  ]
})

export class BasicRequestComponent implements OnInit {
  @Input() requestId?: number;
  @Input() idParam?: string | null | undefined;
  @Output() deleteDropdown = new EventEmitter<{ decisionMakerId: number | null }>();
  @Output() formValidityChange = new EventEmitter<boolean>();

  decisionMakers!: DecisionMaker[];
  categories: Category[] = [];
  subcategories!: SubCategory[];
  requestTypes: RequestType[] | undefined;
  requestName = new FormControl<string | null>(null, [Validators.required]);
  basicsFormGroup!: FormGroup;
  municipalityId = 1;

  constructor(
    private fb: FormBuilder,
    private requestService: RequestService,
    private stateService: StateService,
    private cdr: ChangeDetectorRef) { }

  ngOnInit() {
    if (this.idParam) {
      this.getRequestById(Number(this.idParam))
    } else {
      this.initializeForm();
    }
  }

  private initializeForm(data: any = null): void {
    this.basicsFormGroup = this.fb.group({
      category: [data?.category || '', Validators.required],
      subcategory: [data?.subcategory || '', Validators.required],
      requestType: [data?.requestType || '', Validators.required],
      requestName: [data?.requestName || '', Validators.required],
      publishDate: [data?.publishDate || '', Validators.required],
      publishTime: [data?.publishTime || '', Validators.required],
      openDate: [data?.openDate || '', Validators.required],
      openTime: [data?.openTime || '', Validators.required],
      contractStartDate: [data?.contractStartDate || '', Validators.required],
      contractEndDate: [data?.contractEndDate || '', Validators.required],
      dropdowns: this.fb.array(data?.dropdowns || [this.createDropdownControl()]),
    });

    this.basicsFormGroup.statusChanges.subscribe(() => {
      this.formValidityChange.emit(this.basicsFormGroup.valid);
    });

    this.fetchInitialData();
  }

  private fetchInitialData(): void {
    this.requestService.GetCategories().subscribe({
      next: (categories: Category[]) => {
        this.categories = categories;
      },
      error: (err) => {
        console.error('Error fetching categories:', err);
      },
    });

    this.requestService.GetDecisionMakers().subscribe({
      next: (decisionMakers: DecisionMaker[]) => {
        this.decisionMakers = decisionMakers;
      },
      error: (err) => {
        console.error('Error fetching decision makers:', err);
      },
    });

    this.requestService.GetRequestTypes().subscribe({
      next: (requestTypes: RequestType[]) => {
        this.requestTypes = requestTypes;
      },
      error: (err) => {
        console.error('Error fetching request types:', err);
      },
    });
  }

  private getRequestById(requestId: number): void {
    const request$ = this.requestService.GetRequestDetailsById(requestId);
    const categories$ = this.requestService.GetCategories();
    const requestTypes$ = this.requestService.GetRequestTypes();
    const subCategories$ = this.requestService.GetAllSubcategories();
    const decisionMakers$ = this.requestService.GetDecisionMakers();

    forkJoin([request$, categories$, requestTypes$, subCategories$, decisionMakers$]).subscribe(
      ([request, categories, requestTypes, subCategories, decisionMakers]) => {
        const category = categories.find((c: { categoryId: any }) => c.categoryId === request.categoryId);
        const requestType = requestTypes.find((r: { requestTypeId: number }) => r.requestTypeId === request.requestTypeId);
        const subCategory = subCategories.find(
          (sc: { subCategoryId: number }) => sc.subCategoryId === request.subCategoryId
        );

        this.subcategories = subCategories.filter(sc => sc.categoryId === request.categoryId);

        const decisionMakersMapped = request.decisionMakerSelections.map(
          (selection: { decisionMakerId: number }) =>
            decisionMakers.find((dm: { decisionMakerId: number }) => dm.decisionMakerId === selection.decisionMakerId)
        ).filter((dm: any) => dm);

        const formData = {
          category: category?.categoryId || '',
          subcategory: subCategory?.subCategoryId || '',
          requestType: requestType?.requestTypeId,
          requestName: request.requestName,
          publishDate: request.publishDate,
          publishTime: this.convertUtcToLocalTimeOnly(request.publishDate),
          openDate: request.openDate,
          openTime: this.convertUtcToLocalTimeOnly(request.openDate),
          contractStartDate: request.contractStart,
          contractEndDate: request.contractEnd,
          dropdowns: this.createDecisionMakerDropdownControls(decisionMakersMapped),
        };

        this.initializeForm(formData);

        this.formValidityChange.emit(this.basicsFormGroup.valid);
      },
      (error: any) => {
        console.error('Error fetching data', error);
      }
    );
  }

  get dropdowns(): FormArray {
    return this.basicsFormGroup.get('dropdowns') as FormArray;
  }

  private createDecisionMakerDropdownControls(decisionMakers: any[]): any[] {
    return decisionMakers.map((decisionMaker) =>
      this.fb.group({
        decisionMaker: [decisionMaker?.decisionMakerId || '', Validators.required],
      })
    );
  }

  private createDropdownControl(): FormGroup {
    return this.fb.group({
      decisionMaker: ['', Validators.required],
    });
  }

  addDropdown(): void {
    this.dropdowns.push(this.createDropdownControl());
  }

  removeDropdown(index: number): void {
    const decisionMakerId = this.dropdowns.at(index).get('decisionMaker')?.value;
    if (decisionMakerId) {
      this.requestService.DeleteDecisionMaker(this.requestId ? this.requestId : Number(this.idParam), decisionMakerId).subscribe({
        next: () => {
          this.dropdowns.removeAt(index);
          console.log(`Decision Maker with ID ${decisionMakerId} removed successfully.`);
        },
        error: (error) => {
          console.error(`Error removing Decision Maker with ID ${decisionMakerId}:`, error);
        },
      });
    } else {
      // No value selected but remove dropdown
      this.dropdowns.removeAt(index);
    }
  }

  getFilteredDecisionMakers(index: number): DecisionMaker[] {
    const selectedDecisionMakerIds = this.dropdowns.controls
      .map((control, i) => (i !== index ? control.get('decisionMaker')?.value : null))
      .filter((value) => value !== null); // Ensure we filter out null values
  
    // Ensure decisionMakers is defined and return a filtered array
    return this.decisionMakers
      ? this.decisionMakers.filter(
          (decisionMaker) => !selectedDecisionMakerIds.includes(decisionMaker.decisionMakerId)
        )
      : [];
  }
  

  onCategoryChange(event: MatSelectChange): void {
    const categoryId = event.value;
    this.requestService.GetSubcategories(categoryId).subscribe((subcategories: SubCategory[]) => {
      this.subcategories = subcategories;
      const currentSubcategoryId = this.basicsFormGroup.get('subcategory')?.value;
      if (this.subcategories.some(sc => sc.subCategoryId === currentSubcategoryId)) {
        this.basicsFormGroup.get('subcategory')?.setValue(currentSubcategoryId);
      } else {
        this.basicsFormGroup.get('subcategory')?.setValue('');
      }
    });
  }

  saveRequest() {
    let request = this.createRequest();
    const requestIdFromStateService = this.stateService.getRequestId();

    if (this.idParam || requestIdFromStateService) {
      this.requestService.UpdateRequest(Number(this.idParam), request).subscribe(
        (responseRequestId: number) => {
          console.log('Request updated successfully:', responseRequestId);
          this.getRequestById(responseRequestId);
          this.stateService.setRequestId(responseRequestId);
          this.stateService.setRequestHasBeenSaved(true);
        },
        error => {
          console.error('Error updating Request:', error);
        }
      );
    }

    else if (!this.idParam || !requestIdFromStateService) {
      this.requestService.CreateRequest(request).subscribe(
        (responseRequestId: number) => {
          console.log('Request created successfully:', responseRequestId);
          this.requestId = responseRequestId;
          this.stateService.setRequestId(responseRequestId)
          this.cdr.detectChanges();
        },
        error => {
          console.error('Error creating request:', error);
        }
      );
    }
  }

  createRequest(): Request {
    const formValues = this.basicsFormGroup.value;
    let request = new Request();

    request.categoryId = formValues.category;
    request.subcategoryId = formValues.subcategory;
    request.requestTypeId = formValues.requestType;
    request.requestName = formValues.requestName;

    const publishDate = new Date(formValues.publishDate);
    const publishTime = formValues.publishTime;
    request.publishDate = this.combineDateAndTime(publishDate, publishTime);

    const openDate = new Date(formValues.openDate);
    const openTime = formValues.openTime;
    request.openDate = this.combineDateAndTime(openDate, openTime);

    request.contractStart = new Date(formValues.contractStartDate);
    request.contractEnd = new Date(formValues.contractEndDate);
    request.decisionMakerSelections = formValues.dropdowns.map((control: any, index: number) => ({
      decisionMakerNumber: index + 1,
      decisionMakerId: control.decisionMaker
    }));

    return request;
  }

  private combineDateAndTime(date: Date, timeString: string) {
    // Split the time string into hours and minutes
    const [hours, minutes] = timeString.split(':').map(Number);

    // Create a new Date object with the same date
    const combinedDate = new Date(date);

    // Set the hours and minutes on the new Date object
    combinedDate.setHours(hours, minutes, 0, 0); // Set seconds and milliseconds to 0
    return combinedDate;
  }

  private convertUtcToLocalTimeOnly(utcDateTime: string): string {
    if (!utcDateTime) return '';

    // Parse the UTC date-time string
    const utcDate = new Date(utcDateTime + 'Z'); // Ensure it's treated as UTC by appending 'Z'
    if (isNaN(utcDate.getTime())) return ''; // Handle invalid date

    // Convert the UTC time to local time in 24-hour format
    const localTime = utcDate.toLocaleTimeString(undefined, {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });

    return localTime;
  }

  onSelectDate(controlName: string, event: MatDatepickerInputEvent<Date>) {
    if (event.value) {
      const selectedDate = event.value as Date;
      this.basicsFormGroup.get(controlName)?.setValue(
        new Date(
          selectedDate.getFullYear(),
          selectedDate.getMonth(),
          selectedDate.getDate()
        )
      );
    }
  }

  combineDateTimeInUtc(inputDate: string, inputTime: string): string {
    const dateTimeString = `${inputDate}T${inputTime}Z`;
    return dateTimeString;
  }
}