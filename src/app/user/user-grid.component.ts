import { Component, OnInit } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { MatTableModule } from '@angular/material/table';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatChipsModule } from '@angular/material/chips';
import { MatDialogModule } from '@angular/material/dialog';
import { CommonModule } from '@angular/common';
import { UserService } from '../shared/service/user.service'; 
import { User } from '../shared/model/user.model'; 
import { AddUserDialogComponent } from './add-user-dialog.component';
import { HttpClientModule } from '@angular/common/http'; 

@Component({
  selector: 'app-user-grid',
  standalone: true,
  imports: [
    CommonModule,
    MatTableModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatDialogModule,
    MatChipsModule,
    ReactiveFormsModule,
    HttpClientModule, //  ML-why is needed?
  ],
  templateUrl: './user-grid.component.html',
  styleUrls: ['./user-grid.component.css'],
})
export class UserGridComponent implements OnInit {
  searchControl = new FormControl('');
  displayedColumns: string[] = [
    'nameEmail',
    'title',
    'role',
    'designee',
    'status',
    'tags',
    'actions',
  ];

  users: User[] = [];
  filteredUsers: User[] = [];

  constructor(private userService: UserService, public dialog: MatDialog) {}

  ngOnInit(): void {
    
    this.userService.getOrganizationUsers().subscribe(
      (data) => {
        this.filteredUsers = data;
      },
      (error) => {
        console.error('Error retrieving users:', error);
      }
    );

    // Filter users dynamically based on search input
    this.searchControl.valueChanges.subscribe((searchValue) => {
      this.applyFilter(searchValue || '');
    });
  }

  // Apply search filter
  applyFilter(filterValue: string) {
    const lowerCaseFilter = filterValue.toLowerCase();
    this.filteredUsers = this.users.filter(
      (user) =>
        user.name.toLowerCase().includes(lowerCaseFilter) ||
        user.email.toLowerCase().includes(lowerCaseFilter)
    );
  }

  // Open Add User dialog
  addUser() {
    const dialogRef = this.dialog.open(AddUserDialogComponent);

    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        this.users.push(result); // Add new user locally
        this.filteredUsers = [...this.users];
      }
    });
  }
}
