import { Component, OnInit, Input, Output, EventEmitter } from '@angular/core';
import { RouterModule } from '@angular/router';
import { FormGroup, FormBuilder, FormArray, ReactiveFormsModule, Validators, FormControl, FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';

import { ActivatedRoute, Router } from '@angular/router';
import { RequestService } from './services/request.service';

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
  @Input() parentFormGroup!: FormGroup;
  @Output() requestData = new EventEmitter<Request>();
  @Output() deleteDropdown = new EventEmitter<{ decisionMakerId: number | null }>();


  decisionMakers!: DecisionMaker[];
  categories!: Category[];
  subcategories!: SubCategory[];
  requestTypes: RequestType[] | undefined;
  requestName = new FormControl<string | null>(null, [Validators.required]);

  basicsFormGroup!: FormGroup;
  municipalityId = 1;
  requestId!: number;

  constructor(
    private fb: FormBuilder,
    private requestService: RequestService) {
    this.requestService.GetCategories().subscribe((categories: Category[]) => this.categories = categories);
    this.requestService.GetDecisionMakers().subscribe((decisionmakers: DecisionMaker[]) => this.decisionMakers = decisionmakers);
    this.requestService.GetRequestTypes().subscribe((requestTypes: RequestType[]) => this.requestTypes = requestTypes);
  }

  /*ngOnInit(): void {
    this.requestService.GetCategories().subscribe((categories: Category[]) => (this.categories = categories));
    this.requestService.GetDecisionMakers().subscribe((decisionmakers: DecisionMaker[]) => (this.decisionMakers = decisionmakers));
    this.requestService.GetRequestTypes().subscribe((requestTypes: RequestType[]) => (this.requestTypes = requestTypes));
  }*/

  ngOnInit() {
    this.initializeForm();

    if (this.requestId !== 0) {
      this.getRequestById(this.requestId);
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

    //this.proposalsOverview = this._formBuilder.group({});
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
          category: category?.categoryId,
          subcategory: subCategory?.subCategoryId || '',
          requestType: requestType?.requestTypeId,
          requestName: request.requestName,
          publishDate: request.publishDate,
          publishTime: this.convertTo24HourFormat(request.publishDate),
          openDate: request.openDate,
          openTime: this.convertTo24HourFormat(request.openDate),
          contractStartDate: request.contractStart,
          contractEndDate: request.contractEnd,
          dropdowns: this.createDecisionMakerDropdownControls(decisionMakersMapped),
        };
  
        this.initializeForm(formData);
  
       // this.basicRequestComponent.onCategoryChange({ value: formData.category } as MatSelectChange);
      },
      (error: any) => {
        console.error('Error fetching data', error);
      }
    );
  }

  get dropdowns(): FormArray {
    return this.parentFormGroup.get('dropdowns') as FormArray;
  }

  addDropdown(): void {
    const dropdownsArray = this.parentFormGroup.get('dropdowns') as FormArray;
    if (dropdownsArray) {
      dropdownsArray.push(this.createDropdownControl());
    }
  }

  private createDropdownControls(decisionMakers: any[]): any[] {
    return decisionMakers.map((decisionMaker) =>
      this.fb.group({
        decisionMaker: [decisionMaker?.decisionMakerId || '', Validators.required],
      })
    );
  }
  
  createDropdownControl(): FormGroup {
    return this.fb.group({
      decisionMaker: ['', Validators.required]
    });
  }

  removeDropdown(index: number): void {
    const decisionMakerId = this.dropdowns.at(index).get('decisionMaker')?.value;
    this.dropdowns.removeAt(index);
    this.deleteDropdown.emit({ decisionMakerId });
  }

  onCategoryChange(event: MatSelectChange): void {
    const categoryId = event.value;
    this.requestService.GetSubcategories(categoryId).subscribe((subcategories: SubCategory[]) => {
      this.subcategories = subcategories;
      const currentSubcategoryId = this.parentFormGroup.get('subcategory')?.value;
      if (this.subcategories.some(sc => sc.subCategoryId === currentSubcategoryId)) {
        this.parentFormGroup.get('subcategory')?.setValue(currentSubcategoryId);
      } else {
        this.parentFormGroup.get('subcategory')?.setValue('');
      }
    });
  }

  convertTo24HourFormat(dateTimeString: string): string {
    if (!dateTimeString || dateTimeString.startsWith("0001-01-01")) return ''; // Handle invalid placeholder
    
    const date = new Date(dateTimeString);
    if (isNaN(date.getTime())) return ''; // Handle invalid time
    
    return date.toISOString().split('T')[1].substring(0, 5); // Extract HH:mm
  }
  
  // dropdowns is for decision makers
  private createDecisionMakerDropdownControls(decisionMakers: any[]): any[] {
    return decisionMakers.map((decisionMaker) =>
      this.fb.group({
        decisionMaker: [decisionMaker?.decisionMakerId || '', Validators.required],
      })
    );
  }

  saveRequest() {
    let request = this.createRequest ();

    if (this.requestData) {
      this.requestService.CreateRequest(request).subscribe(
        (responseRequestId: number) => {
          console.log('Request created successfully:', responseRequestId);
          this.requestId = responseRequestId;
        },
        error => {
          console.error('Error creating request:', error);
        }
      );
    }
  }

  createRequest(): Request {
    const formValues = this.parentFormGroup.value;
    let request = new Request();

    request.categoryId = formValues.category;
    request.subcategoryId = formValues.subcategory;
    request.requestTypeId = formValues.requestType;
    request.requestName = formValues.requestName;

    // Handle publishDate and publishTime
    if (formValues.publishDate && formValues.publishTime) {
      request.publishDate = new Date(`${formValues.publishDate}T${formValues.publishTime}:00`);
    }

    // Handle openDate and openTime
    if (formValues.openDate && formValues.openTime) {
      request.openDate = new Date(`${formValues.openDate}T${formValues.openTime}:00`);
    }

    request.contractStart = new Date(formValues.contractStartDate);
    request.contractEnd = new Date(formValues.contractEndDate);
    request.decisionMakerSelections = formValues.dropdowns.map((control: any, index: number) => ({
      decisionMakerNumber: index + 1,
      decisionMakerId: control.decisionMaker
    }));

    return request;
  }
  /*emitRequestData(): void {
    if (this.parentFormGroup.valid) {
      const request = new Request();
      request.categoryId = this.parentFormGroup.controls['category'].value;
      request.subcategoryId = this.parentFormGroup.controls['subcategory'].value;
      request.requestTypeId = this.parentFormGroup.controls['requestType'].value;
      request.requestName = this.parentFormGroup.controls['requestName'].value;
  
      const publishDate = this.parentFormGroup.controls['publishDate'].value;
      const publishTime = this.parentFormGroup.controls['publishTime'].value;
      request.publishDate = new Date(this.combineDateTimeInUtc(this.extractDate(publishDate), publishTime));
  
      const openDate = this.parentFormGroup.controls['openDate'].value;
      const openTime = this.parentFormGroup.controls['openTime'].value;
      request.openDate = new Date(this.combineDateTimeInUtc(this.extractDate(openDate), openTime));

      request.contractStart = new Date(this.parentFormGroup.controls['contractStartDate'].value);
      request.contractEnd = new Date(this.parentFormGroup.controls['contractEndDate'].value);
  
      request.decisionMakerSelections = this.dropdowns.controls.map((control, index) => ({
        decisionMakerId: control.value.decisionMaker,
      }));

      this.requestData.emit(request);
    }
  }*/

    getRequestDetails(requestId: number): void {
      this.requestService.GetRequestDetailsById(requestId).subscribe((data) => {
        this.basicsFormGroup.patchValue({
          category: data.categoryId,
          subcategory: data.subcategoryId,
          requestType: data.requestTypeId,
          requestName: data.requestName,
          publishDate: this.extractDate(data.publishDate),
          openDate: this.extractDate(data.openDate),
          contractStartDate: data.contractStart,
          contractEndDate: data.contractEnd,
        });
        this.dropdowns.clear();
        data.decisionMakerSelections.forEach((decisionMaker: { decisionMakerId: any; }) => {
          this.createDropdownControls(decisionMaker.decisionMakerId);
        });
      });
    }


   

  formatToISO(controlName: string, event: MatDatepickerInputEvent<Date>) {
    if (event.value) {
      const selectedDate = event.value;
      const formattedDate = selectedDate.toISOString().split('T')[0];
      this.parentFormGroup.get(controlName)?.setValue(formattedDate);
    }
  }

  combineDateTimeInUtc(inputDate: string, inputTime: string): string {
    const dateTimeString = `${inputDate}T${inputTime}Z`;
    return dateTimeString;
  }

  extractDate(dateTime: string): string {
    if (dateTime.includes('T')) {
      return new Date(dateTime).toISOString().split('T')[0];
    }
    return dateTime;
  }

  getFilteredDecisionMakers(index: number) {
    const selectedDecisionMakerIds = this.dropdowns.controls
        .map((control, i) => (i !== index ? control.get('decisionMaker')?.value : null))
        .filter((value) => value !== null);
    if (!this.decisionMakers || this.decisionMakers.length === 0) {
        return [];
    }
    return this.decisionMakers.filter(
        (decisionMaker) => !selectedDecisionMakerIds.includes(decisionMaker.decisionMakerId)
    );
}
}