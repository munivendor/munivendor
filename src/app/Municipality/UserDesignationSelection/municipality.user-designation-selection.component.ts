import { Component, OnInit } from '@angular/core';
import { FormArray, FormBuilder, FormGroup, Validators } from '@angular/forms';

import { CommonModule } from '@angular/common';

import { ReactiveFormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';

import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatButtonModule } from '@angular/material/button';

import { UserService } from '../../shared/service/user.service';
import { User } from '../Signup/model/user.model';
import { Designation as Designation } from '../../shared/model/designation.model';


@Component({
  selector: 'app-designation-selection',
  templateUrl: './municipality.user-designation-selection.component.html',
  styleUrls: ['./municipality.user-designation-selection.component.css'],
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MatCardModule, MatFormFieldModule, MatInputModule, MatCheckboxModule, MatButtonModule]
})
export class DesignationSelectionComponent implements OnInit {
  designeeSelectionForm: FormGroup;
  designations!: Designation[];
  noneSelected = false;

  constructor(private fb: FormBuilder, private userService: UserService) {
    this.designeeSelectionForm = this.fb.group(
      { 
        selectedDesignees: this.fb.array([], this.minSelectedCheckboxes(1)) 

      });
   
 
    this.userService.getDesignationTypes().subscribe(
      (designations: Designation[]) => {
        this.designations = designations;
        this.updateSelectedDesigneesFormArray();
      },
      (error) => {
        console.error('Error fetching designations:', error);
      });
  }

  ngOnInit(): void {

  }

  updateSelectedDesigneesFormArray(): void {
    const selectedDesignationsArray = this.designeeSelectionForm.get('selectedDesignees') as FormArray;
    selectedDesignationsArray.clear();
    this.designations!.forEach(() => selectedDesignationsArray.push(this.fb.control(false)));

  }

  get selectedDesignees(): FormArray {
    return this.designeeSelectionForm.get('selectedDesignees') as FormArray;
  }
  onCheckboxChange(index: number): void {
    const noneOfTheAboveIndex = this.designations.length - 1;
    if (index === noneOfTheAboveIndex) {
      if (this.selectedDesignees.at(index).value) {
        this.selectedDesignees.controls.forEach((control, i) => {
          if (i !== noneOfTheAboveIndex) { control.setValue(false); control.disable(); }
        });
      } else {
        this.selectedDesignees.controls.forEach((control, i) => {
          if (i !== noneOfTheAboveIndex) { control.enable(); }
        });
      }
    } else {
      if (this.selectedDesignees.at(index).value) {
        this.selectedDesignees.at(noneOfTheAboveIndex).setValue(false);
        this.selectedDesignees.at(noneOfTheAboveIndex).enable();
      }
    }
  }

  minSelectedCheckboxes(min: number) {
    const validator: Validators = (formArray: FormArray) => {
      const totalSelected = formArray.controls.map(control => control.value).reduce((prev, next) => next ? prev + 1 : prev, 0);
      return totalSelected >= min ? null : { required: true };
    };
    return validator;
  }

  onSubmit(): void {
    if (this.designeeSelectionForm.valid) {
      let user: User = { userId: 1 };

      const selectedDesignationIds = (this.designeeSelectionForm.get('selectedDesignees') as FormArray).controls 
      .map((control, i) => (control.value ? this.designations[i].designationId : null)) 
      .filter(value => value !== null) as number[];

      user.DesignationIds = selectedDesignationIds;
      //console.log('Selected Designation:', selectedDesignation);

      this.userService.updateUser(user).subscribe(response => {
        console.log('Designation saved successfully:', response);
      });
    }
  }
}
