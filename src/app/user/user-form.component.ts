import { Component, OnInit, Optional } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { HttpClient } from '@angular/common/http';

import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule } from '@angular/material/dialog';
import { TooltipDialogComponent } from './tooltip-dialog.component';

import { UserService } from '../shared/service/user.service'
 

@Component({
  selector: 'app-user-form',
  templateUrl: './user-form.component.html',
  styleUrls: ['./user-form.component.css'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatTooltipModule,
    MatIconModule,
    MatButtonModule,
    MatDialogModule
  ]
})
export class UserFormComponent implements OnInit {
  userForm!: FormGroup;
  roles: string[] = []; 
  designations: string[] = [];

  constructor(private userService: UserService,
    private fb: FormBuilder,
    private http: HttpClient,
    public dialog: MatDialog,
    @Optional() private dialogRef?: MatDialogRef<UserFormComponent>
  ) {}

  ngOnInit(): void {
    this.initializeForm();
    this.loadUserData();
    this.loadRolesAndDesignations();
  }

  private initializeForm(): void {
    this.userForm = this.fb.group({
      name: ['', [Validators.required, Validators.maxLength(50)]],
      email: ['', [Validators.required, Validators.email]],
      title: ['', [Validators.required, Validators.maxLength(100)]],
      role: ['', Validators.required],
      designation: ['', Validators.required]
    });
  }

  private loadUserData(): void {
    const userId = 1; // You can replace this with dynamic user ID
    this.userService.getUser(userId).subscribe((userData: any) => {
      this.userForm.patchValue({
        name: userData.name,
        email: userData.email,
        title: userData.title,
        role: userData.role,
        designation: userData.designation
      });
    });
  }
  private loadRolesAndDesignations(): void { 
    this.userService.getRoles().subscribe((roles: string[]) => { this.roles = roles; }); 
    this.userService.getDesignations().subscribe((designations: string[]) => { this.designations = designations; });
   }
  

  openDialog(): void {
    this.dialog.open(TooltipDialogComponent);
  }

  onSave(): void {
    if (this.userForm.valid) {
      const formData = this.userForm.value;
      console.log('Form Data:', formData);

      if (this.dialogRef) {
        this.dialogRef.close(formData);
      } else {
        // Handle form submission for regular page
        // e.g., this.userService.saveUser(formData).subscribe();
      }
    } else {
      this.userForm.markAllAsTouched();
    }
  }
}
