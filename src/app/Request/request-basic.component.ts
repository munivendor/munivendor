import { Component, OnInit, Input, Output, EventEmitter } from '@angular/core';
import { RouterModule } from '@angular/router';
import { FormGroup, FormBuilder, FormArray, ReactiveFormsModule, Validators, FormControlName, FormControl, AbstractControl, ValidatorFn, FormsModule } from '@angular/forms';
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
    NgxMatTimepickerModule]
})

export class BasicRequestComponent implements OnInit {
  @Input() parentFormGroup!: FormGroup;
  @Output() requestData = new EventEmitter<Request>();

  decisionMakers!: DecisionMaker[];
  decisionMakers2!: DecisionMaker[];
  decisionMakers3!: DecisionMaker[];
  decisionMakers4!: DecisionMaker[];
  categories!: Category[];
  subcategories: SubCategory[] | undefined;
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

    // Initialize form controls on the parent form group
    this.parentFormGroup.addControl('category', this.fb.control('', Validators.required));
    this.parentFormGroup.addControl('subcategory', this.fb.control('', Validators.required));
    this.parentFormGroup.addControl('requestType', this.fb.control('', Validators.required));
    this.parentFormGroup.addControl('requestName', this.fb.control('', Validators.required));
    this.parentFormGroup.addControl('publishDate', this.fb.control('', Validators.required));
    this.parentFormGroup.addControl('publishTime', this.fb.control('', Validators.required));
    this.parentFormGroup.addControl('openDate', this.fb.control('', Validators.required));
    this.parentFormGroup.addControl('openTime', this.fb.control('', Validators.required));
    this.parentFormGroup.addControl('contractStartDate', this.fb.control('', Validators.required));
    this.parentFormGroup.addControl('contractEndDate', this.fb.control('', Validators.required));
    this.parentFormGroup.addControl('dropdowns', this.fb.array([]));
  }

  get dropdowns(): FormArray {
    return this.parentFormGroup.get('dropdowns') as FormArray;
  }

  addDropdown() {
    const dropdown = this.fb.control('', Validators.required);
    this.dropdowns.push(dropdown);
  }

  onCategoryChange(event: MatSelectChange): void {
    const categoryId = event.value;
    this.requestService.GetSubcategories(categoryId).subscribe(
      (subcategories: SubCategory[]) => {
        this.subcategories = subcategories;
      }
    );
  }

  emitRequestData(): void {
    if (this.parentFormGroup.valid) {
      let request = new Request();

      request.categoryId = this.parentFormGroup.controls['category'].value;
      request.subcategoryId = this.parentFormGroup.controls['subcategory'].value;
      request.requestTypeId = this.parentFormGroup.controls['requestType'].value;
      request.requestName = this.parentFormGroup.controls['requestName'].value;
      request.publishDate = new Date(this.parentFormGroup.controls['publishDate'].value + ' ' + this.parentFormGroup.controls['publishTime'].value);
      request.openDate = new Date(this.parentFormGroup.controls['openDate'].value + ' ' + this.parentFormGroup.controls['openTime'].value);
      request.contractStart = new Date(this.parentFormGroup.controls['contractStartDate'].value);
      request.contractEnd = new Date(this.parentFormGroup.controls['contractEndDate'].value);
      request.decisionMakerSelections = this.dropdowns.controls.map((control, index) => ({
        decisionMakerNumber: index + 1,
        decisionMakerId: control.value
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
}