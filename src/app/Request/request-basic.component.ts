import { Component, OnInit } from '@angular/core';
import { Router, RouterLink, RouterModule } from '@angular/router';
import { FormGroup, FormBuilder, FormArray, ReactiveFormsModule, Validators, FormControlName, FormControl, AbstractControl, ValidatorFn, FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { StateService } from './services/state.service';
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
  imports: [ReactiveFormsModule, RouterModule, RouterLink, CommonModule, MatSelectModule,
    FormsModule, MatFormFieldModule, MatInputModule, MatButtonModule, MatDatepickerModule, MatNativeDateModule, NgxMatTimepickerModule]
})

export class BasicRequestComponent implements OnInit {
  [x: string]: any;
  basicRequestForm!: FormGroup;
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
    private requestService: RequestService,
    private stateService: StateService,
    private router: Router) {
    this.requestService.getCategories().subscribe((categories: Category[]) => this.categories = categories);
    this.requestService.GetDecisionMakers().subscribe((decisionmakers: DecisionMaker[]) => this.decisionMakers = decisionmakers);;
    this.requestService.GetDecisionMakers().subscribe((decisionmakers: DecisionMaker[]) => this.decisionMakers2 = decisionmakers);;
    this.requestService.GetDecisionMakers().subscribe((decisionmakers: DecisionMaker[]) => this.decisionMakers3 = decisionmakers);;
    this.requestService.GetDecisionMakers().subscribe((decisionmakers: DecisionMaker[]) => this.decisionMakers4 = decisionmakers);
    this.requestService.GetRequestTypes().subscribe((requestTypes: RequestType[]) => this.requestTypes = requestTypes);
  }

  ngOnInit(): void {

    this.basicRequestForm = this.fb.group({
      dropdowns: this.fb.array([]), // FormArray for dynamic dropdowns
      category: ['', [Validators.required]],
      subcategory: ['', [Validators.required]],
      requestType: ['', [Validators.required]],
      requestName: ['', [Validators.required]],
      publishDate: ['', [Validators.required]],
      publishTime: ['', [Validators.required]],
      openDate: ['', [Validators.required]],
      openTime: ['', [Validators.required]],
      contractStartDate: ['', [Validators.required]],
      contractEndDate: ['', [Validators.required]]
    })
  }

  onCategoryChange(event: MatSelectChange): void {
    // The selected value will be directly available in event.value with typeof number
    const categoryId = event.value;

    this.requestService.GetSubcategories(categoryId).subscribe(
      (subcategories: SubCategory[]) => {
        this.subcategories = subcategories;
      }
    );
  }

  addDropdown() {
    const dropdown = this.fb.control('', Validators.required);
    this.dropdowns.push(dropdown);
  }

  get dropdowns() {
    return this.basicRequestForm.get('dropdowns') as FormArray;
  }

  onSubmit() {

    if (this.basicRequestForm.valid) {
      console.log(this.basicRequestForm.value);

      let request = new Request();


      request.categoryId = this.basicRequestForm.controls["category"].value;
      request.subcategoryId = this.basicRequestForm.controls["subcategory"].value;
      request.requestTypeId = this.basicRequestForm.controls["requestType"].value;
      request.requestName = this.basicRequestForm.controls["requestName"].value;
      request.publishDate = new Date(this.basicRequestForm.controls["publishDate"].value + ' ' + this.basicRequestForm.controls["publishTime"].value);
      request.openDate = new Date(this.basicRequestForm.controls["openDate"].value + ' ' + this.basicRequestForm.controls["openTime"].value);
      request.contractStart = new Date(this.basicRequestForm.controls["contractStartDate"].value);
      request.contractEnd = new Date(this.basicRequestForm.controls["contractEndDate"].value);

      request.decisionMakerSelections = this.dropdowns.controls.map((control, index) => ({
        decisionMakerNumber: index + 1,
        decisionMakerId: control.value
      }));

      this.requestService.CreateRequest(request).subscribe(
        (responseRequestId: number) => {
          request.requestId = responseRequestId;
          this.stateService.setRequestId(responseRequestId);
          // this.router.navigate(['/request-outframe-component/request-overview-component']);

      },
        error => {
          console.error('Error creating request:', error);
        }
      );

    }
  }

  formatToISO(controlName: string, event: MatDatepickerInputEvent<Date>) {
    if (event.value) {
      const selectedDate = event.value;
      const formattedDate = selectedDate.toISOString().split('T')[0]; // Extract the date part
      this.basicRequestForm.get(controlName)?.setValue(formattedDate);
    }
  }
}