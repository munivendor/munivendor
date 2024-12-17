import { Component, OnInit } from '@angular/core';
import { FormArray, FormBuilder, FormGroup } from '@angular/forms';

import { ReactiveFormsModule } from '@angular/forms'; 
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input'; 

import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatButtonModule } from '@angular/material/button';

import { UserService } from '../Signup/Services/user.service';
import { User } from '../Signup/model/user.model';
import { Designee as DesigneeType } from './model/designee.model';


@Component({
  selector: 'app-designation-selection',
  templateUrl: './municipality.user-designation-selection.component.html',
  styleUrls: ['./municipality.user-designation-selection.component.css'],
  standalone: true,
  imports: [ReactiveFormsModule,MatCardModule,MatFormFieldModule, MatInputModule,  MatCheckboxModule, MatButtonModule ]
})
export class DesignationSelectionComponent implements OnInit {
  designeeSelectionForm: FormGroup;
  designeeTypes!: DesigneeType [];
  noneSelected = false;

  constructor(private fb: FormBuilder, private userService: UserService) {
    this.designeeSelectionForm = this.fb.group({
      selectedDesignation: ['']
    });
  }

  ngOnInit(): void {
    this.userService.getDesigneeTypes().subscribe(
      (designeeTypes: DesigneeType[]) => { 
        this.designeeTypes = designeeTypes; 
        this.updateSelectedDesigneesFormArray(); 
      },
      (error) => { 
        console.error('Error fetching designations:', error); 
      });
  }

  updateSelectedDesigneesFormArray(): void { 
    const selectedDesignationsArray = this.designeeSelectionForm.get('selectedDesignees') as FormArray;
    selectedDesignationsArray.clear(); 
    this.designeeTypes!.forEach(() => selectedDesignationsArray.push(this.fb.control(false)));

    }

  /*onDesignationChange(event: any): void {
    this.noneSelected = event.value === 'None';
  }*/

  onSubmit(): void {
    if (this.designeeSelectionForm.valid) { 
      let user: User = {userId:1};
      user.DesigneeTypes =this.designeeSelectionForm.value.selectedDesignation;
      //console.log('Selected Designation:', selectedDesignation);

      this.userService.updateUser(user).subscribe(response => {
        console.log('Designation saved successfully:', response);
      });
    }
  }
}
