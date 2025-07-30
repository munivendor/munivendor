import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormArray, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatButtonModule } from '@angular/material/button';
import { UserService } from '../../shared/service/user.service';
import { User } from '../../shared/model/user.model';
import { Designation as Designation } from '../../shared/model/designation.model';
import { Subject, filter, takeUntil } from 'rxjs';
import { AuthService } from '../../authorization/auth.service';
import { FlowProgressService } from '../../shared/service/flow-progress.service';

@Component({
  selector: 'app-designation-selection',
  templateUrl: './organization.user-designation-selection.component.html',
  styleUrls: ['./organization.user-designation-selection.component.css'],
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatCheckboxModule,
    MatButtonModule
  ]
})
export class DesignationSelectionComponent implements OnInit, OnDestroy {
  designeeSelectionForm: FormGroup;
  designations!: Designation[];
  noneSelected = false;
  private destroy$ = new Subject<void>();
  framePageNumber = 4;

  constructor(
    private fb: FormBuilder,
    private userService: UserService,
    private router: Router,
    private authService: AuthService,
    private flowProgressService: FlowProgressService) {
    this.designeeSelectionForm = this.fb.group(
      {
        selectedDesignees: this.fb.array([], this.minSelectedCheckboxes(1))
      });
  }

  ngOnInit(): void {
    this.userService.getDesigneeTypes()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (designations: Designation[]) => {
          this.designations = designations;
          this.updateSelectedDesigneesFormArray();
        },
        error: (error) => {
          console.error('Error fetching designations:', error);
        }
      });
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
      const selectedDesignationIds = (this.designeeSelectionForm.get('selectedDesignees') as FormArray).controls
        .map((control, i) => (control.value ? this.designations[i].designationId : null))
        .filter(value => value !== null) as number[];
      this.authService.user$.pipe(
        filter(user => !!user),
        takeUntil(this.destroy$)
      ).subscribe({
        next: currentUser => {
          const user: User = {
           userId: currentUser ?? undefined,  
            DesignationIds: selectedDesignationIds
          };
          this.userService.updateUser(user)
            .pipe(takeUntil(this.destroy$))
            .subscribe({
              next: response => {
                console.log('Designation saved successfully:', response);
                this.flowProgressService.saveFlowProgress(Number(currentUser), 1, this.framePageNumber).subscribe({
                  next: () => {
                    this.router.navigate(['/payment-plan-confirmation']);
                  },
                  error: (err) => {
                    console.error('Error saving flow progress:', err);
                  }  
                }); 

              },
              error: error => {
                console.error('Error updating user:', error);
              }
            });
        },
        error: error => {
          console.error('Error getting current user:', error);
        }
      });
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}