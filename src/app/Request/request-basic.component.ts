import { Component, OnInit, Input, Output, EventEmitter } from '@angular/core';
import { RouterModule } from '@angular/router';
import { FormGroup, FormBuilder, FormArray, ReactiveFormsModule, Validators, FormControl, FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
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
  decisionMakers2!: DecisionMaker[];
  decisionMakers3!: DecisionMaker[];
  decisionMakers4!: DecisionMaker[];
  categories!: Category[];
  subcategories!: SubCategory[];
  requestTypes: RequestType[] | undefined;
  requestName = new FormControl<string | null>(null, [Validators.required]);

  constructor(
    private fb: FormBuilder,
    private requestService: RequestService) {
    this.requestService.GetCategories().subscribe((categories: Category[]) => this.categories = categories);
    this.requestService.GetDecisionMakers().subscribe((decisionmakers: DecisionMaker[]) => this.decisionMakers = decisionmakers);;
    this.requestService.GetDecisionMakers().subscribe((decisionmakers: DecisionMaker[]) => this.decisionMakers2 = decisionmakers);;
    this.requestService.GetDecisionMakers().subscribe((decisionmakers: DecisionMaker[]) => this.decisionMakers3 = decisionmakers);;
    this.requestService.GetDecisionMakers().subscribe((decisionmakers: DecisionMaker[]) => this.decisionMakers4 = decisionmakers);
    this.requestService.GetRequestTypes().subscribe((requestTypes: RequestType[]) => this.requestTypes = requestTypes);
  }

  ngOnInit(): void {
    // Load data for dropdowns
    this.requestService.GetCategories().subscribe((categories: Category[]) => (this.categories = categories));
    this.requestService.GetDecisionMakers().subscribe((decisionmakers: DecisionMaker[]) => (this.decisionMakers = decisionmakers));
    this.requestService.GetRequestTypes().subscribe((requestTypes: RequestType[]) => (this.requestTypes = requestTypes));
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

    // Always fetch subcategories, even during initialization
    this.requestService.GetSubcategories(categoryId).subscribe((subcategories: SubCategory[]) => {
      this.subcategories = subcategories;

      // Automatically set the current subcategory if it matches
      const currentSubcategoryId = this.parentFormGroup.get('subcategory')?.value;
      if (this.subcategories.some(sc => sc.subCategoryId === currentSubcategoryId)) {
        this.parentFormGroup.get('subcategory')?.setValue(currentSubcategoryId);
      } else {
        // Clear subcategory if it doesn't match
        this.parentFormGroup.get('subcategory')?.setValue('');
      }
    });
  }

  emitRequestData(): void {
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
  }
  

  formatToISO(controlName: string, event: MatDatepickerInputEvent<Date>) {
    if (event.value) {
      const selectedDate = event.value;
      const formattedDate = selectedDate.toISOString().split('T')[0];
      this.parentFormGroup.get(controlName)?.setValue(formattedDate);
    }
  }

  combineDateTimeInUtc(inputDate: string, inputTime: string): string {
    const dateTimeString = `${inputDate}T${inputTime}Z`; // Combine date and time with 'T' and 'Z'
    return dateTimeString; // Return ISO string in UTC
  }

  extractDate(dateTime: string): string {
    if (dateTime.includes('T')) {
      return new Date(dateTime).toISOString().split('T')[0];
    }
    return dateTime;
  }
}