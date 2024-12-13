import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ReactiveFormsModule } from '@angular/forms';

import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { UserService } from '../Signup/Services/user.service';
import { User } from '../Signup/model/user.model';
import { Department } from './model/department.model';
import { DepartmentService } from './service/department.service';

@Component({
  selector: 'app-contact-form',
  templateUrl: './user-signup-details.component.html',
  standalone: true,
  imports: [ReactiveFormsModule, MatInputModule, MatFormFieldModule, MatSelectModule, MatButtonModule]
})
export class UserSignupDetailsComponent
 implements OnInit {
  userSignupDetailForm: FormGroup;
  /*departments: string[] = [
    'City Clerk',
    'Legal',
    'Purchasing',
    'Construction Code',
    'Court',
    'Engineering',
    'Mayor’s Complex',
    'Parks and Recreation',
    'Personnel',
    'Public Works',
    'Social Services',
    'Tax Assessor',
    'Tax Collector',
    'Treasury'
  ];*/

    user: User | undefined;
    departments: Department[] | undefined;

    constructor(private fb: FormBuilder, private departmentService: DepartmentService, private userService: UserService) {
        this.getUser (1);
        this. userSignupDetailForm = this.fb.group({
            email: [this.user?.workEmail, [Validators.required, Validators.email]],
            firstName: [this.user?.firstName, Validators.required],
            lastName: [this.user?.lastName, Validators.required],
            title: ['', Validators.required],
            department: ['', Validators.required],
            workPhoneNumber: ['', [Validators.required, Validators.pattern('^[0-9]+$')]],
            personalMobileNumber: ['', [Validators.required, Validators.pattern('^[0-9]+$')]],
            mobileNumber: ['', [Validators.required, Validators.pattern('^[0-9]+$')]]
        });
    }

    ngOnInit(): void { }

    getUser(userId: number): void {
        this.userService.getUser(userId).subscribe((user: User) => {
            this.user = user;
        },
            (error) => {
                console.error('Error fetching user data:', error);
            }
        );
    }

    getDepartments(): void {
        this.departmentService.getDepartments().subscribe((departments: Department[]) => {
            this.departments = departments;
        },
            (error) => {
                console.error('Error fetching department data:', error);
            }
        );
    }

    onSubmit(): void {
        if (this. userSignupDetailForm.valid) {
            //this.user!.departmentId = this.contactForm.get('department')?.value;

            console.log('Selected Department ID:', this.user!.departmentId);
            const user: User = this. userSignupDetailForm.value;
            // Add further code to save or process the user object as needed 
        }
    }
}
